"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { defaultLocale, isLocale } from "@/i18n/routing";
import type { ConsultLocale, ConsultMessage, ConsultMode } from "./types";

export function useConsultChat() {
  const activeLocale = useLocale();
  const locale: ConsultLocale = isLocale(activeLocale) ? activeLocale : defaultLocale;
  const [mode, setMode] = useState<ConsultMode>("general");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ConsultMessage[]>([]);
  const [started, setStarted] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const userMsg = (text ?? input).trim();
    if (!userMsg || loading) return;

    setStarted(true);
    setInput("");
    setMessages((current) => [...current, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const history = messages.slice(-6).map((message) => ({
        role: message.role === "user" ? "user" : "assistant",
        content: message.text,
      }));

      const res = await fetch("/api/ai/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMsg, lang: locale, history, mode }),
      });

      if (!res.ok) throw new Error("API failed");

      const data = await res.json();
      setMessages((current) => [
        ...current,
        {
          role: "ai",
          text: data.answer,
          disclaimer: data.disclaimer,
          retrievedDocs: data.retrievedDocs,
          retrieval: data.retrieval,
          searchMeta: data.searchMeta,
          suggestedFollowups: data.suggestedFollowups,
          needsHumanExpert: data.needsHumanExpert,
          backend: data.backend,
        },
      ]);
    } catch (error) {
      console.error("[consult]", error);
      setMessages((current) => [
        ...current,
        {
          role: "ai",
          text:
            locale === "ko"
              ? "일시적 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
              : "Temporary error. Please retry.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setMessages([]);
    setStarted(false);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return {
    endRef,
    input,
    inputRef,
    loading,
    locale,
    messages,
    mode,
    reset,
    send,
    setInput,
    setMode,
    started,
  };
}
