import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, withTimeout } from "@/lib/api/security";

// POST /api/synonyms/suggest - LLM 기반 동의어 후보 자동 추천
// ChatLog에서 빈도 높은 단어 + 기존 동의어와 매칭 안 된 것들을 LLM이 분석

export async function POST(req: NextRequest) {
  try {
    const unauthorized = requireAdmin(req);
    if (unauthorized) return unauthorized;

    const body = await req.json();
    const { days = 30, topN = 20 } = body || {};
    const safeDays = Math.min(Math.max(Number(days) || 30, 1), 90);
    const safeTopN = Math.min(Math.max(Number(topN) || 20, 1), 50);

    const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
    const logs = await db.chatLog.findMany({
      where: { createdAt: { gte: since } },
      take: 500,
    });

    if (logs.length === 0) {
      return NextResponse.json({
        suggestions: [],
        message: "No chat logs to analyze",
      });
    }

    // 빈도 높은 단어 추출
    const wordFreq = new Map<string, { count: number; langs: Set<string>; examples: string[] }>();
    for (const log of logs) {
      const words = log.question
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((w) => w.length > 1);
      for (const w of words) {
        if (!wordFreq.has(w)) {
          wordFreq.set(w, { count: 0, langs: new Set(), examples: [] });
        }
        const entry = wordFreq.get(w)!;
        entry.count++;
        entry.langs.add(log.lang);
        if (entry.examples.length < 3) {
          entry.examples.push(log.question);
        }
      }
    }

    // 기존 동의어 source 가져오기
    const existing = await db.synonym.findMany({ select: { source: true } });
    const existingSet = new Set<string>();
    for (const s of existing) {
      existingSet.add(s.source);
      existingSet.add(s.source.toLowerCase());
    }

    // 후보 선별: 기존 동의어에 없는 단어
    const stopwords = new Set([
      "는", "은", "이", "가", "을", "를", "에", "의", "와", "과", "도", "만",
      "요", "네", "네요", "세요", "습니까", "습니다", "what", "the", "is", "a",
      "to", "in", "for", "and", "or", "of", "with", "how", "why", "when",
    ]);

    const candidates = Array.from(wordFreq.entries())
      .filter(([w]) => {
        if (w.length < 2) return false;
        if (stopwords.has(w) || stopwords.has(w.toLowerCase())) return false;
        if (existingSet.has(w) || existingSet.has(w.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, safeTopN)
      .map(([word, info]) => ({
        word,
        count: info.count,
        langs: Array.from(info.langs),
        examples: info.examples,
      }));

    // LLM으로 동의어 추천 받기
    let llmSuggestions: Array<{
      source: string;
      targets: string[];
      category: string;
      confidence: number;
      reason: string;
    }> = [];

    if (candidates.length > 0) {
      try {
        llmSuggestions = await withTimeout(
          generateSynonymSuggestions(candidates),
          20_000,
          "Synonym suggestion"
        );
      } catch (e) {
        console.error("[LLM suggest error]", e);
      }
    }

    return NextResponse.json({
      candidates,
      suggestions: llmSuggestions,
      totalCandidates: candidates.length,
    });
  } catch (e) {
    console.error("[POST /api/synonyms/suggest]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function generateSynonymSuggestions(
  candidates: Array<{ word: string; count: number; langs: string[]; examples: string[] }>
): Promise<Array<{
  source: string;
  targets: string[];
  category: string;
  confidence: number;
  reason: string;
}>> {
  try {
    const ZAIModule = await import("z-ai-web-dev-sdk");
    const ZAI = ZAIModule.default;
    const zai = await ZAI.create();

    const candidatesText = candidates
      .map((c) => `- "${c.word}" (빈도: ${c.count}, 언어: ${c.langs.join("/")})\n  예시: "${c.examples[0]}"`)
      .join("\n");

    const systemPrompt = `당신은 K-Bridge Gateway의 다국어 동의어 사전 큐레이터입니다.
한국 유학 준비 플랫폼에서 사용자 질문 로그를 분석하여, 검색 품질 향상을 위한 동의어 매핑을 추천합니다.

각 단어에 대해:
1. source: 원본 단어 (그대로 유지)
2. targets: 공식 용어 동의어 배열 (한국어 + 영어 + 베트남어 + 몽골어 포함)
3. category: cost | visa | documents | school | warning | process | general
4. confidence: 0.0~1.0 (의미 명확성)
5. reason: 추천 이유 (한국어 1문장)

규칙:
- 검색 품질에 도움이 되는 동의어만 추천 (불필요한 단어는 제외)
- targets은 실제 Knowledge docs에 등장하는 용어 위주
- 동일 의미의 다국어 번역 포함
- 응답은 JSON 배열만 (설명 없이)

응답 예시:
[
  {"source": "거절", "targets": ["refusal", "denied", "보장", "거절", "татгалзсан"], "category": "visa", "confidence": 0.9, "reason": "비자 거절 관련 질문에서 자주 등장"}
]`;

    const userPrompt = `다음 사용자 질문에서 추출한 단어들의 동의어를 추천해주세요:

${candidatesText}

JSON 배열로 응답:`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      thinking: { type: "disabled" },
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = completion.choices?.[0]?.message?.content || "";
    console.log("[LLM suggest] Response length:", content.length);
    console.log("[LLM suggest] Response preview:", content.substring(0, 300));

    // JSON 추출 — 여러 패턴 시도
    // 1. ```json ... ``` 블록
    let jsonStr: string | null = null;
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }
    // 2. 직접 배열
    if (!jsonStr) {
      const arrayMatch = content.match(/\[[\s\S]*\]/);
      if (arrayMatch) jsonStr = arrayMatch[0];
    }

    if (!jsonStr) {
      console.log("[LLM suggest] No JSON found in response");
      return [];
    }

    try {
      const suggestions = JSON.parse(jsonStr);
      return Array.isArray(suggestions) ? suggestions : [];
    } catch (parseErr) {
      console.error("[LLM suggest] JSON parse error:", parseErr);
      console.error("[LLM suggest] JSON string was:", jsonStr.substring(0, 500));
      return [];
    }
  } catch (e) {
    console.error("[LLM synonym suggestion error]", e);
    return [];
  }
}
