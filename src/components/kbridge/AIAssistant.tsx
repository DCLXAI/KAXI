"use client";

import { useState, useRef, useEffect } from "react";
import { useLangStore } from "@/store/kbridge";
import { tr, type Lang } from "@/lib/i18n/translations";
import { findFAQ, AI_DEFAULT_REPLY } from "@/lib/data/faq";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Bot, Send, X, Sparkles, AlertCircle } from "lucide-react";

interface Msg {
  role: "user" | "ai";
  text: string;
}

function AIAssistantPanel({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const welcome: Msg = {
    role: "ai",
    text:
      lang === "ko"
        ? "안녕하세요! 유학 준비 내비게이터입니다. D-2/D-4 차이, 비용, 서류, 일정에 대해 질문하세요."
        : lang === "vi"
        ? "Xin chào! Tôi là trợ lý du học. Hỏi về D-2/D-4, chi phí, hồ sơ."
        : lang === "mn"
        ? "Сайн байна уу! Би туслах. D-2/D-4, зардал, баримтаас асуу."
        : "Hi! I'm the study prep navigator. Ask about D-2/D-4, cost, docs, schedule.",
  };
  const [msgs, setMsgs] = useState<Msg[]>([welcome]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  const send = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMsgs((m) => [...m, { role: "user", text: userMsg }]);
    setInput("");

    setTimeout(() => {
      const faq = findFAQ(userMsg, lang);
      setMsgs((m) => [...m, { role: "ai", text: faq ? faq[lang] : AI_DEFAULT_REPLY[lang] }]);
    }, 400);
  };

  const quickQuestions = [
    { ko: "D-2와 D-4 차이?", vi: "Khác D-2 vs D-4?", mn: "D-2 D-4 ялгаа?", en: "D-2 vs D-4?" },
    { ko: "비용 얼마?", vi: "Chi phí?", mn: "Зардал?", en: "Cost?" },
    { ko: "결핵진단서 필요?", vi: "Cần giấy LAO?", mn: "Сүрьеэ хэрэгтэй юу?", en: "TB test?" },
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
        <Card className="fixed bottom-24 right-6 z-40 w-[calc(100vw-3rem)] sm:w-96 max-h-[70vh] flex flex-col shadow-2xl">
          {/* 헤더 */}
          <div className="flex items-center gap-2 p-3 border-b">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">{tr("ai_assistant_title", lang)}</div>
              <div className="text-xs text-muted-foreground">• {lang === "ko" ? "온라인" : "online"}</div>
            </div>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setOpen(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* 메시지 영역 */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px] max-h-[400px]">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* 빠른 질문 */}
          <div className="px-3 pb-2 flex flex-wrap gap-1">
            {quickQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => {
                  setInput(q[lang]);
                  setTimeout(() => {
                    // 자동 전송
                    const userMsg = q[lang];
                    setMsgs((m) => [...m, { role: "user", text: userMsg }]);
                    setInput("");
                    setTimeout(() => {
                      const faq = findFAQ(userMsg, lang);
                      setMsgs((m) => [...m, { role: "ai", text: faq ? faq[lang] : AI_DEFAULT_REPLY[lang] }]);
                    }, 400);
                  }, 50);
                }}
                className="text-xs rounded-full border bg-background px-2.5 py-1 hover:bg-muted transition-colors"
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
              className="text-sm h-9"
            />
            <Button size="sm" className="h-9 px-3" onClick={send}>
              <Send className="h-3.5 w-3.5" />
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
  // lang 변경시 패널을 리마운트하여 초기 메시지 갱신
  return <AIAssistantPanel key={lang} lang={lang} />;
}
