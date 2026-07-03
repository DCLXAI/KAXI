"use client";

import { useState, useRef, useEffect } from "react";
import { useLangStore } from "@/store/kbridge";
import { tr, type Lang } from "@/lib/i18n/translations";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MessageResponse } from "@/components/ai-elements/message";
import { SourceAnnotations, type SourceAnnotation } from "@/components/kbridge/SourceAnnotations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  ArrowUp,
  Loader2,
  Scale,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Msg {
  role: "user" | "ai";
  text: string;
  disclaimer?: string;
  retrievedDocs?: RetrievedDoc[];
  suggestedFollowups?: string[];
  needsHumanExpert?: boolean;
  backend?: string;
  codexMode?: string;
}

interface RetrievedDoc {
  id: string;
  title: string;
  category: string;
  source: string;
  excerpt?: string;
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

type ConsultMode = "general" | "visa" | "documents" | "appeal" | "business";

const MODE_LABELS: Record<ConsultMode, Record<Lang, string>> = {
  general: { ko: "종합 상담", vi: "Tổng hợp", mn: "Ерөнхий", en: "General" },
  visa: { ko: "비자·체류", vi: "Visa/Lưu trú", mn: "Виз/Байршил", en: "Visa/Stay" },
  documents: { ko: "서류·증빙", vi: "Hồ sơ", mn: "Баримт", en: "Documents" },
  appeal: { ko: "거절 대응", vi: "Kháng từ chối", mn: "Татгалзлын эсрэг", en: "Appeal" },
  business: { ko: "유학원 운영", vi: "Vận hành", mn: "Үйл ажиллагаа", en: "Business" },
};

const QUICK_QUESTIONS: Record<Lang, { q: string; mode: ConsultMode }[]> = {
  ko: [
    { q: "D-2 비자 거절당했는데 어떻게 해야 하나요?", mode: "appeal" },
    { q: "D-4에서 D-2로 체류자격 변경하는 절차는?", mode: "visa" },
    { q: "재정증빙 얼마 필요하고 어떤 서류인가요?", mode: "documents" },
    { q: "허위 잔고증명 쓰면 어떤 처벌 받나요?", mode: "documents" },
    { q: "결핵진단서 지정 병원 어디서 어떻게 받나요?", mode: "documents" },
    { q: "유학원 등록 없이 유학 컨설팅 해도 되나요?", mode: "business" },
  ],
  vi: [
    { q: "Bị từ chối visa D-2 thì phải làm sao?", mode: "appeal" },
    { q: "Thủ tục chuyển D-4 sang D-2?", mode: "visa" },
    { q: "Chứng minh tài chính bao nhiêu, giấy gì?", mode: "documents" },
    { q: "Dùng sổ tiết kiệm giả bị phạt gì?", mode: "documents" },
    { q: "Giấy khám LAO ở đâu, làm sao?", mode: "documents" },
    { q: "Tư vấn du học có cần đăng ký không?", mode: "business" },
  ],
  mn: [
    { q: "D-2 виз татгалзсан бол яах вэ?", mode: "appeal" },
    { q: "D-4-өөс D-2 болох шатлал?", mode: "visa" },
    { q: "Санхүүгийн баталгаа хэд, ямар баримт?", mode: "documents" },
    { q: "Хуурамч банкны баримт ашигласан шийтгэл?", mode: "documents" },
    { q: "Сүрьеэний үзлэг хаана, яаж?", mode: "documents" },
    { q: "Зөвлөгөө өгөхөд бүртгэл хэрэгтэй юу?", mode: "business" },
  ],
  en: [
    { q: "I was refused D-2 visa, what should I do?", mode: "appeal" },
    { q: "How to change D-4 to D-2 status?", mode: "visa" },
    { q: "How much financial proof, what documents?", mode: "documents" },
    { q: "What's the penalty for fake bank statements?", mode: "documents" },
    { q: "Where and how to get TB test?", mode: "documents" },
    { q: "Do I need registration to consult students?", mode: "business" },
  ],
};

export function Consult() {
  const { lang } = useLangStore();
  const [mode, setMode] = useState<ConsultMode>("general");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [started, setStarted] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, loading]);

  const send = async (text?: string) => {
    const userMsg = (text ?? input).trim();
    if (!userMsg || loading) return;

    setStarted(true);
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const history = msgs.slice(-6).map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const res = await fetch("/api/ai/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMsg, lang, history, mode }),
      });

      if (!res.ok) throw new Error("API failed");

      const data = await res.json();
      setMsgs((m) => [
        ...m,
        {
          role: "ai",
          text: data.answer,
          disclaimer: data.disclaimer,
          retrievedDocs: data.retrievedDocs,
          suggestedFollowups: data.suggestedFollowups,
          needsHumanExpert: data.needsHumanExpert,
          backend: data.backend,
          codexMode: data.codexMode,
        },
      ]);
    } catch (e) {
      console.error("[consult]", e);
      setMsgs((m) => [
        ...m,
        {
          role: "ai",
          text:
            lang === "ko"
              ? "일시적 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
              : "Temporary error. Please retry.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setMsgs([]);
    setStarted(false);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Z.ai 스타일 — 시작 전 중앙 정렬 화면
  if (!started) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-3xl"
        >
          {/* 헤더 */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <Scale className="h-3.5 w-3.5" />
              {lang === "ko" ? "행정사 AI 에이전트" : lang === "vi" ? "AI luật sư hành chính" : lang === "mn" ? "Зөвлөгөөний AI" : "Admin Lawyer AI"}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight italic mb-3" style={{ fontFamily: "Georgia, serif" }}>
              {lang === "ko" ? "유학 비자·체류, 무엇이든 물어보세요" : lang === "vi" ? "Hỏi bất cứ điều gì về visa du học" : lang === "mn" ? "Виз, байршил талаар асуугаарай" : "Ask anything about study visa & stay"}
            </h1>
            <p className="text-muted-foreground text-base md:text-lg">
              {lang === "ko"
                ? "공식 문서 기반 RAG · 법적 경계 명확화 · 위험 신호 자동 감지"
                : lang === "vi"
                ? "RAG dựa trên tài liệu chính thức · ranh giới pháp lý rõ ràng"
                : lang === "mn"
                ? "Албан баримтад үндэслэсэн · хуулийн хязгаар тодорхой"
                : "Official-doc RAG · clear legal boundaries · auto risk detection"}
            </p>
          </div>

          {/* 모드 선택 */}
          <div className="flex justify-center mb-6">
            <Select value={mode} onValueChange={(v) => setMode(v as ConsultMode)}>
              <SelectTrigger className="w-[200px]">
                <Scale className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(MODE_LABELS) as ConsultMode[]).map((m) => (
                  <SelectItem key={m} value={m}>
                    {MODE_LABELS[m][lang]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 입력 박스 (Z.ai 스타일) */}
          <Card className="p-4 shadow-lg border-2 focus-within:border-primary/50 transition-colors">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={lang === "ko" ? "질문을 입력하세요... (예: D-2 비자 서류가 뭐야?)" : lang === "vi" ? "Nhập câu hỏi..." : lang === "mn" ? "Асуултаа оруулна уу..." : "Type your question..."}
              className="border-0 resize-none focus-visible:ring-0 text-base min-h-[80px]"
              rows={3}
            />
            <div className="flex items-center justify-between mt-2 pt-2 border-t">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                <span>Deep Think · RAG · {MODE_LABELS[mode][lang]}</span>
              </div>
              <Button
                size="sm"
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="gap-1.5"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUp className="h-3.5 w-3.5" />}
                {lang === "ko" ? "전송" : "Send"}
              </Button>
            </div>
          </Card>

          {/* 빠른 질문 */}
          <div className="mt-8">
            <div className="text-xs text-muted-foreground text-center mb-3">
              {lang === "ko" ? "💡 자주 묻는 질문" : lang === "vi" ? "💡 Câu hỏi phổ biến" : lang === "mn" ? "💡 Түгээмэл асуулт" : "💡 Popular questions"}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {QUICK_QUESTIONS[lang].map((qq, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setMode(qq.mode);
                    send(qq.q);
                  }}
                  className="text-left text-sm p-3 rounded-lg border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all"
                >
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">
                      {MODE_LABELS[qq.mode][lang]}
                    </Badge>
                    <span className="flex-1">{qq.q}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 법적 고지 */}
          <div className="mt-8 text-center text-xs text-muted-foreground max-w-2xl mx-auto">
            <AlertCircle className="h-3 w-3 inline mr-1" />
            {lang === "ko"
              ? "본 AI는 공식 정보 기반 일반 안내만 제공합니다. 개별 사례의 비자 판단·서류 작성·제출 대행은 행정사 영역입니다."
              : lang === "vi"
              ? "AI chỉ cung cấp thông tin chung. Quyết định cá nhân cần luật sư."
              : lang === "mn"
              ? "AI ерөнхий мэдээлэл өгнө. Тусгай шийдвэр → зөвлөгөө."
              : "AI provides general info only. Individual decisions need admin lawyer."}
          </div>
        </motion.div>
      </div>
    );
  }

  // 채팅 진행 중 — 대화형 UI
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Scale className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-sm">
              {lang === "ko" ? "행정사 AI 에이전트" : "Admin Lawyer AI"}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              {MODE_LABELS[mode][lang]} · {lang === "ko" ? "온라인" : "online"}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          {lang === "ko" ? "새 대화" : lang === "vi" ? "Mới" : lang === "mn" ? "Шинэ" : "New"}
        </Button>
      </div>

      {/* 메시지 영역 */}
      <div className="space-y-6 mb-32">
        {msgs.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div className={`max-w-[90%] ${m.role === "user" ? "" : "w-full"}`}>
              {m.role === "user" ? (
                <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5 text-sm">
                  {m.text}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* AI 답변 */}
                  <div className="bg-card border rounded-2xl rounded-bl-md p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10">
                        <Scale className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">
                        {lang === "ko" ? "행정사 AI" : "Admin AI"}
                      </span>
                      {m.needsHumanExpert && (
                        <Badge variant="destructive" className="text-[10px] gap-0.5">
                          <ShieldAlert className="h-2.5 w-2.5" />
                          {lang === "ko" ? "전문가 상담 필요" : "Expert needed"}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm leading-relaxed">
                      <MessageResponse>{m.text}</MessageResponse>
                    </div>

                    <SourceAnnotations
                      sources={m.retrievedDocs?.map((doc): SourceAnnotation => ({
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
                        excerpt: doc.excerpt,
                      }))}
                      lang={lang}
                      max={4}
                    />
                  </div>

                  {/* 면책 고지 */}
                  {m.disclaimer && (
                    <div className="ml-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 flex items-start gap-1.5">
                      <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                      <span>{m.disclaimer}</span>
                    </div>
                  )}

                  {/* 제안 후속 질문 */}
                  {m.suggestedFollowups && m.suggestedFollowups.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 ml-2">
                      {m.suggestedFollowups.map((f, j) => (
                        <button
                          key={j}
                          onClick={() => send(f)}
                          disabled={loading}
                          className="text-xs rounded-full border bg-background px-2.5 py-1 hover:bg-muted transition-colors disabled:opacity-50"
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {/* 로딩 */}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="bg-card border rounded-2xl rounded-bl-md p-4 max-w-[90%]">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {lang === "ko" ? "공식 문서 검색 및 분석 중..." : lang === "vi" ? "Đang tìm tài liệu..." : lang === "mn" ? "Баримт хайж байна..." : "Searching documents..."}
                </span>
              </div>
            </div>
          </motion.div>
        )}
        <div ref={endRef} />
      </div>

      {/* 입력 영역 (하단 고정) */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-6 pb-4">
        <div className="mx-auto max-w-3xl px-4">
          <Card className="p-3 shadow-lg border-2 focus-within:border-primary/50 transition-colors">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={lang === "ko" ? "추가 질문을 입력하세요..." : "Type follow-up..."}
              className="border-0 resize-none focus-visible:ring-0 text-sm min-h-[40px] max-h-[120px]"
              rows={1}
              disabled={loading}
            />
            <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t">
              <div className="flex items-center gap-2">
                <Select value={mode} onValueChange={(v) => setMode(v as ConsultMode)}>
                  <SelectTrigger size="sm" className="h-7 w-[130px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(MODE_LABELS) as ConsultMode[]).map((m) => (
                      <SelectItem key={m} value={m} className="text-xs">
                        {MODE_LABELS[m][lang]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="gap-1.5 h-7"
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowUp className="h-3 w-3" />}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
