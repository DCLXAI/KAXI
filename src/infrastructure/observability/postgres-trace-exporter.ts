import { runtimeEnvironment } from "@/infrastructure/config/runtime-environment";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { redactLogValue } from "@/infrastructure/observability/structured-log";
import type { SpanRecord } from "@/infrastructure/observability/tracing";

function optionalText(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : null;
}

export async function exportSpanToPostgres(span: SpanRecord) {
  const attributes = redactLogValue(span.attributes) as Record<string, unknown>;
  await db.traceSpan.upsert({
    where: { spanId: span.spanId },
    create: {
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId || null,
      requestId: optionalText(attributes.requestId, 128),
      service: runtimeEnvironment().KAXI_SERVICE_NAME || "kaxi-web",
      name: span.name.slice(0, 160),
      status: span.status,
      startedAt: new Date(span.startedAt),
      endedAt: new Date(span.endedAt),
      durationMs: span.durationMs,
      attributes: attributes as Prisma.InputJsonValue,
    },
    update: {},
  });
}

export async function findTraceSpans(input: { traceId?: string; requestId?: string; limit?: number }) {
  return db.traceSpan.findMany({
    where: {
      ...(input.traceId ? { traceId: input.traceId } : {}),
      ...(input.requestId ? { requestId: input.requestId } : {}),
    },
    orderBy: { startedAt: "asc" },
    take: Math.min(200, Math.max(1, input.limit || 100)),
  });
}
