"use client";

import { open, setInputValue, submitInput } from "@typebot.io/react";
import { FormEvent, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp, MessageCircle } from "lucide-react";
import { trackProductEvent } from "@/lib/analytics/client";
import { productLocale } from "@/lib/analytics/events";
import { KaxiRunningCat } from "@/components/brand/KaxiRunningCat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const LOCALE_PREFIX_RE = /^\/(ko|en|vi|mn)(?=\/|$)/;

export function TypebotInline() {
  const pathname = usePathname();
  const locale = productLocale(pathname.match(LOCALE_PREFIX_RE)?.[1]);
  const [question, setQuestion] = useState("");
  const copy = {
    ko: {
      title: "KARXY에게 바로 물어보세요",
      description: "비자·체류, 학교, 비용과 준비 서류를 공식 근거로 확인해드려요.",
      placeholder: "예: D-4에서 D-2로 변경할 때 필요한 서류와 기간은?",
      send: "질문하기",
      examples: ["D-2 비자 준비 서류", "유학 비용 계산", "비자 변경 가능 여부"],
    },
    en: {
      title: "Ask KARXY now",
      description: "Get source-backed help with visas, schools, costs, and documents.",
      placeholder: "Example: What documents and timing apply when changing D-4 to D-2?",
      send: "Ask",
      examples: ["D-2 visa documents", "Estimate study costs", "Can I change my visa?"],
    },
    vi: {
      title: "Hỏi KARXY ngay",
      description: "Tra cứu visa, trường học, chi phí và hồ sơ dựa trên nguồn chính thức.",
      placeholder: "Ví dụ: Chuyển từ D-4 sang D-2 cần hồ sơ gì và mất bao lâu?",
      send: "Đặt câu hỏi",
      examples: ["Hồ sơ visa D-2", "Tính chi phí du học", "Có thể đổi visa không?"],
    },
    mn: {
      title: "KARXY-аас шууд асуугаарай",
      description: "Виз, сургууль, зардал, бичиг баримтыг албан эх сурвалжаар шалгана.",
      placeholder: "Жишээ: D-4-өөс D-2 руу шилжихэд ямар материал, хугацаа хэрэгтэй вэ?",
      send: "Асуух",
      examples: ["D-2 визийн материал", "Сургалтын зардал", "Виз сольж болох уу?"],
    },
  }[locale];

  const send = (event?: FormEvent, suggestedQuestion?: string) => {
    event?.preventDefault();
    const value = (suggestedQuestion || question).trim();
    if (!value) return;
    trackProductEvent("chatbot_opened", {
      locale,
      surface: "typebot_inline",
      path: pathname,
      properties: { entry: suggestedQuestion ? "suggestion" : "composer" },
    });
    open();
    window.setTimeout(() => setInputValue(value), 250);
    window.setTimeout(() => submitInput(), 450);
    setQuestion("");
  };

  return (
    <div data-chat-surface="typebot" className="w-full rounded-xl border border-primary/50 bg-card p-4 shadow-[0_16px_40px_-24px_rgba(79,93,179,0.45)] sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/45"><KaxiRunningCat size={32} /></div>
        <div className="min-w-0">
          <h2 className="font-serif text-lg font-semibold sm:text-xl">{copy.title}</h2>
          <p className="mt-0.5 text-sm leading-5 text-muted-foreground">{copy.description}</p>
        </div>
      </div>
      <form className="mt-5" onSubmit={(event) => send(event)}>
        <label htmlFor="karxy-home-chat-question" className="sr-only">{copy.title}</label>
        <div className="rounded-lg border border-input bg-background p-2 focus-within:border-primary-strong focus-within:ring-2 focus-within:ring-primary/30">
          <Textarea
            id="karxy-home-chat-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) send(event);
            }}
            placeholder={copy.placeholder}
            rows={3}
            className="min-h-20 resize-none border-0 bg-transparent px-2 py-1 text-sm shadow-none focus-visible:ring-0 sm:text-base"
          />
          <div className="flex justify-end border-t border-border/70 pt-2">
            <Button type="submit" size="sm" disabled={!question.trim()}><ArrowUp className="size-4" />{copy.send}</Button>
          </div>
        </div>
      </form>
      <div className="mt-3 flex flex-wrap gap-2" aria-label={copy.title}>
        {copy.examples.map((example) => (
          <Button key={example} type="button" variant="outline" size="sm" className="h-auto whitespace-normal text-left" onClick={() => send(undefined, example)}>
            <MessageCircle className="size-3.5 shrink-0" />{example}
          </Button>
        ))}
      </div>
    </div>
  );
}
