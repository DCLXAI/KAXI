import { db } from "@/lib/db";
import {
  evaluateTraceCoverage,
  type TraceCoverageSpan,
  type TraceCoverageUnit,
} from "@/application/ops/trace-coverage";

const CANONICAL_GROUPS = [
  ["ai.request", "rag.mediation"],
  ["ai.rate_limit", "rag.rate_limit"],
  ["ai.auth", "rag.auth"],
  ["ai.provider_attempt", "rag.retrieval_generation"],
  ["ai.guardrail", "rag.guardrail"],
  ["chat.transaction"],
];

export async function collectTraceCoverage(input: {
  since: Date;
  maxUnits?: number;
  maxSpans?: number;
}) {
  const maxUnits = Math.min(10_000, Math.max(1, Math.trunc(input.maxUnits || 5_000)));
  const maxSpans = Math.min(100_000, Math.max(1, Math.trunc(input.maxSpans || 50_000)));
  const [canonicalRows, workerRows, outboxRows, attachmentRows, spanRows] = await Promise.all([
    db.retrievalRun.findMany({
      where: { createdAt: { gte: input.since } },
      orderBy: { createdAt: "desc" },
      take: maxUnits + 1,
      select: {
        id: true,
        requestId: true,
        message: {
          select: {
            outboxEvents: {
              orderBy: { createdAt: "asc" },
              take: 1,
              select: { traceId: true },
            },
          },
        },
      },
    }),
    db.workerJob.findMany({
      where: { status: "completed", completedAt: { gte: input.since } },
      orderBy: { completedAt: "desc" },
      take: maxUnits + 1,
      select: { id: true, requestId: true, traceId: true },
    }),
    db.outboxEvent.findMany({
      where: { status: "processed", processedAt: { gte: input.since } },
      orderBy: { processedAt: "desc" },
      take: maxUnits + 1,
      select: { id: true, requestId: true, traceId: true },
    }),
    db.chatAttachmentJob.findMany({
      where: { status: "completed", completedAt: { gte: input.since } },
      orderBy: { completedAt: "desc" },
      take: maxUnits + 1,
      select: { id: true, requestId: true, traceId: true },
    }),
    db.traceSpan.findMany({
      // Include request-less spans in the PII scan. A broken correlation field
      // must not make unsafe trace attributes invisible to the rollout gate.
      where: { startedAt: { gte: input.since } },
      orderBy: { startedAt: "desc" },
      take: maxSpans + 1,
      select: { requestId: true, traceId: true, name: true, attributes: true },
    }),
  ]);

  const truncated = [canonicalRows, workerRows, outboxRows, attachmentRows]
    .some((rows) => rows.length > maxUnits) || spanRows.length > maxSpans;
  const units: TraceCoverageUnit[] = [];
  for (const row of canonicalRows.slice(0, maxUnits)) {
    // Missing outbox correlation is itself a coverage failure; retain the
    // canonical unit with an impossible trace id instead of shrinking the
    // denominator and producing a false-positive coverage rate.
    const traceId = row.message.outboxEvents[0]?.traceId || "00000000000000000000000000000000";
    units.push({
      kind: "canonical",
      id: row.id,
      requestId: row.requestId,
      traceId,
      requiredSpanGroups: CANONICAL_GROUPS,
    });
  }
  for (const row of workerRows.slice(0, maxUnits)) {
    units.push({ kind: "worker", ...row, requiredSpanGroups: [["worker.job.*"]] });
  }
  for (const row of outboxRows.slice(0, maxUnits)) {
    units.push({ kind: "outbox", ...row, requiredSpanGroups: [["outbox.delivery"]] });
  }
  for (const row of attachmentRows.slice(0, maxUnits)) {
    units.push({ kind: "attachment", ...row, requiredSpanGroups: [["worker.attachment.process"]] });
  }

  const spans = spanRows.slice(0, maxSpans) as TraceCoverageSpan[];
  return {
    since: input.since,
    truncated,
    ...evaluateTraceCoverage(units, spans),
  };
}
