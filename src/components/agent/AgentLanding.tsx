"use client";

import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUp, Brain, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { KaxiPawMark } from "@/components/brand/KaxiPawMark";
import {
  EXAMPLE_PROMPTS,
  FALLBACK_TOOL_ICON,
  statusDotClass,
  statusText,
  TOOL_ICONS,
  TOOL_LABELS,
} from "./agent-config";
import type { AgentLocale, AgentStatus } from "./types";

interface AgentLandingProps {
  agentStatus: AgentStatus | null;
  input: string;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  loading: boolean;
  locale: AgentLocale;
  embedded?: boolean;
  onInputChange: (value: string) => void;
  onSend: (text?: string) => void;
}

export function AgentLanding({
  agentStatus,
  input,
  inputRef,
  loading,
  locale,
  embedded = false,
  onInputChange,
  onSend,
}: AgentLandingProps) {
  const t = useTranslations();
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={embedded ? "w-full" : "min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-12"}>
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(10px)" }}
        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, transform: "translateY(0px)" }}
        transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-3xl"
      >
        <div className={embedded ? "text-center mb-5" : "text-center mb-10"}>
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-primary-strong/10 text-primary-strong text-xs font-medium">
            <KaxiPawMark className="h-3.5 w-3.5" />
            {locale === "ko" ? "KAXI AI · 실행과 상담을 한곳에서" : locale === "vi" ? "KAXI AI · Thực hiện và tư vấn" : locale === "mn" ? "KAXI AI · Гүйцэтгэл ба зөвлөгөө" : "KAXI AI · Actions and guidance"}
            <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass(agentStatus)}`} />
            {statusText(locale, agentStatus)}
          </div>
          {!embedded && (
            <>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight italic mb-3" style={{ fontFamily: "Georgia, serif" }}>
                {locale === "ko" ? "한국 유학, KAXI AI에게 물어보세요" : locale === "vi" ? "Hỏi KAXI AI về du học Hàn Quốc" : locale === "mn" ? "Солонгост сурах тухай KAXI AI-аас асуугаарай" : "Ask KAXI AI about studying in Korea"}
              </h1>
              <p className="text-muted-foreground text-base md:text-lg">
                {locale === "ko"
                  ? "학교 검색과 비용 계산은 직접 실행하고, 비자·체류 질문은 공식 문서를 근거로 안전하게 답합니다."
                  : locale === "vi"
                    ? "Tự thực hiện tìm trường và tính chi phí; trả lời visa bằng nguồn chính thức."
                    : locale === "mn"
                      ? "Сургууль, зардлын ажлыг гүйцэтгэж, визийн асуултад албан эх сурвалжаар хариулна."
                      : "Runs school and cost tasks, then answers visa questions from official sources."}
              </p>
            </>
          )}
        </div>

        {!embedded && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-8">
            {Object.entries(TOOL_LABELS).map(([key, labels]) => {
              const Icon = TOOL_ICONS[key] || FALLBACK_TOOL_ICON;
              return (
                <div key={key} className="flex flex-col items-center gap-1 p-2 rounded-lg border bg-card">
                  <Icon className="h-4 w-4 text-icon-accent" />
                  <span className="text-[10px] text-center text-muted-foreground">{labels[locale]}</span>
                </div>
              );
            })}
          </div>
        )}

        <Card className="p-4 shadow-lg border-2 focus-within:border-primary-strong/50 transition-colors">
          <Textarea
            ref={inputRef}
            aria-label={locale === "ko" ? "KAXI AI에 질문하기" : locale === "vi" ? "Hỏi KAXI AI" : locale === "mn" ? "KAXI AI-аас асуух" : "Ask KAXI AI"}
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
            placeholder={locale === "ko" ? "원하는 것을 자연스럽게 적어보세요... (예: 서울 인증대학 어학당 찾아주고 비용 계산해줘)" : "Type what you need..."}
            className="border-0 resize-none focus-visible:ring-0 text-base min-h-[80px]"
            rows={3}
          />
          <div className="flex items-center justify-between mt-2 pt-2 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Brain className="h-3 w-3" />
              <span>{locale === "ko" ? "도구 실행 · 공식 문서 RAG · 위험 신호 감지" : "Tools · Official-source RAG · Safety routing"}</span>
            </div>
            <Button size="sm" onClick={() => onSend()} disabled={!input.trim() || loading} className="gap-1.5">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUp className="h-3.5 w-3.5" />}
            {locale === "ko" ? "보내기" : t("ai_send")}
            </Button>
          </div>
        </Card>

        <div className={embedded ? "mt-4" : "mt-8"}>
          <div className="text-xs text-muted-foreground text-center mb-3">
            {locale === "ko" ? "이렇게 물어보세요" : "Try asking"}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {EXAMPLE_PROMPTS[locale].map((prompt) => (
              <button
                key={prompt}
                onClick={() => onSend(prompt)}
                className="text-left text-sm p-3 rounded-lg border border-icon-accent/55 bg-card hover:bg-muted/50 hover:border-icon-accent transition-all flex items-start gap-2"
              >
                <ArrowRight className="h-3.5 w-3.5 text-icon-accent shrink-0 mt-0.5" />
                <span className="flex-1">{prompt}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
