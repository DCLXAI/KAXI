"use client";

import { motion } from "framer-motion";
import { AgentToolSteps } from "./AgentToolSteps";
import { AgentProgressCard } from "./AgentProgressCard";
import { AgentResponseCard } from "./AgentResponseCard";
import type { AgentLocale, AgentMessage, AgentProgress, ClarifyDraft } from "./types";

interface AgentMessageListProps {
  compact?: boolean;
  clarifyDrafts: Record<number, ClarifyDraft>;
  endRef: React.RefObject<HTMLDivElement | null>;
  loading: boolean;
  locale: AgentLocale;
  messages: AgentMessage[];
  progress: AgentProgress | null;
  onDraftChange: (messageIndex: number, patch: Partial<ClarifyDraft>) => void;
  onRetry: (messageIndex: number) => void;
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
  progress,
  onDraftChange,
  onRetry,
  onSend,
  onSendDraft,
}: AgentMessageListProps) {
  const hasStreamingAnswer = messages.some((message) => message.state === "streaming");

  return (
    <div className={compact ? "space-y-6 mb-4" : "space-y-6 mb-32"} aria-live="polite">
      {messages.map((message, index) => (
        <motion.div
          key={message.requestId || index}
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
                  onRetry={onRetry}
                  onSend={onSend}
                  onSendDraft={onSendDraft}
                />
              </div>
            )}
          </div>
        </motion.div>
      ))}

      {loading && !hasStreamingAnswer && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
          <AgentProgressCard locale={locale} progress={progress} />
        </motion.div>
      )}
      <div ref={endRef} className={compact ? "h-4" : "h-44"} />
    </div>
  );
}
