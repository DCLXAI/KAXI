"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, BookOpen, Brain, Database, RotateCcw, ShieldCheck, Wrench, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KaxiPawMark } from "@/components/brand/KaxiPawMark";
import { MessageResponse } from "@/components/ai-elements/message";
import {
  linkCitationMarkers,
  SourceAnnotations,
} from "@/components/kbridge/SourceAnnotations";
import { EMPTY_CLARIFY_DRAFT } from "./agent-config";
import { AgentClarifyPanel } from "./AgentClarifyPanel";
import type { AgentLocale, AgentMessage, ClarifyDraft } from "./types";
import { agentSourceAnnotations } from "./types";
import { localePath } from "@/i18n/routing";
import { unifiedRouteLabel } from "@/lib/ai/unified-router";

interface AgentResponseCardProps {
  clarifyDraft?: ClarifyDraft;
  loading: boolean;
  locale: AgentLocale;
  message: AgentMessage;
  messageIndex: number;
  originalRequest: string;
  onDraftChange: (messageIndex: number, patch: Partial<ClarifyDraft>) => void;
  onRetry: (messageIndex: number) => void;
  onSend: (text: string) => void;
  onSendDraft: (messageIndex: number, originalRequest: string) => void;
}

export function AgentResponseCard({
  clarifyDraft = EMPTY_CLARIFY_DRAFT,
  loading,
  locale,
  message,
  messageIndex,
  originalRequest,
  onDraftChange,
  onRetry,
  onSend,
  onSendDraft,
}: AgentResponseCardProps) {
  if (message.state === "error") {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4" role="alert">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-relaxed">{message.text}</p>
            {message.retry && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 gap-1.5"
                disabled={loading}
                onClick={() => onRetry(messageIndex)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {locale === "ko" ? "다시 시도" : locale === "vi" ? "Thử lại" : locale === "mn" ? "Дахин оролдох" : "Retry"}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-icon-accent/15">
          <KaxiPawMark className="h-3 w-3" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          KAXI AI
        </span>
        {message.routing && (
          <Badge variant={message.routing.capability === "expert" ? "default" : "outline"} className="text-[10px] gap-0.5">
            {message.routing.capability === "expert"
              ? <ShieldCheck className="h-2.5 w-2.5" />
              : <Wrench className="h-2.5 w-2.5" />}
            {unifiedRouteLabel(locale, message.routing.capability)}
          </Badge>
        )}
        {message.routing?.capability !== "expert" && message.toolResults && message.toolResults.length > 0 && (
          <Badge variant="outline" className="text-[10px] gap-0.5">
            <Wrench className="h-2.5 w-2.5" />
            {message.toolResults.length} {locale === "ko" ? "도구 사용" : "tools"}
          </Badge>
        )}
        {message.meta?.quality.retrievalBackends && message.meta.quality.retrievalBackends.length > 0 && (
          <Badge
            variant={message.meta.quality.retrievalBackends.includes("pgvector") ? "default" : "outline"}
            className="text-[10px] gap-0.5"
          >
            <Database className="h-2.5 w-2.5" />
            {message.meta.quality.retrievalBackends.join("/")}
          </Badge>
        )}
        {message.grounded && (
          <Badge variant="outline" className="text-[10px] gap-0.5">
            <BookOpen className="h-2.5 w-2.5" />
            Grounded
          </Badge>
        )}
        {message.cached && (
          <Badge variant="outline" className="text-[10px] gap-0.5">
            <Zap className="h-2.5 w-2.5" />
            {locale === "ko" ? "빠른 재사용" : locale === "vi" ? "Đã lưu tạm" : locale === "mn" ? "Түр хадгалсан" : "Cached"}
          </Badge>
        )}
        {message.meta?.quality.intentConfidence && (
          <Badge variant="outline" className="text-[10px] gap-0.5">
            <Brain className="h-2.5 w-2.5" />
            {message.meta.quality.intentConfidence}
          </Badge>
        )}
        {typeof message.durationMs === "number" && (
          <Badge variant="outline" className="text-[10px]">
            {Math.round(message.durationMs / 1000)}s
          </Badge>
        )}
      </div>

      {message.meta && (
        <div className="mb-3 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
          <span className="rounded-md bg-muted px-2 py-1">{message.meta.summary}</span>
          {message.meta.plan.slice(0, 3).map((step) => (
            <span key={step} className="rounded-md border px-2 py-1">
              {step}
            </span>
          ))}
        </div>
      )}

      <div className="text-sm leading-relaxed">
        <MessageResponse>
          {linkCitationMarkers(message.text, agentSourceAnnotations(message), `agent-message-${messageIndex}`, 8)}
        </MessageResponse>
        {message.state === "streaming" && (
          <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-foreground align-text-bottom" aria-hidden="true" />
        )}
      </div>

      {message.meta?.safetyFlags && message.meta.safetyFlags.length > 0 && (
        <div className="mt-3 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {message.meta.safetyFlags[0]}
        </div>
      )}
      {message.meta?.sourceNotice && (
        <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-relaxed text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100">
          {message.meta.sourceNotice}
        </div>
      )}

      <AgentClarifyPanel
        draft={clarifyDraft}
        loading={loading}
        locale={locale}
        message={message}
        messageIndex={messageIndex}
        originalRequest={originalRequest}
        onDraftChange={onDraftChange}
        onSend={onSend}
        onSendDraft={onSendDraft}
      />

      <SourceAnnotations
        sources={agentSourceAnnotations(message)}
        lang={locale}
        max={8}
        idPrefix={`agent-message-${messageIndex}`}
      />

      {message.expert?.needsHumanExpert && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <p className="max-w-xl text-xs text-muted-foreground">
            {locale === "ko"
              ? "개별 판단이나 서류 대행이 필요한 사안입니다. 개인정보 동의 후 검증된 전문가에게 요청할 수 있습니다."
              : locale === "vi"
                ? "Trường hợp này cần đánh giá cá nhân. Sau khi đồng ý, bạn có thể gửi cho chuyên gia đã xác minh."
                : locale === "mn"
                  ? "Энэ тохиолдолд хувь хүний үнэлгээ шаардлагатай. Зөвшөөрсний дараа баталгаажсан мэргэжилтэнд илгээж болно."
                  : "This case needs individual review. After consent, you can send it to a verified expert."}
          </p>
          <Button size="sm" asChild>
            <Link href={`${localePath(locale, "/partners")}?type=admin&question=${encodeURIComponent(message.expert.consultationQuestion)}`}>
              {locale === "ko" ? "전문가 연결" : locale === "vi" ? "Kết nối chuyên gia" : locale === "mn" ? "Мэргэжилтэнтэй холбогдох" : "Connect to an expert"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}

      {message.meta?.suggestions && message.meta.suggestions.length > 0 && (
        <div className="mt-4 border-t pt-3">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-normal text-muted-foreground">
            {locale === "ko" ? "다음 작업" : "Next"}
          </div>
          <div className="flex flex-wrap gap-2">
            {message.meta.suggestions.map((suggestion) => (
              <button
                key={`${suggestion.kind}-${suggestion.label}`}
                type="button"
                disabled={loading}
                onClick={() => onSend(suggestion.prompt)}
                className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-icon-accent/55 bg-background px-2.5 py-1.5 text-left text-xs hover:border-icon-accent hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ArrowRight className="h-3 w-3 text-icon-accent" />
                <span className="font-medium">{suggestion.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
