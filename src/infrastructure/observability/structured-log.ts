import { runtimeEnvironment } from "@/infrastructure/config/runtime-environment";
import type { TraceContext } from "@/infrastructure/observability/trace-context";

export type LogLevel = "debug" | "info" | "warn" | "error";

const SENSITIVE_KEY = /(authorization|cookie|secret|token|password|question|answer|contact|email|phone|content|ciphertext|api.?key)/i;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE = /(?:\+?\d[\d .()-]{7,}\d)/g;
const BEARER_RE = /bearer\s+[a-z0-9._~+/=-]+/gi;

function scrubText(value: string) {
  return value
    .replace(EMAIL_RE, "[redacted-email]")
    .replace(PHONE_RE, "[redacted-phone]")
    .replace(BEARER_RE, "Bearer [redacted]")
    .slice(0, 1_000);
}

export function redactLogValue(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[truncated]";
  if (value === null || value === undefined || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "string") return scrubText(value);
  if (value instanceof Error) {
    return { name: value.name, message: scrubText(value.message) };
  }
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redactLogValue(item, depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 100).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? "[redacted]" : redactLogValue(item, depth + 1),
    ]));
  }
  return scrubText(String(value));
}

export function structuredLog(input: {
  level: LogLevel;
  event: string;
  service?: string;
  requestId?: string;
  trace?: TraceContext | Pick<TraceContext, "traceId" | "spanId">;
  fields?: Record<string, unknown>;
}) {
  try {
    const record = {
      timestamp: new Date().toISOString(),
      level: input.level,
      service: input.service || runtimeEnvironment().KAXI_SERVICE_NAME || "kaxi-web",
      event: input.event,
      requestId: input.requestId,
      traceId: input.trace?.traceId,
      spanId: input.trace?.spanId,
      ...redactLogValue(input.fields || {}) as Record<string, unknown>,
    };
    const line = JSON.stringify(record);
    if (input.level === "error") console.error(line);
    else if (input.level === "warn") console.warn(line);
    else console.log(line);
  } catch {
    // Observability must never fail user or Worker execution.
  }
}
