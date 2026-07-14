import type { UnifiedAiCapability } from "@/lib/ai/unified-router";

export type UnifiedAiProgressStage = "routing" | "searching" | "generating" | "finalizing";

export type UnifiedAiStreamEvent =
  | {
      type: "progress";
      stage: UnifiedAiProgressStage;
      capability: UnifiedAiCapability;
      timestamp: number;
    }
  | { type: "delta"; delta: string }
  | { type: "complete"; data: Record<string, unknown> }
  | {
      type: "error";
      code: string;
      message: string;
      status: number;
      retryable: boolean;
    };

export interface UnifiedAiStreamRunnerResult {
  ok: boolean;
  status: number;
  data: Record<string, unknown>;
}

export class UnifiedAiStreamError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryable: boolean;

  constructor(input: { code: string; message: string; status?: number; retryable?: boolean }) {
    super(input.message);
    this.name = "UnifiedAiStreamError";
    this.code = input.code;
    this.status = input.status || 500;
    this.retryable = input.retryable !== false;
  }
}

export function unifiedAiStreamTimeoutMs(env: NodeJS.ProcessEnv = process.env): number {
  const configured = Number.parseInt(env.UNIFIED_AI_STREAM_TIMEOUT_MS || "", 10);
  return Number.isFinite(configured) ? Math.min(Math.max(configured, 8_000), 30_000) : 20_000;
}

export function encodeUnifiedAiStreamEvent(event: UnifiedAiStreamEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

export function parseUnifiedAiStreamEvent(line: string): UnifiedAiStreamEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  try {
    const event = JSON.parse(trimmed) as Partial<UnifiedAiStreamEvent>;
    if (event.type === "progress" && typeof event.stage === "string") return event as UnifiedAiStreamEvent;
    if (event.type === "delta" && typeof event.delta === "string") return event as UnifiedAiStreamEvent;
    if (event.type === "complete" && event.data && typeof event.data === "object") return event as UnifiedAiStreamEvent;
    if (event.type === "error" && typeof event.code === "string") return event as UnifiedAiStreamEvent;
  } catch {}

  throw new UnifiedAiStreamError({
    code: "invalid_stream_event",
    message: "The AI response stream contained an invalid event.",
    status: 502,
  });
}

