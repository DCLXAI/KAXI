import { NextRequest, NextResponse } from "next/server";
import { pickLangText, type KnowledgeDoc } from "@/lib/data/knowledge";
import type { Lang } from "@/lib/i18n/translations";
import { findFAQ, AI_DEFAULT_REPLY } from "@/lib/data/faq";
import { db } from "@/lib/db";
import { hybridSearch, initVectorStore, getStoreStats } from "@/lib/embeddings/vector-store";

// POST /api/ai/chat - RAG 기반 채팅 (Vector Search + LLM)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, lang = "ko" as Lang, history = [] } = body || {};

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Missing question" },
        { status: 400 }
      );
    }

    // 1. Vector Store 초기화 (lazy)
    initVectorStore();

    // 2. 하이브리드 검색 (임베딩 + 키워드)
    const searchResults = hybridSearch(question, { topK: 3 });
    const docs: KnowledgeDoc[] = searchResults.map((r) => r.doc);

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
      category: r.doc.category,
      docSource: r.doc.source,
    }));

    // 4. LLM 호출 (검색된 문서를 컨텍스트로 활용)
    if (docs.length > 0) {
      try {
        const llmAnswer = await generateWithLLM(question, lang, docs, history);
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
        // LLM 실패시 검색된 문서를 직접 답변으로
        if (faq) {
          answer = faq[lang] + "\n\n📚 " + pickLangText(docs[0].content, lang);
        } else {
          const top = docs[0];
          answer =
            pickLangText(top.title, lang) +
            "\n\n" +
            pickLangText(top.content, lang) +
            "\n\n📚 출처: " +
            top.source;
        }
      }
    } else if (faq) {
      answer = faq[lang];
    } else {
      answer = AI_DEFAULT_REPLY[lang];
    }

    // 5. 로그 저장 (비동기, 실패 무시)
    try {
      await db.chatLog.create({
        data: {
          lang,
          question,
          answer,
          source,
          retrievedDocs: JSON.stringify({
            docIds: retrievedDocIds,
            searchMeta,
          }),
        },
      });
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
      })),
      searchMeta,
    });
  } catch (e) {
    console.error("[POST /api/ai/chat]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// GET /api/ai/chat - Vector Store 상태 조회 (디버그용)
export async function GET() {
  initVectorStore();
  return NextResponse.json(getStoreStats());
}

async function generateWithLLM(
  question: string,
  lang: Lang,
  docs: KnowledgeDoc[],
  history: { role: string; content: string }[]
): Promise<string | null> {
  try {
    const ZAIModule = await import("z-ai-web-dev-sdk");
    const ZAI = ZAIModule.default;
    const zai = await ZAI.create();

    const langName = { ko: "Korean", vi: "Vietnamese", mn: "Mongolian", en: "English" }[lang];

    const context = docs
      .map((d, i) => `[문서 ${i + 1}] ${pickLangText(d.title, lang)}\n${pickLangText(d.content, lang)}\n출처: ${d.source}`)
      .join("\n\n---\n\n");

    const systemPrompt = `당신은 K-Bridge Gateway의 유학 준비 내비게이터입니다. 한국 유학 준비생에게 공식 정보 기반으로 답변합니다.

중요 규칙:
1. 반드시 제공된 컨텍스트 문서만 근거로 답변하세요. 임의 정보를 생성하지 마세요.
2. 사용자 언어(${langName})로 답변하세요.
3. 비자 보장, 허위서류, 불법취업은 단호히 거부하고 합법 대안을 안내하세요.
4. 비자·체류자격 개별 판단은 행정사 상담을 권유하세요.
5. 비용 관련 질문은 항목별로 분해해서 설명하세요.
6. 답변은 간결하고 실용적으로 (3~5문장 이내).
7. 출처를 답변 끝에 표기하세요.

컨텍스트 문서 (Vector Search + Keyword Match로 검색됨):
${context}`;

    const messages = [
      { role: "assistant", content: systemPrompt },
      ...history.slice(-4).map((h) => ({
        role: h.role === "user" ? "user" : "assistant",
        content: h.content,
      })),
      { role: "user", content: question },
    ];

    const completion = await zai.chat.completions.create({
      messages: messages as any,
      thinking: { type: "disabled" },
      temperature: 0.3,
      max_tokens: 600,
    });

    const content = completion.choices?.[0]?.message?.content;
    return content || null;
  } catch (e) {
    console.error("[LLM generation error]", e);
    return null;
  }
}
