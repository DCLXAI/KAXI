"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { defaultLocale, isLocale } from "@/i18n/routing";
import {
  buildClarifyPrompt,
  cloneEmptyClarifyDraft,
} from "./agent-config";
import type { AgentLocale, AgentMessage, AgentStatus, ClarifyDraft } from "./types";

async function fetchAgent(payload: unknown): Promise<Response> {
  return fetch("/api/ai/unified", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function useAgentChat() {
  const activeLocale = useLocale();
  const locale: AgentLocale = isLocale(activeLocale) ? activeLocale : defaultLocale;
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [started, setStarted] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [clarifyDrafts, setClarifyDrafts] = useState<Record<number, ClarifyDraft>>({});
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    const timer = window.setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [messages, loading]);

  useEffect(() => {
    let alive = true;

    fetch("/api/ai/unified")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (alive && data) setAgentStatus(data);
      })
      .catch(() => undefined);

    return () => {
      alive = false;
    };
  }, []);

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
      const previousAgentMessage = messages.slice().reverse().find((message) => message.role === "agent");

      const res = await fetchAgent({
        question: userMsg,
        lang: locale,
        history,
        previousCapability: previousAgentMessage?.routing?.capability,
        previousExpertMode: previousAgentMessage?.expert?.mode,
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        const message =
          res.status === 401
            ? locale === "ko"
              ? "AI 에이전트는 관리자 로그인 후 사용할 수 있습니다."
              : "AI agent requires admin login."
            : errorBody.error || "API failed";
        throw new Error(message);
      }

      const data = await res.json();
      setMessages((current) => [
        ...current,
        {
          role: "agent",
          text: data.answer,
          steps: data.steps,
          toolResults: data.toolResults,
          iterations: data.iterations,
          backend: data.backend,
          durationMs: data.durationMs,
          grounded: Boolean(data.grounded),
          meta: data.meta,
          routing: data.routing,
          expert: data.expert,
        },
      ]);
    } catch (error) {
      console.error("[agent]", error);
      const message = error instanceof Error ? error.message : "";
      setMessages((current) => [
        ...current,
        {
          role: "agent",
          text: message || (locale === "ko" ? "일시적 오류가 발생했습니다." : "Temporary error."),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setMessages([]);
    setClarifyDrafts({});
    setStarted(false);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const updateClarifyDraft = (messageIndex: number, patch: Partial<ClarifyDraft>) => {
    setClarifyDrafts((current) => ({
      ...current,
      [messageIndex]: {
        ...(current[messageIndex] || cloneEmptyClarifyDraft()),
        ...patch,
      },
    }));
  };

  const sendClarifyDraft = (messageIndex: number, originalRequest: string) => {
    const draft = clarifyDrafts[messageIndex] || cloneEmptyClarifyDraft();
    const prompt = buildClarifyPrompt(locale, originalRequest, draft);
    if (!prompt) return;
    send(prompt);
  };

  return {
    agentStatus,
    clarifyDrafts,
    endRef,
    input,
    inputRef,
    loading,
    locale,
    messages,
    reset,
    send,
    sendClarifyDraft,
    setInput,
    started,
    updateClarifyDraft,
  };
}
