import { NextRequest, NextResponse } from "next/server";
import {
  buildKnowledgeAnswerBasis,
  buildRagBasisNotice,
  compactKnowledgeExcerpt,
  getEffectiveSourceMetadata,
  getRagDocumentMetadata,
  pickLangText,
  type KnowledgeDoc,
} from "@/lib/data/knowledge";
import type { Lang } from "@/lib/i18n/translations";
import { findFAQ, AI_DEFAULT_REPLY } from "@/lib/data/faq";
import { db } from "@/lib/db";
import { generateZaiChatText, isZaiConfigurationError, type ZaiChatMessage } from "@/lib/ai/zai";
import { hybridSearch, initVectorStore, initTransformerStore, getStoreStats } from "@/lib/embeddings/vector-store";
import { canPersistChatQuestion, protectChatQuestion } from "@/lib/privacy/chat-log";
import { ensureGroundedCitationAnswer } from "@/lib/knowledge/citations";
import {
  consumeDailyQuota,
  parseLimit,
  parsePositiveInt,
  rateLimit,
  requireAdmin,
  sanitizeAiBody,
  withTimeout,
} from "@/lib/api/security";

// POST /api/ai/chat - RAG 기반 채팅 (Transformer Vector Search + LLM)
export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(req, {
      key: "ai:chat",
      limit: parseLimit(process.env.AI_CHAT_RATE_LIMIT, 0),
      windowMs: 60 * 1000,
    });
    if (limited) return limited;

    const quotaExceeded = await consumeDailyQuota(
      req,
      "ai:chat",
      parseLimit(process.env.AI_CHAT_DAILY_QUOTA, 0)
    );
    if (quotaExceeded) return quotaExceeded;

    const body = await req.json();
    const parsed = sanitizeAiBody(body || {}, {
      maxQuestionLength: parsePositiveInt(process.env.AI_CHAT_MAX_CHARS, 1200),
      maxHistoryItems: 6,
      maxHistoryItemLength: 1200,
    });
    if (parsed.error) return parsed.error;

    const { question, history } = parsed.value;
    const lang = parsed.value.lang as Lang;

    // 1. Vector Store 초기화 (TF-IDF 동기 + Transformer 비동기)
    initVectorStore();
    try {
      await withTimeout(
        initTransformerStore(),
        parsePositiveInt(process.env.AI_EMBEDDING_INIT_TIMEOUT_MS, 15_000),
        "Transformer initialization"
      );
    } catch (initErr) {
      console.error("[Transformer init timeout/failure]", initErr);
    }

    // 2. 하이브리드 검색 (Transformer + Keyword)
    const searchResults = await hybridSearch(question, { topK: 3 });
    const docs: KnowledgeDoc[] = searchResults.map((r) => r.doc);
    const sourceNotice = buildRagBasisNotice(lang, docs);

    // 3. FAQ 룰베이스 확인 (빠른 응답)
    const faq = findFAQ(question, lang);

    let answer: string;
    let source: "rule" | "rag" | "hybrid" = "rule";
    let retrievedDocIds: string[] = docs.map((d) => d.id);
    const searchMeta = searchResults.map((r) => ({
      id: r.doc.id,
      title: pickLangText(r.doc.title, lang),
      score: Number(r.score.toFixed(3)),
      vectorScore: Number(r.vectorScore.toFixed(3)),
      keywordScore: r.keywordScore,
      matchedKeywords: r.matchedKeywords,
      method: r.method,
      category: r.doc.category,
      docSource: r.doc.source,
    }));
    const storeStats = getStoreStats();

    // 4. LLM 호출 (검색된 문서를 컨텍스트로 활용)
    if (docs.length > 0) {
      try {
        const llmAnswer = await withTimeout(
          generateWithLLM(question, lang, docs, history),
          parsePositiveInt(process.env.AI_LLM_TIMEOUT_MS, 25_000),
          "LLM generation"
        );
        if (llmAnswer) {
          answer = llmAnswer;
          source = searchResults.some((r) => r.matchedKeywords.length > 0)
            ? "hybrid"
            : "rag";
        } else {
          answer = faq ? faq[lang] : AI_DEFAULT_REPLY[lang];
        }
      } catch (llmErr) {
        console.error("[LLM Error]", llmErr);
        const top = docs[0];
        if (faq) {
          answer = buildCitedFallbackAnswer(faq[lang], top, lang);
        } else {
          answer = buildCitedFallbackAnswer(null, top, lang);
        }
      }
    } else if (faq) {
      answer = faq[lang];
    } else {
      answer = AI_DEFAULT_REPLY[lang];
    }

    answer = ensureGroundedCitationAnswer({ answer, docs, lang, sourceNotice, maxSources: 3 });

    // 5. 로그 저장 (비동기, 실패 무시)
    try {
      if (canPersistChatQuestion(question)) {
        const protectedQuestion = protectChatQuestion(question);
        await db.chatLog.create({
          data: {
            lang,
            ...protectedQuestion,
            answer,
            source,
            retrievedDocs: JSON.stringify({
              docIds: retrievedDocIds,
              searchMeta,
              storeMethod: storeStats.method,
              sourceNotice,
            }),
          },
        });
      }
    } catch (logErr) {
      console.error("[ChatLog save error]", logErr);
    }

    return NextResponse.json({
      answer,
      source,
      retrievedDocs: docs.map((d) => ({
        id: d.id,
        title: pickLangText(d.title, lang),
        category: d.category,
        source: d.source,
        sourceMeta: getEffectiveSourceMetadata(d, lang),
        ragMeta: getRagDocumentMetadata(d, lang),
        basis: buildKnowledgeAnswerBasis(d, lang),
        excerpt: compactKnowledgeExcerpt(d, lang),
      })),
      sourceNotice,
      searchMeta,
      storeStats,
    });
  } catch (e) {
    console.error("[POST /api/ai/chat]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// GET /api/ai/chat - Vector Store 상태 조회 (디버그용)
export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  initVectorStore();
  // transformer는 lazy load — 별도 요청시에만 초기화
  return NextResponse.json(getStoreStats());
}

function buildCitedFallbackAnswer(baseAnswer: string | null, doc: KnowledgeDoc, lang: Lang): string {
  const title = pickLangText(doc.title, lang);
  const meta = getRagDocumentMetadata(doc, lang);
  const excerpt = compactKnowledgeExcerpt(doc, lang, 700);
  const sourceHeading = lang === "ko" ? "📚 출처:" : "📚 Sources:";
  const basisHeading = lang === "ko" ? "공식 근거 요약" : "Official-source basis";
  const sourceUrl = meta.source_url ? ` <${meta.source_url}>` : "";
  const checked = meta.last_checked_at
    ? lang === "ko"
      ? ` (확인일 ${meta.last_checked_at})`
      : ` (checked ${meta.last_checked_at})`
    : "";
  const sections = baseAnswer?.trim() ? [`${baseAnswer.trim()} [1]`] : [];

  sections.push(`### ${basisHeading}\n\n${excerpt} [1]`);
  sections.push(`${sourceHeading}\n- [1] ${title} — ${doc.source}${sourceUrl}${checked}`);

  return sections.join("\n\n");
}

async function generateWithLLM(
  question: string,
  lang: Lang,
  docs: KnowledgeDoc[],
  history: { role: string; content: string }[]
): Promise<string | null> {
  try {
    const langName = { ko: "Korean", vi: "Vietnamese", mn: "Mongolian", en: "English" }[lang];

    const sourceNotice = buildRagBasisNotice(lang, docs);
    const context = docs
      .map((d, i) => {
        const ragMeta = getRagDocumentMetadata(d, lang);
        return [
          `[문서 ${i + 1}] ${pickLangText(d.title, lang)}`,
          `주석 번호: [${i + 1}]`,
          `출처: ${d.source} <${ragMeta.source_url}>`,
          `확인일: ${ragMeta.last_checked_at}`,
          `검수자: ${ragMeta.checked_by}`,
          `검수상태: ${ragMeta.review_status}`,
          pickLangText(d.content, lang),
        ].join("\n");
      })
      .join("\n\n---\n\n");

    const systemPrompt = `당신은 KAXI의 유학 준비 내비게이터입니다. 한국 유학 준비생에게 공식 정보 기반으로 답변합니다.

중요 규칙:
1. 반드시 제공된 컨텍스트 문서만 근거로 답변하세요. 임의 정보를 생성하지 마세요.
2. 사용자 언어(${langName})로 답변하세요.
3. 비자 보장, 허위서류, 불법취업은 단호히 거부하고 합법 대안을 안내하세요.
4. 비자·체류자격 개별 판단은 행정사 상담을 권유하세요.
5. 비용 관련 질문은 항목별로 분해해서 설명하세요.
6. 답변은 간결하고 실용적으로 (3~5문장 이내).
7. 사실·법령·요건·절차·비용·서류를 단정하는 문장 뒤에는 반드시 [1], [2]처럼 근거 주석을 붙이세요.
8. 주석 번호는 컨텍스트 문서의 [문서 N] 번호와 일치해야 합니다. 근거가 없으면 확정하지 말고 확인 필요라고 말하세요.
9. 출처를 답변 끝에 "📚 출처:" 로 표기하세요.
10. 답변 마지막에는 다음 출처 기준 문장을 그대로 포함하세요: "${sourceNotice}"

컨텍스트 문서 (Vector Search + Keyword Match로 검색됨):
${context}`;

    const messages: ZaiChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...history.slice(-4).map((h) => ({
        role: h.role === "user" ? ("user" as const) : ("assistant" as const),
        content: h.content,
      })),
      { role: "user", content: question },
    ];

    return await generateZaiChatText("chat", {
      messages,
      thinking: { type: "disabled" },
      temperature: 0.3,
      max_tokens: 600,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (isZaiConfigurationError(e)) {
      console.warn("[LLM generation skipped]", message);
    } else {
      console.error("[LLM generation error]", e);
    }
    return null;
  }
}
