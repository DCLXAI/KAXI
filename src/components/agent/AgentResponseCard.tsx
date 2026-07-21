"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Database,
  LogIn,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Wrench,
  Zap,
} from "lucide-react";
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
  const needsHumanExpert = Boolean(message.needsHumanExpert || message.expert?.needsHumanExpert);

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
        {needsHumanExpert && (
          <Badge variant="destructive" className="text-[10px] gap-0.5">
            <ShieldAlert className="h-2.5 w-2.5" />
            {locale === "ko" ? "전문가 상담 필요" : "Expert needed"}
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
        {message.meta?.quality.answerSource === "official-summary" && (
          <Badge variant="secondary" className="text-[10px] gap-0.5">
            <ShieldAlert className="h-2.5 w-2.5" />
            {locale === "ko"
              ? "모델 미사용 · 문서 직접 요약"
              : locale === "vi"
                ? "Tóm tắt trực tiếp tài liệu"
                : locale === "mn"
                  ? "Баримтын шууд хураангуй"
                  : "Direct document summary"}
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

      {needsHumanExpert && message.escalationCaseCreated && (
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
              <Link href={localePath(locale, "/student")}>
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

      {needsHumanExpert && !message.escalationCaseCreated && (
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
              <Link href={localePath(locale, "/login")}>
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
