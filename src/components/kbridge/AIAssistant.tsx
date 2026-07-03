"use client";

import { useState, useRef, useEffect } from "react";
import { useLangStore } from "@/store/kbridge";
import { tr, type Lang } from "@/lib/i18n/translations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageResponse } from "@/components/ai-elements/message";
import {
  SourceAnnotations,
  linkCitationMarkers,
  type SourceAnnotation,
} from "@/components/kbridge/SourceAnnotations";
import { Bot, Send, X, Sparkles, AlertCircle, Loader2 } from "lucide-react";

interface Msg {
  role: "user" | "ai";
  text: string;
  source?: "rule" | "rag" | "hybrid";
  sourceNotice?: string;
  retrievedDocs?: RetrievedDoc[];
}

interface RetrievedDoc {
  id: string;
  title: string;
  source: string;
  category: string;
  excerpt?: string;
  basis?: string;
  sourceMeta?: {
    label?: string;
    url?: string;
    verifiedAt?: string;
    reviewAfter?: string;
    owner?: string;
    sourceType?: string;
    reviewStatus?: string;
    checkedBy?: string;
  };
  ragMeta?: {
    last_checked_at?: string;
    review_status?: string;
    checked_by?: string;
  };
}

function sourceAnnotationsFromDocs(docs?: RetrievedDoc[]): SourceAnnotation[] {
  return (docs || []).map((doc): SourceAnnotation => ({
    id: doc.id,
    title: doc.title,
    label: doc.sourceMeta?.label || doc.source,
    source: doc.source,
    url: doc.sourceMeta?.url || null,
    kind: doc.sourceMeta?.owner === "internal" ? "internal" : "knowledge",
    owner: doc.sourceMeta?.owner,
    verifiedAt: doc.sourceMeta?.verifiedAt || doc.ragMeta?.last_checked_at,
    reviewAfter: doc.sourceMeta?.reviewAfter,
    sourceType: doc.sourceMeta?.sourceType,
    reviewStatus: doc.sourceMeta?.reviewStatus || doc.ragMeta?.review_status,
    checkedBy: doc.sourceMeta?.checkedBy || doc.ragMeta?.checked_by,
    basis: doc.basis,
    excerpt: doc.excerpt,
  }));
}

