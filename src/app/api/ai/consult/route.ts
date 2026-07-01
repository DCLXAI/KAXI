import { NextRequest, NextResponse } from "next/server";
import {
  buildRagBasisNotice,
  getRagDocumentMetadata,
  getSourceMetadata,
  pickLangText,
  type KnowledgeDoc,
} from "@/lib/data/knowledge";
import type { Lang } from "@/lib/i18n/translations";
import { db } from "@/lib/db";
import { createZaiClient, isZaiConfigurationError } from "@/lib/ai/zai";
import { getAgentBackend, runCodexServerless } from "@/lib/codex/serverless";
import { isRemoteCodexBridgeEnabled, runRemoteCodexBridge } from "@/lib/codex/remote-bridge";
import { hybridSearch, initVectorStore, initTransformerStore } from "@/lib/embeddings/vector-store";
import { canPersistChatQuestion, protectChatQuestion } from "@/lib/privacy/chat-log";
import {
  consumeDailyQuota,
  getClientIp,
  parseLimit,
  parsePositiveInt,
  rateLimit,
  sanitizeAiBody,
  withTimeout,
} from "@/lib/api/security";

// POST /api/ai/consult - 행정사 전문 AI 에이전트 상담 채팅
// 일반 AI 도우미보다 더 깊이 있는 법적/행정적 답변 제공
// 단, 법적 경계 명확화: 개별 사례 판단은 행정사 상담 권유

export const runtime = "nodejs";
export const maxDuration = 60;

type ConsultBackend = "remote-bridge" | "codex" | "zai";

interface ExpertAnswerResult {
  answer: string;
  disclaimer: string;
  suggestedFollowups: string[];
  needsHumanExpert: boolean;
  backend: string;
  codexMode?: string;
  durationMs?: number;
}

function getConsultBackend(): ConsultBackend {
  const configured = process.env.AI_CONSULT_BACKEND?.trim().toLowerCase();
  if (configured === "remote-bridge" || configured === "codex" || configured === "zai") {
    return configured;
  }

  const agentBackend = getAgentBackend();
  if (agentBackend === "remote-bridge" || isRemoteCodexBridgeEnabled()) {
    return "remote-bridge";
  }

  const hostedRuntime = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
  const codexConfigured =
    Boolean(process.env.CODEX_API_KEY || process.env.OPENAI_API_KEY) ||
    process.env.CODEX_SERVERLESS_ENABLED === "true" ||
    !hostedRuntime;

  if (agentBackend === "codex" && codexConfigured) {
    return "codex";
  }

  return "zai";
}

function consultDisclaimer(lang: Lang): string {
  return {
    ko: "⚠️ 본 답변은 공식 정보 기반 일반 안내입니다. 개별 사례의 비자 발급 가능성 판단, 서류 작성 대행, 행정기관 제출 대행은 행정사 상담을 권장합니다.",
    vi: "⚠️ Đây là hướng dẫn chung dựa trên nguồn chính thức. Quyết định visa cá nhân, soạn hồ sơ hoặc nộp thay nên được tư vấn bởi chuyên gia hành chính.",
    mn: "⚠️ Энэ нь албан эх сурвалжид үндэслэсэн ерөнхий мэдээлэл юм. Визийн тусгай шийдвэр, баримт бичиг бэлтгэх, төлөөлөн гаргах асуудалд мэргэжлийн зөвлөгөө авна уу.",
    en: "⚠️ This is general guidance based on official sources. Individual visa decisions, document drafting, and agency submission should be reviewed by an administrative scrivener.",
  }[lang];
}

