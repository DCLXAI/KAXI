import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/chatlog/analyze - ChatLog 분석 (언어/패턴/빈도)
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const days = Number(searchParams.get("days") || "30");
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // 1. 기본 통계
    const [total, recent, byLang, bySource] = await Promise.all([
      db.chatLog.count(),
      db.chatLog.count({ where: { createdAt: { gte: since } } }),
      db.chatLog.groupBy({ by: ["lang"], _count: true }),
      db.chatLog.groupBy({ by: ["source"], _count: true }),
    ]);

    // 2. 최근 질문들 (검색 메타데이터 포함)
    const logs = await db.chatLog.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    // 3. 질문 분석 — 빈도 높은 단어 추출 (간단 토큰화)
    const wordFreq = new Map<string, number>();
    const questionPatterns: {
      id: string;
      question: string;
      lang: string;
      topDocId?: string;
      topScore?: number;
      topVecScore?: number;
      topKwScore?: number;
      method?: string;
      hasResult: boolean;
      createdAt: string;
    }[] = [];

    for (const log of logs) {
      let topDocId: string | undefined;
      let topScore: number | undefined;
      let topVecScore: number | undefined;
      let topKwScore: number | undefined;
      let method: string | undefined;
      let hasResult = false;

      try {
        const parsed = JSON.parse(log.retrievedDocs || "{}");
        if (parsed.searchMeta?.[0]) {
          const top = parsed.searchMeta[0];
          topDocId = top.id;
          topScore = top.score;
          topVecScore = top.vectorScore;
          topKwScore = top.keywordScore;
          method = top.method;
          hasResult = true;
        }
        if (parsed.docIds?.length > 0) hasResult = true;
      } catch {}

      questionPatterns.push({
        id: log.id,
        question: log.question,
        lang: log.lang,
        topDocId,
        topScore,
        topVecScore,
        topKwScore,
        method,
        hasResult,
        createdAt: log.createdAt.toISOString(),
      });

      // 단어 빈도 (한국어 + 영어 + 다국어)
      const words = log.question
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((w) => w.length > 1);
      for (const w of words) {
        wordFreq.set(w, (wordFreq.get(w) ?? 0) + 1);
      }
    }

    // 4. 검색 실패 케이스 (topVecScore 낮음 + 키워드 0)
    const failedCases = questionPatterns.filter(
      (p) =>
        p.hasResult &&
        p.topVecScore !== undefined &&
        p.topVecScore < 0.5 &&
        p.topKwScore === 0
    );

    // 5. 상위 빈도 단어 (동의어 후보)
    const topWords = Array.from(wordFreq.entries())
      .filter(([w]) => w.length > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([word, count]) => ({ word, count }));

    return NextResponse.json({
      summary: {
        total,
        recent,
        byLang,
        bySource,
        failedCount: failedCases.length,
      },
      topWords,
      failedCases,
      recentQuestions: questionPatterns.slice(0, 50),
    });
  } catch (e) {
    console.error("[GET /api/chatlog/analyze]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
