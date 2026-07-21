"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { defaultLocale, isLocale } from "@/i18n/routing";
import {
  AgentSessionResponseCache,
  agentResponseCacheKey,
  isCacheableAgentQuestion,
} from "@/lib/ai/agent-response-cache";
import {
  readUnifiedAiEventStream,
  UnifiedAiStreamError,
  type UnifiedAiStreamEvent,
} from "@/lib/ai/unified-stream";
import {
  buildClarifyPrompt,
  cloneEmptyClarifyDraft,
} from "./agent-config";
import type { AgentLocale, AgentMessage, AgentProgress, AgentStatus, ClarifyDraft } from "./types";

const CLIENT_STREAM_TIMEOUT_MS = 25_000;

async function fetchAgent(payload: unknown, signal: AbortSignal): Promise<Response> {
  return fetch("/api/ai/unified/stream", {
    method: "POST",
    headers: {
      Accept: "application/x-ndjson",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal,
  });
}

function agentMessageFromResponse(data: Record<string, unknown>, requestId: string): AgentMessage {
  return {
    role: "agent",
    requestId,
    state: "complete",
    text: typeof data.answer === "string" ? data.answer : "",
    steps: Array.isArray(data.steps) ? data.steps as AgentMessage["steps"] : undefined,
    toolResults: Array.isArray(data.toolResults) ? data.toolResults as AgentMessage["toolResults"] : undefined,
    iterations: typeof data.iterations === "number" ? data.iterations : undefined,
    backend: typeof data.backend === "string" ? data.backend : undefined,
    durationMs: typeof data.durationMs === "number" ? data.durationMs : undefined,
    grounded: Boolean(data.grounded),
    meta: data.meta && typeof data.meta === "object" ? data.meta as AgentMessage["meta"] : undefined,
    routing: data.routing && typeof data.routing === "object" ? data.routing as AgentMessage["routing"] : undefined,
    expert: data.expert && typeof data.expert === "object" ? data.expert as AgentMessage["expert"] : undefined,
    needsHumanExpert: data.needsHumanExpert === true,
    escalationCaseCreated: data.escalationCaseCreated === true,
  };
}

function buildRestoredUserMessage(question: string, index: number): AgentMessage {
  return {
    role: "user",
    text: question,
  };
}

function buildRestoredAssistantMessage(answer: string, index: number): AgentMessage {
  return {
    role: "agent",
    requestId: `restored-${index}`,
    state: "complete",
    text: answer,
    restored: true,
  };
}

function upsertAgentMessage(messages: AgentMessage[], requestId: string, next: AgentMessage): AgentMessage[] {
  const index = messages.findIndex((message) => message.requestId === requestId);
  if (index === -1) return [...messages, next];
  return messages.map((message, messageIndex) => messageIndex === index ? next : message);
}

function errorCopy(locale: AgentLocale, code: string, status: number): string {
  if (status === 401 || status === 403) {
    return locale === "ko"
      ? "AI 에이전트는 로그인 후 사용할 수 있습니다."
      : locale === "vi"
        ? "Bạn cần đăng nhập để sử dụng AI agent."
        : locale === "mn"
          ? "AI агентийг ашиглахын тулд нэвтэрнэ үү."
          : "Sign in to use the AI agent.";
  }
  if (code.includes("timeout") || code === "client_timeout") {
    return locale === "ko"
      ? "답변 시간이 길어져 요청을 안전하게 중단했습니다. 같은 질문으로 다시 시도할 수 있습니다."
      : locale === "vi"
        ? "Yêu cầu đã được dừng vì phản hồi mất quá nhiều thời gian. Bạn có thể thử lại cùng câu hỏi."
        : locale === "mn"
          ? "Хариу удааширсан тул хүсэлтийг аюулгүй зогсоолоо. Ижил асуултаар дахин оролдоно уу."
          : "The request was stopped because the response took too long. You can retry the same question.";
  }
  if (status === 429) {
    return locale === "ko"
      ? "요청이 잠시 몰렸습니다. 잠시 후 다시 시도해주세요."
      : locale === "vi"
        ? "Hiện có quá nhiều yêu cầu. Vui lòng thử lại sau ít phút."
        : locale === "mn"
          ? "Одоогоор хүсэлт их байна. Түр хүлээгээд дахин оролдоно уу."
          : "There are too many requests right now. Please retry shortly.";
  }
  return locale === "ko"
    ? "답변을 완료하지 못했습니다. 질문은 그대로 두고 다시 시도할 수 있습니다."
    : locale === "vi"
      ? "Không thể hoàn tất câu trả lời. Bạn có thể thử lại mà không cần nhập lại câu hỏi."
      : locale === "mn"
        ? "Хариуг дуусгаж чадсангүй. Асуултаа дахин бичихгүйгээр оролдоно уу."
        : "The answer could not be completed. You can retry without retyping the question.";
}

export function useAgentChat() {
  const activeLocale = useLocale();
  const locale: AgentLocale = isLocale(activeLocale) ? activeLocale : defaultLocale;
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [started, setStarted] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [progress, setProgress] = useState<AgentProgress | null>(null);
  const [clarifyDrafts, setClarifyDrafts] = useState<Record<number, ClarifyDraft>>({});
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const activeRequestIdRef = useRef<string | null>(null);
  const responseCacheRef = useRef(new AgentSessionResponseCache<AgentMessage>());

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

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await fetch("/api/chat-session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ locale }),
        });
        const res = await fetch("/api/chat-session");
        if (!res.ok || !alive) return;
        const snapshot = await res.json() as { messages?: Array<{ question?: string; answer?: string; createdAt?: string }> };
        const restored = (snapshot.messages || []).flatMap((exchange, index): AgentMessage[] => {
          if (!exchange.question || !exchange.answer) return [];
          return [
            buildRestoredUserMessage(exchange.question, index),
            buildRestoredAssistantMessage(exchange.answer, index),
          ];
        });
        if (alive && restored.length > 0) {
          setMessages((current) => (current.length === 0 ? restored : current));
          setStarted(true);
        }
      } catch {
        // Fail soft: refresh-loss behavior is simply what we have today.
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  const send = async (
    text?: string,
    options: { appendUser?: boolean; bypassCache?: boolean } = {},
  ) => {
    const userMsg = (text ?? input).trim();
    if (!userMsg || loading) return;

    setStarted(true);
    setInput("");
    const requestId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    const appendUser = options.appendUser !== false;
    const cacheKey = agentResponseCacheKey(userMsg, locale);
    const cached = !options.bypassCache && isCacheableAgentQuestion(userMsg)
      ? responseCacheRef.current.get(cacheKey)
      : undefined;

    if (cached) {
      setProgress(null);
      setMessages((current) => [
        ...current,
        ...(appendUser ? [{ role: "user" as const, text: userMsg }] : []),
        { ...cached, requestId, state: "complete", cached: true, durationMs: 0 },
      ]);
      return;
    }

    setMessages((current) => [
      ...current,
      ...(appendUser ? [{ role: "user" as const, text: userMsg }] : []),
    ]);
    setLoading(true);
    setProgress({ stage: "routing" });
    activeRequestIdRef.current = requestId;
    const controller = new AbortController();
    abortRef.current = controller;
    const clientTimeout = window.setTimeout(() => controller.abort(), CLIENT_STREAM_TIMEOUT_MS);

    try {
      const usableMessages = messages.filter((message) => message.state !== "error");
      const history = usableMessages.slice(-6).map((message) => ({
        role: message.role === "user" ? "user" : "assistant",
        content: message.text,
      }));
      const previousAgentMessage = usableMessages.slice().reverse().find((message) => message.role === "agent");

      const res = await fetchAgent({
        question: userMsg,
        lang: locale,
        history,
        previousCapability: previousAgentMessage?.routing?.capability,
        previousExpertMode: previousAgentMessage?.expert?.mode,
      }, controller.signal);

      const completedData = await readUnifiedAiEventStream(res, (event: UnifiedAiStreamEvent) => {
        if (activeRequestIdRef.current !== requestId) return;
        if (event.type === "progress") {
          setProgress({ stage: event.stage, capability: event.capability });
          return;
        }
        if (event.type === "delta") {
          setMessages((current) => {
            const existing = current.find((message) => message.requestId === requestId);
            const next: AgentMessage = {
              role: "agent",
              requestId,
              state: "streaming",
              text: `${existing?.text || ""}${event.delta}`,
            };
            return upsertAgentMessage(current, requestId, next);
          });
          return;
        }
      });
      const completedMessage = agentMessageFromResponse(completedData, requestId);
      setMessages((current) => upsertAgentMessage(current, requestId, completedMessage));

      if (
        isCacheableAgentQuestion(userMsg)
        && !completedMessage.expert?.needsHumanExpert
        && !completedMessage.meta?.safetyFlags?.length
      ) {
        responseCacheRef.current.set(cacheKey, { ...completedMessage, requestId: undefined, cached: false });
      }
    } catch (error) {
      if (activeRequestIdRef.current !== requestId) return;
      const aborted = error instanceof DOMException && error.name === "AbortError";
      const streamError = error instanceof UnifiedAiStreamError ? error : null;
      const code = aborted ? "client_timeout" : streamError?.code || "stream_failed";
      const status = aborted ? 504 : streamError?.status || 502;
      const retryable = aborted || streamError?.retryable !== false;
      console.error("[agent stream]", code, status);
      setMessages((current) => {
        const withoutPartial = current.filter((message) => message.requestId !== requestId);
        return [
          ...withoutPartial,
          {
            role: "agent",
            requestId,
            state: "error",
            text: errorCopy(locale, code, status),
            retry: retryable ? { question: userMsg, code } : undefined,
          },
        ];
      });
    } finally {
      window.clearTimeout(clientTimeout);
      if (activeRequestIdRef.current === requestId) {
        activeRequestIdRef.current = null;
        abortRef.current = null;
        setLoading(false);
        setProgress(null);
      }
    }
  };

  const reset = () => {
    activeRequestIdRef.current = null;
    abortRef.current?.abort();
    abortRef.current = null;
    responseCacheRef.current.clear();
    setMessages([]);
    setClarifyDrafts({});
    setLoading(false);
    setProgress(null);
    setStarted(false);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const retry = (messageIndex: number) => {
    const retryRequest = messages[messageIndex]?.retry;
    if (!retryRequest || loading) return;
    setMessages((current) => current.filter((_, index) => index !== messageIndex));
    void send(retryRequest.question, { appendUser: false, bypassCache: true });
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
    progress,
    reset,
    retry,
    send,
    sendClarifyDraft,
    setInput,
    started,
    updateClarifyDraft,
  };
}