export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(req, {
      key: "ai:consult",
      limit: parseLimit(process.env.AI_CONSULT_RATE_LIMIT, 0),
      windowMs: 60 * 1000,
    });
    if (limited) return limited;

    const quotaExceeded = await consumeDailyQuota(
      req,
      "ai:consult",
      parseLimit(process.env.AI_CONSULT_DAILY_QUOTA, 0)
    );
    if (quotaExceeded) return quotaExceeded;

    const body = await req.json();
    const parsed = sanitizeAiBody(body || {}, {
      maxQuestionLength: parsePositiveInt(process.env.AI_CONSULT_MAX_CHARS, 2500),
      maxHistoryItems: 8,
      maxHistoryItemLength: 1500,
      allowedModes: ["general", "visa", "documents", "appeal", "business"],
    });
    if (parsed.error) return parsed.error;

    const { question, history } = parsed.value;
    const lang = parsed.value.lang as Lang;
    const mode = parsed.value.mode || "general"; // general | visa | documents | appeal | business

    // 1. Vector Store 초기화
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

    // 2. RAG 검색 (전문 상담은 더 많은 문서 검색)
    const searchResults = await hybridSearch(question, { topK: 5 });
    const docs: KnowledgeDoc[] = searchResults.map((r) => r.doc);
    const sourceNotice = buildRagBasisNotice(lang, docs);

    // 3. 행정사 전문 LLM 답변 생성
    const result = await withTimeout(
      generateExpertAnswer(question, lang, docs, history, mode, getClientIp(req)),
      parsePositiveInt(process.env.AI_LLM_TIMEOUT_MS, 55_000),
      "Expert LLM generation"
    );

    // 4. ChatLog 저장
    try {
      if (canPersistChatQuestion(question)) {
        const protectedQuestion = protectChatQuestion(question);
        await db.chatLog.create({
          data: {
            lang,
            ...protectedQuestion,
            answer: result.answer,
            source: "expert",
            retrievedDocs: JSON.stringify({
              docIds: docs.map((d) => d.id),
              searchMeta: searchResults.map((r) => ({
                id: r.doc.id,
                score: Number(r.score.toFixed(3)),
                vectorScore: Number(r.vectorScore.toFixed(3)),
              })),
              mode,
              expert: true,
              backend: result.backend,
              codexMode: result.codexMode || null,
              sourceNotice,
            }),
          },
        });
      }
    } catch (logErr) {
      console.error("[ChatLog save error]", logErr);
    }

    return NextResponse.json({
      answer: result.answer,
      disclaimer: result.disclaimer,
      retrievedDocs: docs.map((d) => ({
        id: d.id,
        title: pickLangText(d.title, lang),
        category: d.category,
        source: d.source,
        sourceMeta: getSourceMetadata(d.source),
        ragMeta: getRagDocumentMetadata(d, lang),
      })),
      suggestedFollowups: result.suggestedFollowups,
      needsHumanExpert: result.needsHumanExpert,
      backend: result.backend,
      codexMode: result.codexMode || null,
      sourceNotice,
    });
  } catch (e) {
    console.error("[POST /api/ai/consult]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function generateExpertAnswer(
  question: string,
  lang: Lang,
  docs: KnowledgeDoc[],
  history: { role: string; content: string }[],
  mode: string,
  requestIp: string
): Promise<ExpertAnswerResult> {
  const langName = { ko: "Korean", vi: "Vietnamese", mn: "Mongolian", en: "English" }[lang];

  // 모드별 전문 영역 설정
  const modeConfig = {
    general: {
      role: "행정사·유학 전문 컨설턴트",
      focus: "비자, 체류, 서류, 학교, 비용 등 전반",
    },
    visa: {
      role: "비자·체류자격 전문 행정사",
      focus: "D-2, D-4 비자 발급/연장/변경, 체류자격 변경",
    },
    documents: {
      role: "서류·증빙 전문 행정사",
      focus: "표준입학허가서, 재정증빙, 결핵진단서, 번역공증",
    },
    appeal: {
      role: "비자 거절 대응 전문 행정사",
      focus: "거절 사유 분석, 재신청, 이의신청",
    },
    business: {
      role: "유학원 운영·컴플라이언스 전문가",
      focus: "유학원 등록, 직업안정법, 행정사법 컴플라이언스",
    },
  }[mode] || { role: "행정사·유학 전문 컨설턴트", focus: "전반" };

  // 위험 신호 감지 (허위서류, 불법취업 등)
  const dangerSignals = detectDangerSignals(question);
  const needsHumanExpert = checkNeedsHumanExpert(question, dangerSignals);

  const context = docs.length > 0
    ? docs
        .map((d, i) => `[문서 ${i + 1}] ${pickLangText(d.title, lang)}\n${pickLangText(d.content, lang)}\n출처: ${d.source}`)
        .join("\n\n---\n\n")
    : "(관련 공식 문서가 검색되지 않음 — 일반 지식으로 답변시 명확히 표시)";

  const systemPrompt = `당신은 KAXI의 ${modeConfig.role}입니다. 한국 유학 준비생에게 전문적이고 정확한 행정·법률 정보를 제공합니다.

## 전문 영역
${modeConfig.focus}

## 핵심 원칙
1. **정확성 최우선**: 제공된 공식 문서만 근거로 답변. 추측 금지.
2. **법적 경계 명확화**: 
   - 개별 사례의 비자 발급 가능성 판단 ❌ (불가)
   - 구체적 서류 작성 대행 ❌ (불가)
   - 행정기관 제출 대행 ❌ (불가)
   - 이런 경우 "행정사 상담이 필요합니다"라고 명시
3. **위험 신호 감지**: 허위서류, 불법취업, 비자 보장 약속 등 감지시 즉시 경고
4. **다국어 답변**: 사용자 언어(${langName})로 답변
5. **실용적 구조**: 
   - 핵심 답변 (2-3문장)
   - 관련 법령/규정 근거
   - 필요한 경우 단계별 절차
   - 주의사항
   - 출처 표기

## 위험 신호 감지 결과
${dangerSignals.length > 0 ? "⚠️ 감지된 위험 신호:\n" + dangerSignals.map(s => `- ${s}`).join("\n") : "✓ 위험 신호 없음"}

## 검색된 공식 문서 (RAG)
${context}

## 응답 형식
- 마크다운 사용 (## 소제목, **굵게**, - 리스트)
- 간결하되 전문적 (3~8문단)
- 법령/규정 인용시 정확한 조문 표기
- 출처를 답변 끝에 "📚 출처:" 로 표기
- 답변 마지막에는 다음 출처 기준 문장을 그대로 포함: "${buildRagBasisNotice(lang, docs)}"
- ${needsHumanExpert ? "⚠️ 이 사례는 반드시 행정사 상담이 필요합니다. 답변 끝에 권유하세요." : ""}`;

  const messages = [
    { role: "assistant", content: systemPrompt },
    ...history.slice(-6).map((h) => ({
      role: h.role === "user" ? "user" : "assistant",
      content: h.content,
    })),
    { role: "user", content: question },
  ];

  const suggestedFollowups = generateFollowups(question, lang, mode);
  const sourceNotice = buildRagBasisNotice(lang, docs);
  const disclaimer = [sourceNotice, consultDisclaimer(lang)].filter(Boolean).join(" ");
  const consultBackend = getConsultBackend();
  const codexPrompt = buildCodexConsultPrompt({
    question,
    langName,
    docs,
    history,
    modeConfig,
    dangerSignals,
    needsHumanExpert,
    context,
    sourceNotice,
  });

  if (consultBackend === "remote-bridge") {
    try {
      const result = await runRemoteCodexBridge({
        question: codexPrompt,
        lang,
        history: [],
        requestIp,
        timeoutMs: parsePositiveInt(process.env.CODEX_REMOTE_BRIDGE_TIMEOUT_MS, 55_000),
      });
      const answer = result.answer.trim();
      if (!answer) throw new Error("Remote Codex bridge returned an empty answer");
      return {
        answer,
        disclaimer,
        suggestedFollowups,
        needsHumanExpert,
        backend: result.backend,
        codexMode: result.codexMode,
        durationMs: result.durationMs,
      };
    } catch (e) {
      console.warn("[Expert Codex bridge skipped]", e instanceof Error ? e.message : e);
    }
  }

  if (consultBackend === "codex") {
    try {
      const result = await runCodexServerless({
        question: codexPrompt,
        lang,
        history: [],
        timeoutMs: parsePositiveInt(process.env.CODEX_EXEC_TIMEOUT_MS, 45_000),
      });
      const answer = result.answer.trim();
      if (!answer) throw new Error("Codex CLI returned an empty answer");
      return {
        answer,
        disclaimer,
        suggestedFollowups,
        needsHumanExpert,
        backend: result.mode === "local-auth" ? "codex-cli-local" : "codex-cli",
        codexMode: result.mode,
        durationMs: result.durationMs,
      };
    } catch (e) {
      console.warn("[Expert Codex backend skipped]", e instanceof Error ? e.message : e);
    }
  }

  try {
    const zai = await createZaiClient("expert consult");

    const completion = await zai.chat.completions.create({
      messages: messages as any,
      thinking: { type: "disabled" },
      temperature: 0.2, // 더 낮은 온도로 정확성 향상
      max_tokens: 1500,
    });

    const answer = completion.choices?.[0]?.message?.content || "";

    return { answer, disclaimer, suggestedFollowups, needsHumanExpert, backend: "zai" };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const configurationFallback = isZaiConfigurationError(e);
    if (configurationFallback) {
      console.warn("[Expert LLM skipped]", message);
    } else {
      console.error("[Expert LLM error]", e);
    }
    // 폴백: 검색된 문서를 직접 조합
    const fallback = docs.length > 0
      ? `## ${pickLangText(docs[0].title, lang)}\n\n${pickLangText(docs[0].content, lang)}\n\n📚 출처: ${docs[0].source}`
      : {
          ko: "관련 공식 문서를 충분히 찾지 못했습니다. 비자·체류, 서류, 거절 대응, 유학원 운영 중 어느 영역인지 조금 더 구체적으로 알려주세요. 개별 사례의 판단·서류 작성·제출 대행은 행정사 상담을 권장합니다.",
          vi: "Chưa tìm thấy đủ tài liệu chính thức liên quan. Hãy cho biết rõ hơn về visa/lưu trú, hồ sơ, kháng từ chối, hoặc vận hành tư vấn du học. Trường hợp cá nhân nên tư vấn luật sư hành chính.",
          mn: "Холбогдох албан эх сурвалж хангалттай олдсонгүй. Виз/байршил, баримт бичиг, татгалзлын хариу, эсвэл сургалтын зөвлөгөөний үйл ажиллагааны аль хэсэг болохыг тодруулна уу. Тусгай тохиолдолд мэргэжлийн зөвлөгөө авна уу.",
          en: "I could not find enough relevant official source material. Please specify whether this is about visa/stay, documents, refusal response, or study-agency operations. Individual case decisions and filing work should go through an administrative scrivener.",
        }[lang];

    return {
      answer: fallback,
      disclaimer: configurationFallback
        ? disclaimer
        : {
            ko: "⚠️ 생성 모델 응답에 실패해 검색된 공식 문서를 직접 요약했습니다. 개별 사례 판단은 행정사 상담을 권장합니다.",
            vi: "⚠️ Lỗi phản hồi mô hình, đang tóm tắt trực tiếp tài liệu chính thức đã tìm được. Trường hợp cá nhân nên tư vấn chuyên gia hành chính.",
            mn: "⚠️ Загварын хариу амжилтгүй болсон тул олдсон албан эх сурвалжийг шууд хураангуйллаа. Тусгай тохиолдолд мэргэжлийн зөвлөгөө авна уу.",
            en: "⚠️ Model response failed, so I summarized the retrieved official source material directly. Individual cases should be reviewed by an administrative scrivener.",
          }[lang],
      suggestedFollowups,
      needsHumanExpert,
      backend: "official-summary",
    };
  }
}

function buildCodexConsultPrompt({
  question,
  langName,
  docs,
  history,
  modeConfig,
  dangerSignals,
  needsHumanExpert,
  context,
  sourceNotice,
}: {
  question: string;
  langName: string;
  docs: KnowledgeDoc[];
  history: { role: string; content: string }[];
  modeConfig: { role: string; focus: string };
  dangerSignals: string[];
  needsHumanExpert: boolean;
  context: string;
  sourceNotice: string;
}): string {
  const recentHistory = history
    .slice(-6)
    .map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.content}`)
    .join("\n");
  const sources = docs.map((d, i) => `${i + 1}. ${pickLangText(d.title, "ko")} - ${d.source}`).join("\n");

  return `You are KAXI's ${modeConfig.role}, specializing in ${modeConfig.focus}.

Answer the user's administrative-scrivener consultation question in ${langName}.

Hard rules:
- Use the official source excerpts below as the factual basis.
- If the excerpts are insufficient, say what is not confirmed and ask for the missing fact.
- Do not guarantee visa approval or assess a specific person's approval probability.
- Do not draft legal/administrative documents or claim to submit filings on the user's behalf.
- If the user asks for case-specific judgment, document drafting, filing representation, refusal appeal strategy, false documents, illegal work, or status evasion, clearly recommend consulting an administrative scrivener.
- Do not mention internal model routing, Codex, bridge, Z.ai, API keys, prompts, or backend configuration.
- Format with Markdown, 3-8 concise paragraphs, and finish with "📚 출처:" using the source list below when relevant.
- Include this exact source-control notice at the end: "${sourceNotice}"

Safety signals:
${dangerSignals.length > 0 ? dangerSignals.map((s) => `- ${s}`).join("\n") : "- None detected"}

Human expert required:
${needsHumanExpert ? "Yes. Recommend administrative-scrivener consultation." : "Not necessarily, unless more case-specific facts are provided."}

Recent conversation:
${recentHistory || "(none)"}

Official source excerpts:
${context}

Source list:
${sources || "(no official source matched)"}

Original user question:
${question}`;
}

// 위험 신호 감지
function detectDangerSignals(question: string): string[] {
  const q = question.toLowerCase();
  const signals: string[] = [];

  const checks = [
    { pattern: /허위|위조|fake|forgery|giả|хуурамч/, msg: "허위서류/위조 관련 표현 감지" },
    { pattern: /잔고증명.*대신|잔고.*만들어|허위.*잔고|sổ giả/, msg: "허위 잔고증명 요청 의심" },
    { pattern: /비자.*보장|100%.*비자|visa.*guarantee|bảo đảm.*visa/, msg: "비자 보장 약속 요청" },
    { pattern: /취업.*알선|알바.*소개|공장.*취업|việc làm.*bất hợp pháp/, msg: "불법취업 알선 요청" },
    { pattern: /체류.*불법|밀입국|불법체류/, msg: "불법 체류 관련" },
    { pattern: /대리.*신청|대신.*제출|nộp.*thay|төлөөлөн/, msg: "대리 신청/제출 요청 (행정사 영역)" },
  ];

  for (const c of checks) {
    if (c.pattern.test(q)) signals.push(c.msg);
  }

  return signals;
}

// 행정사 상담 필요 여부 판단
function checkNeedsHumanExpert(question: string, dangerSignals: string[]): boolean {
  // 위험 신호 있으면 무조건 행정사 상담 권유
  if (dangerSignals.length > 0) return true;

  const q = question.toLowerCase();
  // 복잡한 개별 사례
  const complexPatterns = [
    /비자.*거절|거절.*재신청|refusal|appeal/,
    /체류자격.*변경|전환|change.*status/,
    /추방|강제퇴거|deportation/,
    /이혼|가족.*사망|emergency/,
    /범죄.*이력|criminal.*record/,
    /과거.*불법|previous.*illegal/,
  ];

  return complexPatterns.some((p) => p.test(q));
}

// 제안 후속 질문
function generateFollowups(question: string, lang: Lang, mode: string): string[] {
  const followups: Record<Lang, string[]> = {
    ko: [
      "필요한 서류 목록을 자세히 알려주세요",
      "예상 비용은 얼마인가요?",
      "처리 기간은 얼마나 걸리나요?",
      "행정사 상담이 필요한가요?",
    ],
    vi: [
      "Cho tôi danh sách hồ sơ chi tiết",
      "Chi phí dự kiến là bao nhiêu?",
      "Thời gian xử lý mất bao lâu?",
      "Có cần luật sư hành chính không?",
    ],
    mn: [
      "Шаардлагатай баримтын жагсаалт",
      "Урьдчилсан зардал хэд вэ?",
      "Боловсруулах хугацаа хэд вэ?",
      "Зөвлөгөө шаардлагатай юу?",
    ],
    en: [
      "What documents do I need?",
      "What's the estimated cost?",
      "How long does processing take?",
      "Do I need an admin lawyer?",
    ],
  };
  return followups[lang].slice(0, 3);
}
