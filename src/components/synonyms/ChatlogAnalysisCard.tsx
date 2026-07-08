"use client";

import { AlertCircle, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/i18n/routing";
import type { ChatlogAnalysis } from "./types";

interface ChatlogAnalysisCardProps {
  analysis: ChatlogAnalysis | null;
  locale: Locale;
}

export function ChatlogAnalysisCard({ analysis, locale }: ChatlogAnalysisCardProps) {
  if (!analysis) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          {locale === "ko" ? "ChatLog 분석 (최근 30일)" : "ChatLog Analysis (30d)"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="rounded-lg bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">{locale === "ko" ? "총 대화" : "Total"}</div>
            <div className="text-xl font-bold mt-1">{analysis.summary.total}</div>
          </div>
          <div className="rounded-lg bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">{locale === "ko" ? "최근 30일" : "Recent 30d"}</div>
            <div className="text-xl font-bold mt-1">{analysis.summary.recent}</div>
          </div>
          <div className="rounded-lg bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">{locale === "ko" ? "검색 실패 의심" : "Failed (low vec)"}</div>
            <div className="text-xl font-bold mt-1 text-amber-600">{analysis.summary.failedCount}</div>
          </div>
          <div className="rounded-lg bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">{locale === "ko" ? "언어" : "Languages"}</div>
            <div className="text-xl font-bold mt-1">{analysis.summary.byLang.length}</div>
          </div>
        </div>

        {analysis.topWords.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-2">
              {locale === "ko" ? "빈도 높은 단어 (동의어 후보)" : "Top words (synonym candidates)"}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {analysis.topWords.slice(0, 20).map((word) => (
                <Badge key={word.word} variant="outline" className="text-xs">
                  {word.word} ({word.count})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {analysis.failedCases.length > 0 && (
          <div className="mt-4">
            <div className="text-xs text-amber-700 mb-2 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {locale === "ko" ? "검색 품질 낮은 케이스 (vec < 0.5, kw = 0)" : "Low quality cases"}
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {analysis.failedCases.slice(0, 10).map((item) => (
                <div key={item.id} className="text-xs bg-amber-50 border border-amber-200 rounded p-2">
                  <span className="font-mono text-[10px] text-muted-foreground">[{item.lang}]</span>{" "}
                  <span>{item.question}</span>
                  {item.topDocId && (
                    <span className="text-muted-foreground"> → {item.topDocId} (vec: {item.topVecScore?.toFixed(2)})</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
