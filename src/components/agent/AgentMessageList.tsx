"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { AgentToolSteps } from "./AgentToolSteps";
import { AgentResponseCard } from "./AgentResponseCard";
import type { AgentLocale, AgentMessage, ClarifyDraft } from "./types";

interface AgentMessageListProps {
  compact?: boolean;
  clarifyDrafts: Record<number, ClarifyDraft>;
  endRef: React.RefObject<HTMLDivElement | null>;
  loading: boolean;
  locale: AgentLocale;
  messages: AgentMessage[];
  onDraftChange: (messageIndex: number, patch: Partial<ClarifyDraft>) => void;
  onSend: (text: string) => void;
  onSendDraft: (messageIndex: number, originalRequest: string) => void;
}

function originalRequestFor(messages: AgentMessage[], messageIndex: number): string {
  return messages
    .slice(0, messageIndex)
    .reverse()
    .find((item) => item.role === "user")?.text || "";
}

export function AgentMessageList({
  compact = false,
  clarifyDrafts,
  endRef,
  loading,
  locale,
  messages,
  onDraftChange,
  onSend,
  onSendDraft,
}: AgentMessageListProps) {
  return (
    <div className={compact ? "space-y-6 mb-4" : "space-y-6 mb-32"} aria-live="polite">
      {messages.map((message, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
        >
          <div className={`max-w-[95%] ${message.role === "user" ? "" : "w-full"}`}>
            {message.role === "user" ? (
              <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5 text-sm">
                {message.text}
              </div>
            ) : (
              <div className="space-y-3">
                {message.steps && (
                  <AgentToolSteps iterations={message.iterations} locale={locale} steps={message.steps} />
                )}
                <AgentResponseCard
                  clarifyDraft={clarifyDrafts[index]}
                  loading={loading}
                  locale={locale}
                  message={message}
                  messageIndex={index}
                  originalRequest={originalRequestFor(messages, index)}
                  onDraftChange={onDraftChange}
                  onSend={onSend}
                  onSendDraft={onSendDraft}
                />
              </div>
            )}
          </div>
        </motion.div>
      ))}

      {loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
          <div className="bg-card border rounded-2xl rounded-bl-md p-4 max-w-[95%] w-full">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{locale === "ko" ? "요청을 확인하고 있어요..." : locale === "vi" ? "Đang kiểm tra yêu cầu..." : locale === "mn" ? "Хүсэлтийг шалгаж байна..." : "Checking your request..."}</span>
            </div>
            <div className="text-xs text-muted-foreground pl-6">
              {locale === "ko" ? "필요한 도구와 공식 문서를 자동으로 선택합니다" : locale === "vi" ? "Tự chọn công cụ và nguồn chính thức phù hợp" : locale === "mn" ? "Тохирох хэрэгсэл, албан эх сурвалжийг автоматаар сонгоно" : "Selecting the right tools and official sources"}
            </div>
          </div>
        </motion.div>
      )}
      <div ref={endRef} className={compact ? "h-4" : "h-44"} />
    </div>
  );
}
