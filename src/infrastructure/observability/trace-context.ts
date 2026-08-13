const TRACEPARENT_RE = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;

export interface TraceContext {
  traceId: string;
  spanId: string;
  traceFlags: string;
  traceparent: string;
}

function hex(bytes: number) {
  const buffer = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(buffer);
  return Array.from(buffer, (value) => value.toString(16).padStart(2, "0")).join("");
}

function validNonZero(value: string) {
  return !/^0+$/.test(value);
}

export function parseTraceparent(value: string | null | undefined): TraceContext | null {
  const normalized = value?.trim().toLowerCase() || "";
  const match = TRACEPARENT_RE.exec(normalized);
  if (!match || !validNonZero(match[1]) || !validNonZero(match[2])) return null;
  return {
    traceId: match[1],
    spanId: match[2],
    traceFlags: match[3],
    traceparent: normalized,
  };
}

export function newTraceContext(traceId?: string): TraceContext {
  const resolvedTraceId = traceId && /^[0-9a-f]{32}$/.test(traceId) && validNonZero(traceId)
    ? traceId
    : hex(16);
  const spanId = hex(8);
  return {
    traceId: resolvedTraceId,
    spanId,
    traceFlags: "01",
    traceparent: `00-${resolvedTraceId}-${spanId}-01`,
  };
}

export function childTraceContext(parent: TraceContext): TraceContext {
  const spanId = hex(8);
  return {
    traceId: parent.traceId,
    spanId,
    traceFlags: parent.traceFlags,
    traceparent: `00-${parent.traceId}-${spanId}-${parent.traceFlags}`,
  };
}

export function requestTraceContext(headers: Headers): TraceContext {
  const inbound = parseTraceparent(headers.get("traceparent"));
  return inbound ? childTraceContext(inbound) : newTraceContext();
}

export function traceHeaders(context: TraceContext, requestId?: string): Record<string, string> {
  return {
    traceparent: context.traceparent,
    ...(requestId ? { "x-request-id": requestId } : {}),
  };
}
