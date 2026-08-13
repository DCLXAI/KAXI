import { childTraceContext, type TraceContext } from "@/infrastructure/observability/trace-context";
import { structuredLog } from "@/infrastructure/observability/structured-log";

export interface SpanRecord {
  name: string;
  traceId: string;
  spanId: string;
  parentSpanId: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  status: "ok" | "error";
  attributes: Record<string, unknown>;
}

type SpanExporter = (span: SpanRecord) => void | Promise<void>;

let exporter: SpanExporter | null = null;

export function registerTraceExporter(next: SpanExporter | null) {
  exporter = next;
}

async function exportSpan(span: SpanRecord) {
  try {
    await exporter?.(span);
  } catch (error) {
    structuredLog({
      level: "warn",
      event: "trace.export.failed",
      trace: span,
      fields: { error },
    });
  }
}

export async function withSpan<T>(input: {
  name: string;
  parent: TraceContext;
  attributes?: Record<string, unknown>;
  run: (context: TraceContext) => Promise<T>;
}): Promise<T> {
  const context = childTraceContext(input.parent);
  const startedAt = new Date();
  const started = performance.now();
  try {
    const value = await input.run(context);
    const endedAt = new Date();
    await exportSpan({
      name: input.name,
      traceId: context.traceId,
      spanId: context.spanId,
      parentSpanId: input.parent.spanId,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationMs: Math.max(0, performance.now() - started),
      status: "ok",
      attributes: input.attributes || {},
    });
    return value;
  } catch (error) {
    const endedAt = new Date();
    await exportSpan({
      name: input.name,
      traceId: context.traceId,
      spanId: context.spanId,
      parentSpanId: input.parent.spanId,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationMs: Math.max(0, performance.now() - started),
      status: "error",
      attributes: { ...(input.attributes || {}), errorType: error instanceof Error ? error.name : "unknown" },
    });
    throw error;
  }
}
