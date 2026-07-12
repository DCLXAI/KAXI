"use client";

import { ArrowRight, BookOpen, Brain, Database, Sparkles, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { KaxiCat } from "@/components/brand/KaxiCat";
import { MessageResponse } from "@/components/ai-elements/message";
import {
  linkCitationMarkers,
  SourceAnnotations,
} from "@/components/kbridge/SourceAnnotations";
import { backendLabel, EMPTY_CLARIFY_DRAFT } from "./agent-config";
import { AgentClarifyPanel } from "./AgentClarifyPanel";
import type { AgentLocale, AgentMessage, ClarifyDraft } from "./types";
import { agentSourceAnnotations } from "./types";

interface AgentResponseCardProps {
  clarifyDraft?: ClarifyDraft;
  loading: boolean;
  locale: AgentLocale;
  message: AgentMessage;
  messageIndex: number;
  originalRequest: string;
  onDraftChange: (messageIndex: number, patch: Partial<ClarifyDraft>) => void;
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
  onSend,
  onSendDraft,
}: AgentResponseCardProps) {
  return (
    <div className="bg-card border rounded-2xl rounded-bl-md p-4">
      <div className="flex items-center gap-2 mb-2">
        <KaxiCat state="breath" size={24} inverted />
        <span className="text-xs font-medium text-muted-foreground">
          {locale === "ko" ? "AI 에이전트" : "Agent"}
        </span>
        {message.toolResults && message.toolResults.length > 0 && (
          <Badge variant="outline" className="text-[10px] gap-0.5">
            <Wrench className="h-2.5 w-2.5" />
            {message.toolResults.length} {locale === "ko" ? "도구 사용" : "tools"}
          </Badge>
        )}
        {message.backend && (
          <Badge variant="outline" className="text-[10px] gap-0.5">
            <Sparkles className="h-2.5 w-2.5" />
            {backendLabel(message.backend)}
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
                className="inline-flex max-w-full items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-left text-xs hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ArrowRight className="h-3 w-3 text-primary" />
                <span className="font-medium">{suggestion.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