function AIAssistantPanel({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const welcome: Msg = {
    role: "ai",
    text:
      lang === "ko"
        ? "안녕하세요! 유학 준비 내비게이터입니다. 공식 문서 기반으로 답변합니다. D-2/D-4, 비용, 서류, 결핵검사 등을 물어보세요."
        : lang === "vi"
        ? "Xin chào! Tôi là trợ lý du học. Trả lời dựa trên tài liệu chính thức. Hỏi về D-2/D-4, chi phí, hồ sơ."
        : lang === "mn"
        ? "Сайн байна уу! Би туслах. Албан ёсны баримтад үндэслэн хариулна. D-2/D-4, зардал, баримтаас асуу."
        : "Hi! I'm the study prep navigator. I answer based on official docs. Ask about D-2/D-4, cost, docs.",
  };
  const [msgs, setMsgs] = useState<Msg[]>([welcome]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  const send = async (text?: string) => {
    const userMsg = (text ?? input).trim();
    if (!userMsg || loading) return;

    setInput("");
    setMsgs((m) => [...m, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const history = msgs.slice(-6).map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMsg, lang, history }),
      });

      if (!res.ok) throw new Error("API failed");

      const data = await res.json();
      setMsgs((m) => [
        ...m,
        {
          role: "ai",
          text: data.answer,
          source: data.source,
          sourceNotice: data.sourceNotice,
          retrievedDocs: data.retrievedDocs,
        },
      ]);
    } catch (e) {
      console.error("[AI chat]", e);
      setMsgs((m) => [
        ...m,
        {
          role: "ai",
          text:
            lang === "ko"
              ? "일시적 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
              : lang === "vi"
              ? "Lỗi tạm thời. Thử lại sau."
              : lang === "mn"
              ? "Түр зуурын алдаа. Дараа дахин оролдоно уу."
              : "Temporary error. Please retry.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = [
    { ko: "D-2와 D-4 차이?", vi: "Khác D-2 vs D-4?", mn: "D-2 D-4 ялгаа?", en: "D-2 vs D-4?" },
    { ko: "비용 얼마?", vi: "Chi phí?", mn: "Зардал?", en: "Cost?" },
    { ko: "결핵진단서 필요?", vi: "Cần giấy LAO?", mn: "Сүрьеэ хэрэгтэй юу?", en: "TB test?" },
    { ko: "허위서류 위험?", vi: "Hồ sơ giả?", mn: "Хуурамч баримт?", en: "Fake docs?" },
  ];

  return (
    <>
      {/* 플로팅 버튼 */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 z-40 rounded-full h-14 w-14 shadow-lg p-0"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </Button>

      {/* 패널 */}
      {open && (
        <Card className="fixed bottom-24 right-6 z-40 w-[calc(100vw-3rem)] sm:w-96 max-h-[80vh] flex flex-col shadow-2xl">
          {/* 헤더 */}
          <div className="flex items-center gap-2 p-3 border-b">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm flex items-center gap-1.5">
                {tr("ai_assistant_title", lang)}
                <Badge variant="outline" className="text-[10px] py-0 h-4">RAG</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {loading ? "• 처리 중..." : "• 공식 문서 기반"}
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setOpen(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* 메시지 영역 */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[240px] max-h-[400px]">
            {msgs.map((m, i) => {
              const sources = sourceAnnotationsFromDocs(m.retrievedDocs);
              const citationPrefix = `floating-ai-message-${i}`;
              return (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-lg px-3 py-2 text-sm space-y-2 ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {m.role === "ai" ? (
                      <>
                        <div className="text-sm leading-relaxed">
                          <MessageResponse>
                            {linkCitationMarkers(m.text, sources, citationPrefix, 4)}
                          </MessageResponse>
                        </div>
                        {m.sourceNotice && !m.text.includes(m.sourceNotice) && (
                          <div className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1.5 text-[10px] leading-relaxed text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100">
                            {m.sourceNotice}
                          </div>
                        )}
                        <SourceAnnotations
                          sources={sources}
                          lang={lang}
                          max={4}
                          title={lang === "ko" ? "출처 및 답변 근거" : "Sources and basis"}
                          idPrefix={citationPrefix}
                        />
                      </>
                    ) : (
                      <div className="whitespace-pre-wrap">{m.text}</div>
                    )}

                    {/* 출처 배지 */}
                    {m.source && (
                      <div className="text-[10px] text-muted-foreground/60">
                        {m.source === "rule" ? "Rule-based" : "RAG+LLM"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2 text-sm">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="text-muted-foreground">
                    {lang === "ko" ? "공식 문서 검색 중..." : lang === "vi" ? "Đang tìm..." : lang === "mn" ? "Хайж байна..." : "Searching docs..."}
                  </span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* 빠른 질문 */}
          <div className="px-3 pb-2 flex flex-wrap gap-1">
            {quickQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => send(q[lang])}
                disabled={loading}
                className="text-xs rounded-full border bg-background px-2.5 py-1 hover:bg-muted transition-colors disabled:opacity-50"
              >
                {q[lang]}
              </button>
            ))}
          </div>

          {/* 입력 */}
          <div className="border-t p-2 flex gap-1">
            <Input
              placeholder={tr("ai_placeholder", lang)}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              disabled={loading}
              className="text-sm h-9"
            />
            <Button size="sm" className="h-9 px-3" onClick={() => send()} disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </Button>
          </div>

          {/* disclaimer */}
          <div className="px-3 pb-2 text-[10px] text-muted-foreground flex items-start gap-1">
            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
            <span>{tr("ai_disclaimer", lang)}</span>
          </div>
        </Card>
      )}
    </>
  );
}

export function AIAssistant() {
  const { lang } = useLangStore();
  return <AIAssistantPanel key={lang} lang={lang} />;
}
