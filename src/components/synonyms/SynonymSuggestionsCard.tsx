"use client";

import { Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/i18n/routing";
import type { Suggestion } from "./types";

interface SynonymSuggestionsCardProps {
  locale: Locale;
  onAccept: (suggestion: Suggestion) => void;
  onSuggest: () => void;
  suggestions: Suggestion[];
  suggesting: boolean;
}

export function SynonymSuggestionsCard({
  locale,
  onAccept,
  onSuggest,
  suggestions,
  suggesting,
}: SynonymSuggestionsCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {locale === "ko" ? "LLM 동의어 자동 추천" : "LLM Auto-Suggest"}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {locale === "ko" ? "ChatLog에서 빈도 높은 단어를 LLM이 분석하여 동의어 후보 추천" : "LLM analyzes high-frequency words from ChatLog"}
            </CardDescription>
          </div>
          <Button size="sm" onClick={onSuggest} disabled={suggesting}>
            {suggesting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
            {locale === "ko" ? "추천 받기" : "Suggest"}
          </Button>
        </div>
      </CardHeader>
      {suggestions.length > 0 && (
        <CardContent className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <div key={`${suggestion.source}-${index}`} className="flex items-start gap-3 rounded-lg border p-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge>{suggestion.source}</Badge>
                  <span className="text-xs text-muted-foreground">→</span>
                  <div className="flex flex-wrap gap-1">
                    {suggestion.targets.map((target, targetIndex) => (
                      <Badge key={`${target}-${targetIndex}`} variant="outline" className="text-xs">{target}</Badge>
                    ))}
                  </div>
                  <Badge variant="secondary" className="text-xs">{suggestion.category}</Badge>
                  <Badge variant="outline" className="text-xs">conf: {(suggestion.confidence * 100).toFixed(0)}%</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{suggestion.reason}</div>
              </div>
              <Button size="sm" variant="default" onClick={() => onAccept(suggestion)}>
                {locale === "ko" ? "추가" : "Add"}
              </Button>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
