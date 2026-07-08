"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, ArrowUp, Loader2, Scale, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MODE_LABELS, QUICK_QUESTIONS } from "./consult-config";
import type { ConsultLocale, ConsultMode } from "./types";

interface ConsultLandingProps {
  input: string;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  loading: boolean;
  locale: ConsultLocale;
  mode: ConsultMode;
  onInputChange: (value: string) => void;
  onModeChange: (value: ConsultMode) => void;
  onSend: (text?: string) => void;
}

export function ConsultLanding({
  input,
  inputRef,
  loading,
  locale,
  mode,
  onInputChange,
  onModeChange,
  onSend,
}: ConsultLandingProps) {
  const t = useTranslations();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-3xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Scale className="h-3.5 w-3.5" />
            {locale === "ko" ? "행정사 AI 에이전트" : locale === "vi" ? "AI luật sư hành chính" : locale === "mn" ? "Зөвлөгөөний AI" : "Admin Lawyer AI"}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight italic mb-3" style={{ fontFamily: "Georgia, serif" }}>
            {locale === "ko" ? "유학 비자·체류, 무엇이든 물어보세요" : locale === "vi" ? "Hỏi bất cứ điều gì về visa du học" : locale === "mn" ? "Виз, байршил талаар асуугаарай" : "Ask anything about study visa & stay"}
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">
            {locale === "ko"
              ? "공식 문서 기반 RAG · 법적 경계 명확화 · 위험 신호 자동 감지"
              : locale === "vi"
                ? "RAG dựa trên tài liệu chính thức · ranh giới pháp lý rõ ràng"
                : locale === "mn"
                  ? "Албан баримтад үндэслэсэн · хуулийн хязгаар тодорхой"
                  : "Official-doc RAG · clear legal boundaries · auto risk detection"}
          </p>
        </div>

        <div className="flex justify-center mb-6">
          <Select value={mode} onValueChange={(value) => onModeChange(value as ConsultMode)}>
            <SelectTrigger className="w-[200px]">
              <Scale className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(MODE_LABELS) as ConsultMode[]).map((item) => (
                <SelectItem key={item} value={item}>
                  {MODE_LABELS[item][locale]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card className="p-4 shadow-lg border-2 focus-within:border-primary/50 transition-colors">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
            placeholder={locale === "ko" ? "질문을 입력하세요... (예: D-2 비자 서류가 뭐야?)" : locale === "vi" ? "Nhập câu hỏi..." : locale === "mn" ? "Асуултаа оруулна уу..." : "Type your question..."}
            className="border-0 resize-none focus-visible:ring-0 text-base min-h-[80px]"
            rows={3}
          />
          <div className="flex items-center justify-between mt-2 pt-2 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              <span>Deep Think · RAG · {MODE_LABELS[mode][locale]}</span>
            </div>
            <Button size="sm" onClick={() => onSend()} disabled={!input.trim() || loading} className="gap-1.5">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUp className="h-3.5 w-3.5" />}
              {locale === "ko" ? "전송" : t("ai_send")}
            </Button>
          </div>
        </Card>

        <div className="mt-8">
          <div className="text-xs text-muted-foreground text-center mb-3">
            {locale === "ko" ? "💡 자주 묻는 질문" : locale === "vi" ? "💡 Câu hỏi phổ biến" : locale === "mn" ? "💡 Түгээмэл асуулт" : "💡 Popular questions"}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {QUICK_QUESTIONS[locale].map((question) => (
              <button
                key={question.q}
                onClick={() => {
                  onModeChange(question.mode);
                  onSend(question.q);
                }}
                className="text-left text-sm p-3 rounded-lg border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all"
              >
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">
                    {MODE_LABELS[question.mode][locale]}
                  </Badge>
                  <span className="flex-1">{question.q}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-muted-foreground max-w-2xl mx-auto">
          <AlertCircle className="h-3 w-3 inline mr-1" />
          {locale === "ko"
            ? "본 AI는 공식 정보 기반 일반 안내만 제공합니다. 개별 사례의 비자 판단·서류 작성·제출 대행은 행정사 영역입니다."
            : locale === "vi"
              ? "AI chỉ cung cấp thông tin chung. Quyết định cá nhân cần luật sư."
              : locale === "mn"
                ? "AI ерөнхий мэдээлэл өгнө. Тусгай шийдвэр → зөвлөгөө."
                : "AI provides general info only. Individual decisions need admin lawyer."}
        </div>
      </motion.div>
    </div>
  );
}