export function chunkUnifiedAiAnswer(answer: string, targetLength = 42): string[] {
  if (!answer) return [];
  const maxLength = Math.max(16, targetLength);
  const tokens = answer.match(/\S+\s*|\s+/gu) || [answer];
  const chunks: string[] = [];
  let current = "";

  for (const token of tokens) {
    if (current && current.length + token.length > maxLength) {
      chunks.push(current);
      current = token;
    } else {
      current += token;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function errorText(data: Record<string, unknown>): string {
  return typeof data.error === "string" && data.error.trim()
    ? data.error.trim().slice(0, 240)
    : "The AI request could not be completed.";
}

function errorCode(data: Record<string, unknown>, status: number): string {
  if (typeof data.errorCode === "string" && data.errorCode.trim()) return data.errorCode.trim().slice(0, 80);
  if (status === 401 || status === 403) return "authentication_required";
  if (status === 408 || status === 504) return "upstream_timeout";
  if (status === 429) return "rate_limited";
  return "upstream_error";
}

function retryableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createUnifiedAiEventStream(options: {
  capability: UnifiedAiCapability;
  run: () => Promise<UnifiedAiStreamRunnerResult>;
  signal?: AbortSignal;
  timeoutMs?: number;
  progressDelayMs?: number;
  chunkDelayMs?: number;
}): ReadableStream<Uint8Array> {
  const timeoutMs = options.timeoutMs ?? unifiedAiStreamTimeoutMs();
  const progressDelayMs = options.progressDelayMs ?? 650;
  const chunkDelayMs = options.chunkDelayMs ?? 12;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      let active = true;
      let generationReported = false;
      let progressTimer: ReturnType<typeof setTimeout> | undefined;
      let timeoutTimer: ReturnType<typeof setTimeout> | undefined;

      const close = () => {
        if (!active) return;
        active = false;
        if (progressTimer) clearTimeout(progressTimer);
        if (timeoutTimer) clearTimeout(timeoutTimer);
        try {
          controller.close();
        } catch {}
      };
      const emit = (event: UnifiedAiStreamEvent) => {
        if (!active) return;
        try {
          controller.enqueue(encodeUnifiedAiStreamEvent(event));
        } catch {
          close();
        }
      };
      const progress = (stage: UnifiedAiProgressStage) => {
        if (stage === "generating") generationReported = true;
        emit({
          type: "progress",
          stage,
          capability: options.capability,
          timestamp: Date.now(),
        });
      };

      const abort = () => close();
      options.signal?.addEventListener("abort", abort, { once: true });

      void (async () => {
        progress("routing");
        progress("searching");

        progressTimer = setTimeout(() => progress("generating"), progressDelayMs);
        const timeout = new Promise<never>((_, reject) => {
          timeoutTimer = setTimeout(() => reject(new UnifiedAiStreamError({
            code: "stream_timeout",
            message: "The AI response took too long.",
            status: 504,
          })), timeoutMs);
        });

        try {
          const result = await Promise.race([options.run(), timeout]);
          if (progressTimer) clearTimeout(progressTimer);
          if (timeoutTimer) clearTimeout(timeoutTimer);
          if (!active) return;

          if (!result.ok) {
            emit({
              type: "error",
              code: errorCode(result.data, result.status),
              message: errorText(result.data),
              status: result.status,
              retryable: retryableStatus(result.status),
            });
            close();
            return;
          }

          if (!generationReported) progress("generating");
          const answer = typeof result.data.answer === "string" ? result.data.answer : "";
          for (const delta of chunkUnifiedAiAnswer(answer)) {
            if (!active) return;
            emit({ type: "delta", delta });
            if (chunkDelayMs > 0) await sleep(chunkDelayMs);
          }
          progress("finalizing");
          emit({ type: "complete", data: result.data });
          close();
        } catch (error) {
          if (!active) return;
          const streamError = error instanceof UnifiedAiStreamError
            ? error
            : new UnifiedAiStreamError({
                code: "stream_failed",
                message: "The AI response stream failed.",
                status: 502,
              });
          emit({
            type: "error",
            code: streamError.code,
            message: streamError.message,
            status: streamError.status,
            retryable: streamError.retryable,
          });
          close();
        } finally {
          options.signal?.removeEventListener("abort", abort);
        }
      })();
    },
  });
}

async function responseError(response: Response): Promise<UnifiedAiStreamError> {
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  return new UnifiedAiStreamError({
    code: errorCode(data, response.status),
    message: errorText(data),
    status: response.status,
    retryable: retryableStatus(response.status),
  });
}

export async function readUnifiedAiEventStream(
  response: Response,
  onEvent: (event: UnifiedAiStreamEvent) => void,
): Promise<Record<string, unknown>> {
  if (!response.ok) throw await responseError(response);
  if (!response.body) {
    throw new UnifiedAiStreamError({ code: "missing_stream", message: "The AI response stream is unavailable.", status: 502 });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed: Record<string, unknown> | null = null;

  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const event = parseUnifiedAiStreamEvent(line);
        if (!event) continue;
        onEvent(event);
        if (event.type === "error") {
          throw new UnifiedAiStreamError(event);
        }
        if (event.type === "complete") completed = event.data;
      }
      if (done) break;
    }

    if (buffer.trim()) {
      const event = parseUnifiedAiStreamEvent(buffer);
      if (event) {
        onEvent(event);
        if (event.type === "error") throw new UnifiedAiStreamError(event);
        if (event.type === "complete") completed = event.data;
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!completed) {
    throw new UnifiedAiStreamError({
      code: "incomplete_stream",
      message: "The AI response stream ended before completion.",
      status: 502,
    });
  }
  return completed;
}
