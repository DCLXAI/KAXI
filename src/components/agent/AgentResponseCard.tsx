"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Brain, CheckCircle2, Database, LogIn, ShieldAlert, Sparkles, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { localePath } from "@/i18n/routing";

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
        {message.needsHumanExpert && (
          <Badge variant="destructive" className="text-[10px] gap-0.5">
            <ShieldAlert className="h-2.5 w-2.5" />
            {locale === "ko" ? "전문가 상담 필요" : "Expert needed"}
          </Badge>
        )}
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

      {message.needsHumanExpert && message.escalationCaseCreated && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <span>
              {locale === "ko"
                ? "행정사가 검토합니다. 케이스가 접수되어 마이페이지에서 진행 상황을 확인할 수 있어요."
                : locale === "vi"
                  ? "Chuyên gia hành chính sẽ xem xét. Hồ sơ đã được tiếp nhận, bạn có thể theo dõi tiến độ tại trang cá nhân."
                  : locale === "mn"
                    ? "Мэргэжилтэн шалгах болно. Кейс бүртгэгдсэн тул хувийн хуудаснаас явцыг харах боломжтой."
                    : "An administrative scrivener will review this. The case has been filed — you can track progress in My Page."}
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" asChild>
              <Link href="/student">
                {locale === "ko" ? "마이페이지에서 보기" : locale === "vi" ? "Xem tại trang cá nhân" : locale === "mn" ? "Хувийн хуудаснаас харах" : "View in My Page"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href={`${localePath(locale, "/partners")}?type=admin&question=${encodeURIComponent(originalRequest || "")}`}>
                {locale === "ko" ? "전문가 상담 요청" : locale === "vi" ? "Yêu cầu chuyên gia" : locale === "mn" ? "Мэргэжилтэн хүсэх" : "Request an expert"}
              </Link>
            </Button>
          </div>
        </div>
      )}

      {message.needsHumanExpert && !message.escalationCaseCreated && (
        <div className="mt-4 space-y-3 border-t pt-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {locale === "ko" ? "개인정보 동의 후 검증된 파트너에게 상담을 요청할 수 있습니다." : locale === "vi" ? "Bạn có thể đồng ý và gửi yêu cầu tới đối tác đã xác minh." : locale === "mn" ? "Зөвшөөрөл өгсний дараа баталгаажсан түншээс зөвлөгөө хүсэж болно." : "After consent, you can send this to a verified partner."}
            </p>
            <Button size="sm" asChild>
              <Link href={`${localePath(locale, "/partners")}?type=admin&question=${encodeURIComponent(originalRequest || "")}`}>
                {locale === "ko" ? "전문가 상담 요청" : locale === "vi" ? "Yêu cầu chuyên gia" : locale === "mn" ? "Мэргэжилтэн хүсэх" : "Request an expert"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <LogIn className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                {locale === "ko"
                  ? "로그인하면 행정사 검토 케이스가 자동 접수됩니다."
                  : locale === "vi"
                    ? "Đăng nhập để hồ sơ được tự động chuyển cho chuyên gia hành chính xem xét."
                    : locale === "mn"
                      ? "Нэвтэрвэл мэргэжилтний шалгах кейс автоматаар бүртгэгдэнэ."
                      : "Log in to automatically file this case for administrative scrivener review."}
              </span>
            </p>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/login?lang=${locale}`}>
                {locale === "ko" ? "로그인" : locale === "vi" ? "Đăng nhập" : locale === "mn" ? "Нэвтрэх" : "Log in"}
              </Link>
            </Button>
          </div>
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
