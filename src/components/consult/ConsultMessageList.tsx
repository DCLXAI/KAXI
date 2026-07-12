"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { AlertCircle, ArrowRight, Database, Loader2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KaxiCat } from "@/components/brand/KaxiCat";
import { MessageResponse } from "@/components/ai-elements/message";
import {
  linkCitationMarkers,
  SourceAnnotations,
} from "@/components/kbridge/SourceAnnotations";
import type { ConsultLocale, ConsultMessage } from "./types";
import { sourceAnnotationsFromDocs } from "./types";
import { localePath } from "@/i18n/routing";

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
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="space-y-6 mb-32">
      {messages.map((message, index) => (
        <motion.div
          key={index}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(10px)" }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, transform: "translateY(0px)" }}
          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
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
                    <KaxiCat state="breath" size={24} inverted />
                    <span className="text-xs font-medium text-muted-foreground">
                      {locale === "ko" ? "행정사 AI" : "Admin AI"}
                    </span>
                    {message.needsHumanExpert && (
                      <Badge variant="destructive" className="text-[10px] gap-0.5">
                        <ShieldAlert className="h-2.5 w-2.5" />
                        {locale === "ko" ? "전문가 상담 필요" : "Expert needed"}
                      </Badge>
                    )}
                    {message.retrieval?.backend && (
                      <Badge variant={message.retrieval.pgvectorUsed ? "default" : "outline"} className="text-[10px] gap-0.5">
                        <Database className="h-2.5 w-2.5" />
                        {message.retrieval.backend}
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

                  {message.needsHumanExpert && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                      <p className="text-xs text-muted-foreground">
                        {locale === "ko" ? "개인정보 동의 후 검증된 파트너에게 상담을 요청할 수 있습니다." : locale === "vi" ? "Bạn có thể đồng ý và gửi yêu cầu tới đối tác đã xác minh." : locale === "mn" ? "Зөвшөөрөл өгсний дараа баталгаажсан түншээс зөвлөгөө хүсэж болно." : "After consent, you can send this to a verified partner."}
                      </p>
                      <Button size="sm" asChild>
                        <Link href={`${localePath(locale, "/partners")}?type=admin&question=${encodeURIComponent(message.consultationQuestion || "")}`}>
                          {locale === "ko" ? "전문가 상담 요청" : locale === "vi" ? "Yêu cầu chuyên gia" : locale === "mn" ? "Мэргэжилтэн хүсэх" : "Request an expert"}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>

                {message.disclaimer && (
                  <div className="ml-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 flex items-start gap-1.5 dark:text-amber-200 dark:bg-amber-950/30 dark:border-amber-900/60">
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          className="flex justify-start"
        >
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
