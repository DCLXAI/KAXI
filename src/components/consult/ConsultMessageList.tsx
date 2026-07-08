"use client";

import { motion } from "framer-motion";
import { AlertCircle, Loader2, Scale, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MessageResponse } from "@/components/ai-elements/message";
import {
  linkCitationMarkers,
  SourceAnnotations,
} from "@/components/kbridge/SourceAnnotations";
import type { ConsultLocale, ConsultMessage } from "./types";
import { sourceAnnotationsFromDocs } from "./types";

interface ConsultMessageListProps {
  endRef: React.RefObject<HTMLDivElement | null>;
  loading: boolean;
  locale: ConsultLocale;
  messages: ConsultMessage[];
  onSend: (text: string) => void;
}

export function ConsultMessageList({
  endRef,
  loading,
  locale,
  messages,
  onSend,
}: ConsultMessageListProps) {
  return (
    <div className="space-y-6 mb-32">
      {messages.map((message, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
        >
          <div className={`max-w-[90%] ${message.role === "user" ? "" : "w-full"}`}>
            {message.role === "user" ? (
              <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5 text-sm">
                {message.text}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-card border rounded-2xl rounded-bl-md p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10">
                      <Scale className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {locale === "ko" ? "행정사 AI" : "Admin AI"}
                    </span>
                    {message.needsHumanExpert && (
                      <Badge variant="destructive" className="text-[10px] gap-0.5">
                        <ShieldAlert className="h-2.5 w-2.5" />
                        {locale === "ko" ? "전문가 상담 필요" : "Expert needed"}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm leading-relaxed">
                    <MessageResponse>
                      {linkCitationMarkers(message.text, sourceAnnotationsFromDocs(message.retrievedDocs), `consult-message-${index}`, 4)}
                    </MessageResponse>
                  </div>

                  <SourceAnnotations
                    sources={sourceAnnotationsFromDocs(message.retrievedDocs)}
                    lang={locale}
                    max={4}
                    idPrefix={`consult-message-${index}`}
                  />
                </div>

                {message.disclaimer && (
                  <div className="ml-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 flex items-start gap-1.5">
                    <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                    <span>{message.disclaimer}</span>
                  </div>
                )}

                {message.suggestedFollowups && message.suggestedFollowups.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 ml-2">
                    {message.suggestedFollowups.map((followup) => (
                      <button
                        key={followup}
                        onClick={() => onSend(followup)}
                        disabled={loading}
                        className="text-xs rounded-full border bg-background px-2.5 py-1 hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        {followup}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      ))}

      {loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
          <div className="bg-card border rounded-2xl rounded-bl-md p-4 max-w-[90%]">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                {locale === "ko" ? "공식 문서 검색 및 분석 중..." : locale === "vi" ? "Đang tìm tài liệu..." : locale === "mn" ? "Баримт хайж байна..." : "Searching documents..."}
              </span>
            </div>
          </div>
        </motion.div>
      )}
      <div ref={endRef} />
    </div>
  );
}
