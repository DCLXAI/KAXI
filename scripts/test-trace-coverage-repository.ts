import assert from "node:assert/strict";
import { prepareTestDb } from "./prepare-test-db";

prepareTestDb("trace coverage repository");
process.env.NODE_ENV = "test";
process.env.DATA_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.PII_HASH_SECRET = "trace-coverage-test-hash-secret-with-sufficient-length";

const { db } = await import("../src/lib/db");
const { persistAtomicChatTurn } = await import("../src/infrastructure/chat/prisma-chat-unit-of-work");
const { collectTraceCoverage } = await import("../src/infrastructure/observability/trace-coverage-repository");
const { platformServiceTenantContext, PLATFORM_TENANT_ID } = await import("../src/application/tenancy/tenant-context");

const since = new Date(Date.now() - 60_000);
const requestId = crypto.randomUUID();
const traceId = crypto.randomUUID().replaceAll("-", "");
const tenantContext = platformServiceTenantContext("trace-coverage-test");

function span(name: string, request: string, trace: string, offset: number) {
  const startedAt = new Date(since.getTime() + 1_000 + offset);
  return {
    traceId: trace,
    spanId: crypto.randomUUID().replaceAll("-", "").slice(0, 16),
    parentSpanId: null,
    requestId: request,
    service: name.startsWith("worker") || name === "outbox.delivery" ? "kaxi-worker" : "kaxi-web",
    name,
    status: "ok",
    startedAt,
    endedAt: new Date(startedAt.getTime() + 5),
    durationMs: 5,
    attributes: { requestId: request, question: "[redacted]" },
  };
}

try {
  await persistAtomicChatTurn({
    requestId,
    idempotencyKey: `trace-${requestId}`,
    traceId,
    sessionKey: `trace-session-${requestId}`,
    tenantContext,
    locale: "ko",
    source: "typebot",
    question: "trace fixture question",
    answer: "trace fixture answer",
    needsHuman: false,
    provenance: {
      workflowId: "trace-test",
      workflowVersionId: "trace-test@v1",
      modelVersion: "fixture-model",
      promptVersion: "fixture-prompt",
    },
    sources: [],
    searchMeta: { retrievedCount: 0, noContext: true },
  });
  await db.outboxEvent.updateMany({
    where: { requestId },
    data: { status: "processed", processedAt: new Date() },
  });
  await db.workerJob.create({
    data: {
      tenantId: PLATFORM_TENANT_ID,
      requestId,
      jobType: "rag-serving-sync",
      idempotencyKey: `trace-worker-${requestId}`,
      traceId,
      payload: {},
      status: "completed",
      completedAt: new Date(),
    },
  });
  const attachment = await db.chatAttachment.create({
    data: {
      tenantId: PLATFORM_TENANT_ID,
      sessionKey: `trace-session-${requestId}`,
      bucket: "chat",
      storageKey: `trace/${requestId}.pdf`,
      originalName: "trace.pdf",
      mimeType: "application/pdf",
      sizeBytes: 10,
      sha256: "b".repeat(64),
    },
  });
  await db.chatAttachmentJob.create({
    data: {
      tenantId: PLATFORM_TENANT_ID,
      requestId,
      traceId,
      traceparent: `00-${traceId}-${"e".repeat(16)}-01`,
      attachmentId: attachment.id,
      status: "completed",
      completedAt: new Date(),
    },
  });
  await db.traceSpan.createMany({
    data: [
      span("ai.request", requestId, traceId, 1),
      span("ai.rate_limit", requestId, traceId, 2),
      span("ai.auth", requestId, traceId, 3),
      span("ai.provider_attempt", requestId, traceId, 4),
      span("ai.guardrail", requestId, traceId, 5),
      span("chat.transaction", requestId, traceId, 6),
      span("outbox.delivery", requestId, traceId, 7),
      span("worker.job.rag-serving-sync", requestId, traceId, 8),
      span("worker.attachment.process", requestId, traceId, 9),
    ],
  });

  const complete = await collectTraceCoverage({ since });
  assert.equal(complete.eligibleUnits, 4);
  assert.equal(complete.connectedUnits, 4);
  assert.equal(complete.coverage, 1);
  assert.equal(complete.piiViolationCount, 0);
  assert.equal(complete.truncated, false);

  await db.workerJob.create({
    data: {
      tenantId: PLATFORM_TENANT_ID,
      requestId: "missing-worker-span",
      jobType: "embedding-sync",
      idempotencyKey: `missing-${crypto.randomUUID()}`,
      traceId: "c".repeat(32),
      payload: {},
      status: "completed",
      completedAt: new Date(),
    },
  });
  const incomplete = await collectTraceCoverage({ since });
  assert.equal(incomplete.eligibleUnits, 5);
  assert.equal(incomplete.connectedUnits, 4);
  assert.equal(incomplete.byKind.worker.coverage, 0.5);
  console.log("PASS trace coverage repository: canonical/outbox/Worker/attachment correlation and missing-span denominator verified");
} finally {
  await db.$disconnect();
}
