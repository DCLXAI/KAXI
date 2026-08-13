import assert from "node:assert/strict";
import { prepareTestDb } from "./prepare-test-db";

prepareTestDb("dedicated worker runtime");
process.env.NODE_ENV = "test";

const { db } = await import("../src/lib/db");
const {
  claimWorkerJobs,
  completeWorkerJob,
  enqueueWorkerJob,
  getWorkerQueueMetrics,
} = await import("../src/infrastructure/worker/job-repository");
const {
  commitAttachmentPromotion,
  reconcileAttachmentPromotions,
} = await import("../src/worker/attachment-promotion-saga");
const {
  newTraceContext,
  parseTraceparent,
  requestTraceContext,
} = await import("../src/infrastructure/observability/trace-context");
const { redactLogValue } = await import("../src/infrastructure/observability/structured-log");
const { registerTraceExporter, withSpan } = await import("../src/infrastructure/observability/tracing");
const { exportSpanToPostgres, findTraceSpans } = await import("../src/infrastructure/observability/postgres-trace-exporter");
const { PLATFORM_TENANT_ID, platformServiceTenantContext } = await import("../src/application/tenancy/tenant-context");
const tenantContext = platformServiceTenantContext("worker-runtime-test");

try {
  const trace = newTraceContext();
  const enqueued = await enqueueWorkerJob({
    tenantContext,
    requestId: "worker-runtime-request",
    jobType: "rag-serving-sync",
    idempotencyKey: "worker-kill-reclaim",
    payload: { limit: 10 },
    traceId: trace.traceId,
    traceparent: trace.traceparent,
    timeoutMs: 60_000,
    availableAt: new Date("2026-08-13T00:00:00Z"),
  });
  const same = await enqueueWorkerJob({
    tenantContext,
    requestId: "worker-runtime-request",
    jobType: "rag-serving-sync",
    idempotencyKey: "worker-kill-reclaim",
    payload: { limit: 999 },
    traceId: trace.traceId,
  });
  assert.equal(same.id, enqueued.id, "enqueue must be idempotent");

  const firstClaim = await claimWorkerJobs({ tenantContext, now: new Date("2026-08-13T00:00:00Z"), leaseMs: 60_000 });
  assert.equal(firstClaim.length, 1);
  assert.equal(firstClaim[0].requestId, "worker-runtime-request");
  assert.equal(firstClaim[0].attempts, 1);
  assert.equal((await claimWorkerJobs({ tenantContext, now: new Date("2026-08-13T00:00:30Z"), leaseMs: 60_000 })).length, 0);

  // Simulate SIGKILL: no failure/complete acknowledgement is written. Once the
  // heartbeat lease expires another Worker instance must reclaim the same row.
  const reclaimed = await claimWorkerJobs({ tenantContext, now: new Date("2026-08-13T00:02:00Z"), leaseMs: 60_000 });
  assert.equal(reclaimed.length, 1);
  assert.equal(reclaimed[0].id, firstClaim[0].id);
  assert.equal(reclaimed[0].attempts, 2);
  await completeWorkerJob(reclaimed[0], { ok: true });
  assert.equal((await db.workerJob.findUniqueOrThrow({ where: { id: enqueued.id } })).status, "completed");
  console.log("PASS worker lease: killed processing is reclaimed without a duplicate job");

  const sourceJob = await enqueueWorkerJob({
    tenantContext,
    requestId: "worker-source-request",
    jobType: "official-source-monitor",
    idempotencyKey: "source-cursor-resume",
    payload: { sourceIds: ["source-a", "source-b", "source-c"] },
    traceId: trace.traceId,
  });
  await db.workerSourceCheckpoint.createMany({
    data: [
      { jobId: sourceJob.id, sourceId: "source-a", ordinal: 0, status: "completed", completedAt: new Date() },
      { jobId: sourceJob.id, sourceId: "source-b", ordinal: 1, status: "completed", completedAt: new Date() },
      { jobId: sourceJob.id, sourceId: "source-c", ordinal: 2, status: "pending" },
    ],
  });
  const cursor = await db.workerSourceCheckpoint.findMany({
    where: { jobId: sourceJob.id, status: { not: "completed" } },
    orderBy: { ordinal: "asc" },
    select: { sourceId: true },
  });
  assert.deepEqual(cursor.map((item) => item.sourceId), ["source-c"]);
  console.log("PASS source cursor: an interrupted monitor resumes after the last completed source");

  const sessionKey = `worker-session-${crypto.randomUUID()}`;
  await db.chatSession.create({
    data: { sessionKey, tenantId: PLATFORM_TENANT_ID, locale: "ko", source: "kaxi-site", channel: "kaxi-site" },
  });
  const sourceKey = `chat-attachments/quarantine/${crypto.randomUUID()}.pdf`;
  const destinationKey = sourceKey.replace("/quarantine/", "/processed/");
  const attachment = await db.chatAttachment.create({
    data: {
      tenantId: PLATFORM_TENANT_ID,
      sessionKey,
      bucket: "chat",
      storageKey: sourceKey,
      originalName: "fixture.pdf",
      mimeType: "application/pdf",
      sizeBytes: 10,
      sha256: "a".repeat(64),
      status: "processing",
      processingStatus: "processing",
    },
  });
  const objects = new Set([sourceKey]);
  const storage = {
    async move(_bucket: string, source: string, destination: string) {
      if (!objects.delete(source)) throw new Error("source missing");
      objects.add(destination);
    },
    async exists(_bucket: string, key: string) {
      return objects.has(key);
    },
  };
  await assert.rejects(
    commitAttachmentPromotion(tenantContext, attachment.id, storage, {
      afterObjectMove: () => { throw new Error("injected db outage after object move"); },
    }),
    /injected db outage/,
  );
  assert.equal(objects.has(destinationKey), true);
  assert.equal((await db.chatAttachment.findUniqueOrThrow({ where: { id: attachment.id } })).storageKey, sourceKey);
  assert.equal((await db.chatAttachmentPromotion.findUniqueOrThrow({ where: { attachmentId: attachment.id } })).status, "object_moved");
  assert.deepEqual(await reconcileAttachmentPromotions({ tenantContext, storage }), { checked: 1, ready: 1, failed: 0 });
  const ready = await db.chatAttachment.findUniqueOrThrow({ where: { id: attachment.id } });
  assert.equal(ready.storageKey, destinationKey);
  assert.equal(ready.status, "ready");
  console.log("PASS promotion saga: object-move/DB-pointer split converges on reconciliation");

  const parsed = parseTraceparent(trace.traceparent);
  assert.equal(parsed?.traceId, trace.traceId);
  assert.equal(parseTraceparent("00-00000000000000000000000000000000-0000000000000000-01"), null);
  const inherited = requestTraceContext(new Headers({ traceparent: trace.traceparent }));
  assert.equal(inherited.traceId, trace.traceId);
  assert.notEqual(inherited.spanId, trace.spanId);
  const redacted = JSON.stringify(redactLogValue({
    question: "비자 질문",
    authorization: "Bearer super-secret",
    metadata: "call me at +82 10-1234-5678 or a@example.com",
  }));
  assert.doesNotMatch(redacted, /비자 질문|super-secret|10-1234-5678|a@example.com/);
  registerTraceExporter(() => { throw new Error("telemetry backend unavailable"); });
  assert.equal(await withSpan({ name: "fixture", parent: trace, run: async () => 42 }), 42);
  process.env.KAXI_SERVICE_NAME = "kaxi-worker-test";
  registerTraceExporter(exportSpanToPostgres);
  assert.equal(await withSpan({
    name: "trace.ledger.fixture",
    parent: trace,
    attributes: { requestId: "request-trace-ledger", question: "must not persist" },
    run: async () => 7,
  }), 7);
  const persistedTrace = await findTraceSpans({ requestId: "request-trace-ledger" });
  assert.equal(persistedTrace.length, 1);
  assert.equal(persistedTrace[0].traceId, trace.traceId);
  assert.equal(persistedTrace[0].service, "kaxi-worker-test");
  assert.equal((persistedTrace[0].attributes as Record<string, unknown>).question, "[redacted]");
  registerTraceExporter(null);
  console.log("PASS observability: W3C propagation, redaction, fail-open export and trace/request lookup");

  const metrics = await getWorkerQueueMetrics();
  assert(metrics.some((metric) => metric.queue === "worker:official-source-monitor"));
  assert(metrics.some((metric) => metric.queue === "outbox"));
  assert(metrics.some((metric) => metric.queue === "attachments"));
  console.log("PASS queue SLO: depth, age, retry and dead-letter metrics are queryable");
} finally {
  await db.$disconnect();
}
