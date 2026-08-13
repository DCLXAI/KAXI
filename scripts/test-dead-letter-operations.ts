import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { prepareTestDb } from "./prepare-test-db";

prepareTestDb("dead-letter operations");
process.env.NODE_ENV = "test";
process.env.ADMIN_API_KEY = "test-admin-owner-key";
process.env.ADMIN_API_KEY_ROLE = "owner";

const { NextRequest } = await import("next/server");
const { db } = await import("../src/lib/db");
const {
  platformOperatorTenantContext,
  platformServiceTenantContext,
  tenantContextFromOrganizationAssignment,
  verifyTenantClaim,
} = await import("../src/application/tenancy/tenant-context");
const {
  DeadLetterReplayError,
  replayDeadLetter,
} = await import("../src/application/ops/dead-letter");
const {
  listDeadLetters,
  prismaDeadLetterRepository,
} = await import("../src/infrastructure/worker/dead-letter-repository");
const replayRoute = await import("../src/app/api/admin/ops/dead-letters/[id]/replay/route");

const tenantA = `ops-a-${crypto.randomUUID().slice(0, 8)}`;
const tenantB = `ops-b-${crypto.randomUUID().slice(0, 8)}`;
const replayAt = new Date("2026-08-13T03:00:00.000Z");
const rawReason = "승인된 장애 복구 rehearsal 사유";

function ownerRequest(id: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost/api/admin/ops/dead-letters/${id}/replay`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-admin-key": "test-admin-owner-key" },
    body: JSON.stringify(body),
  });
}

async function responseJson(response: Response) {
  return await response.json() as Record<string, unknown>;
}

try {
  await db.tenant.createMany({
    data: [
      { id: tenantA, slug: tenantA, name: "Ops tenant A" },
      { id: tenantB, slug: tenantB, name: "Ops tenant B" },
    ],
  });
  await db.chatSession.create({
    data: {
      tenantId: tenantA,
      sessionKey: `ops-session-${crypto.randomUUID()}`,
      locale: "ko",
      source: "kaxi-site",
      channel: "kaxi-site",
    },
  });
  const session = await db.chatSession.findFirstOrThrow({ where: { tenantId: tenantA } });

  const worker = await db.workerJob.create({
    data: {
      tenantId: tenantA,
      requestId: "dead-letter-worker-request",
      jobType: "official-source-monitor",
      idempotencyKey: `dlq-worker-${crypto.randomUUID()}`,
      payload: { email: "private@example.com", secret: "must-not-list" },
      traceId: crypto.randomUUID().replaceAll("-", ""),
      tenantClaim: "expired-tenant-claim",
      status: "dead_letter",
      attempts: 8,
      maxAttempts: 8,
      lastError: "OCR_TIMEOUT private@example.com",
      deadlineAt: new Date("2026-08-13T00:00:00.000Z"),
      completedAt: new Date("2026-08-13T01:00:00.000Z"),
    },
  });
  const outbox = await db.outboxEvent.create({
    data: {
      tenantId: tenantA,
      requestId: "dead-letter-outbox-request",
      aggregateType: "chat-session",
      aggregateId: session.sessionKey,
      eventType: "chat.message.persisted",
      idempotencyKey: `dlq-outbox-${crypto.randomUUID()}`,
      payload: { phone: "+82-10-1111-2222", content: "must-not-list" },
      traceId: crypto.randomUUID().replaceAll("-", ""),
      status: "dead_letter",
      attempts: 12,
      maxAttempts: 12,
      lastError: "DELIVERY_TIMEOUT +82-10-1111-2222",
    },
  });
  const concurrentOutbox = await db.outboxEvent.create({
    data: {
      tenantId: tenantA,
      requestId: "dead-letter-concurrent-request",
      aggregateType: "chat-session",
      aggregateId: session.sessionKey,
      eventType: "chat.message.persisted",
      idempotencyKey: `dlq-concurrent-${crypto.randomUUID()}`,
      payload: {},
      traceId: crypto.randomUUID().replaceAll("-", ""),
      status: "dead_letter",
      attempts: 12,
      maxAttempts: 12,
      lastError: "DELIVERY_TIMEOUT",
    },
  });
  const attachment = await db.chatAttachment.create({
    data: {
      tenantId: tenantA,
      sessionKey: session.sessionKey,
      bucket: "chat",
      storageKey: `chat-attachments/quarantine/${crypto.randomUUID()}.pdf`,
      originalName: "resident-card-private.pdf",
      mimeType: "application/pdf",
      sizeBytes: 256,
      sha256: "a".repeat(64),
      status: "failed",
      processingStatus: "failed",
      processedAt: new Date("2026-08-13T01:10:00.000Z"),
    },
  });
  const attachmentJob = await db.chatAttachmentJob.create({
    data: {
      tenantId: tenantA,
      requestId: "dead-letter-attachment-request",
      traceId: "c".repeat(32),
      traceparent: `00-${"c".repeat(32)}-${"d".repeat(16)}-01`,
      attachmentId: attachment.id,
      tenantClaim: "expired-attachment-claim",
      status: "failed",
      attempts: 5,
      maxAttempts: 5,
      lastError: "PDF_EXTRACTION_FAILED resident-card-private.pdf",
      completedAt: new Date("2026-08-13T01:10:00.000Z"),
    },
  });

  const listed = await listDeadLetters();
  assert.equal(listed.length, 4);
  assert.deepEqual(new Set(listed.map((item) => item.kind)), new Set(["worker", "outbox", "attachment"]));
  const serializedList = JSON.stringify(listed);
  assert.doesNotMatch(serializedList, /private@example|10-1111-2222|resident-card-private|must-not-list/);
  assert.match(serializedList, /OCR_TIMEOUT|DELIVERY_TIMEOUT|PDF_EXTRACTION_FAILED/);
  console.log("PASS DLQ listing: bounded operational metadata excludes payloads and raw failure PII");

  const customerContext = tenantContextFromOrganizationAssignment({
    tenantId: tenantA,
    userId: "customer-user",
    organizationId: "customer-org",
  });
  await assert.rejects(
    replayDeadLetter({
      operatorContext: customerContext,
      actor: "customer-user",
      kind: "worker",
      id: worker.id,
      reason: rawReason,
      confirmation: "REPLAY",
    }, prismaDeadLetterRepository),
    /PLATFORM_OPERATOR_AUTHORITY_REQUIRED/,
  );
  await assert.rejects(
    replayDeadLetter({
      operatorContext: platformServiceTenantContext("test-operator"),
      actor: "test-operator",
      kind: "worker",
      id: worker.id,
      reason: "짧음",
      confirmation: "REPLAY",
    }, prismaDeadLetterRepository),
    (error) => error instanceof DeadLetterReplayError && error.status === 400,
  );
  await assert.rejects(
    prismaDeadLetterRepository.replay(
      listed.find((item) => item.id === worker.id)!,
      platformOperatorTenantContext({ tenantId: tenantB, actor: "owner", authorized: true }),
      replayAt,
    ),
    /TENANT_ACCESS_DENIED/,
  );
  console.log("PASS replay authority: customer, malformed confirmation and cross-tenant repository access are rejected");

  const replayedWorker = await replayDeadLetter({
    operatorContext: platformServiceTenantContext("test-operator", replayAt.getTime()),
    actor: "owner@example.com",
    kind: "worker",
    id: worker.id,
    reason: rawReason,
    confirmation: "REPLAY",
    now: replayAt,
  }, prismaDeadLetterRepository);
  assert.equal(replayedWorker.status, "queued");
  const workerAfter = await db.workerJob.findUniqueOrThrow({ where: { id: worker.id } });
  assert.equal(workerAfter.status, "queued");
  assert.equal(workerAfter.attempts, 0);
  assert.equal(workerAfter.lastError, null);
  assert(workerAfter.deadlineAt && workerAfter.deadlineAt > replayAt, "expired deadline must be renewed");
  const workerClaim = verifyTenantClaim(workerAfter.tenantClaim || "", {
    audience: "worker",
    subject: `worker-job:${workerAfter.jobType}:${workerAfter.idempotencyKey}`,
    now: replayAt.getTime(),
  }, process.env);
  assert.equal(workerClaim.tenantId, tenantA);
  console.log("PASS Worker replay: lease state resets and a fresh target-tenant claim is issued");

  const attachmentItem = await prismaDeadLetterRepository.describe("attachment", attachmentJob.id);
  assert(attachmentItem);
  assert.equal(await prismaDeadLetterRepository.replay(
    attachmentItem,
    platformOperatorTenantContext({ tenantId: tenantA, actor: "owner@example.com", authorized: true, now: replayAt.getTime() }),
    replayAt,
  ), true);
  const attachmentAfter = await db.chatAttachment.findUniqueOrThrow({ where: { id: attachment.id } });
  const attachmentJobAfter = await db.chatAttachmentJob.findUniqueOrThrow({ where: { id: attachmentJob.id } });
  assert.equal(attachmentAfter.status, "quarantined");
  assert.equal(attachmentAfter.processingStatus, "queued");
  assert.equal(attachmentJobAfter.status, "queued");
  assert.equal(attachmentJobAfter.attempts, 0);
  assert.equal(verifyTenantClaim(attachmentJobAfter.tenantClaim || "", {
    audience: "worker",
    subject: `attachment:${attachment.id}`,
    now: replayAt.getTime(),
  }, process.env).tenantId, tenantA);
  console.log("PASS attachment replay: job and attachment state reconcile in one transaction");

  const concurrentResults = await Promise.allSettled([
    replayDeadLetter({
      operatorContext: platformServiceTenantContext("operator-one"),
      actor: "operator-one",
      kind: "outbox",
      id: concurrentOutbox.id,
      reason: "동시 재실행 원자성 검증 첫 번째 요청",
      confirmation: "REPLAY",
      now: replayAt,
    }, prismaDeadLetterRepository),
    replayDeadLetter({
      operatorContext: platformServiceTenantContext("operator-two"),
      actor: "operator-two",
      kind: "outbox",
      id: concurrentOutbox.id,
      reason: "동시 재실행 원자성 검증 두 번째 요청",
      confirmation: "REPLAY",
      now: replayAt,
    }, prismaDeadLetterRepository),
  ]);
  assert.equal(concurrentResults.filter((result) => result.status === "fulfilled").length, 1);
  const rejectedConcurrent = concurrentResults.find((result) => result.status === "rejected");
  assert(
    rejectedConcurrent?.status === "rejected"
      && rejectedConcurrent.reason instanceof DeadLetterReplayError
      && rejectedConcurrent.reason.status === 409,
    "the losing concurrent replay must surface a conflict",
  );
  assert.equal((await db.outboxEvent.findUniqueOrThrow({ where: { id: concurrentOutbox.id } })).status, "retry");
  console.log("PASS concurrent replay: compare-and-set permits one operator and returns one 409 conflict");

  process.env.ADMIN_API_KEY_ROLE = "admin";
  const forbidden = await replayRoute.POST(
    ownerRequest(outbox.id, { kind: "outbox", reason: rawReason, confirmation: "REPLAY" }),
    { params: Promise.resolve({ id: outbox.id }) },
  );
  assert.equal(forbidden.status, 403);
  assert.equal((await db.outboxEvent.findUniqueOrThrow({ where: { id: outbox.id } })).status, "dead_letter");

  process.env.ADMIN_API_KEY_ROLE = "owner";
  const accepted = await replayRoute.POST(
    ownerRequest(outbox.id, { kind: "outbox", reason: rawReason, confirmation: "REPLAY" }),
    { params: Promise.resolve({ id: outbox.id }) },
  );
  assert.equal(accepted.status, 202, JSON.stringify(await responseJson(accepted.clone())));
  const outboxAfter = await db.outboxEvent.findUniqueOrThrow({ where: { id: outbox.id } });
  assert.equal(outboxAfter.status, "retry");
  assert.equal(outboxAfter.attempts, 0);
  assert.equal(outboxAfter.idempotencyKey, outbox.idempotencyKey);

  const duplicate = await replayRoute.POST(
    ownerRequest(outbox.id, { kind: "outbox", reason: rawReason, confirmation: "REPLAY" }),
    { params: Promise.resolve({ id: outbox.id }) },
  );
  assert.equal(duplicate.status, 404, "a replayed row is no longer discoverable as a dead letter");
  const audits = await db.adminAuditLog.findMany({
    where: { action: "admin.ops.dead_letter.replay", targetId: outbox.id },
    orderBy: { createdAt: "asc" },
  });
  assert.equal(audits.length, 2, "accepted and duplicate owner attempts must be audited");
  assert.equal(audits[0].success, true);
  assert.equal(audits[1].success, false);
  assert.match(audits[0].metadata || "", /reasonDigest/);
  assert.doesNotMatch(audits.map((item) => item.metadata).join("\n"), new RegExp(rawReason));
  assert.match(audits[0].metadata || "", new RegExp(tenantA));
  console.log("PASS owner API: RBAC, stable idempotency, conflict visibility and PII-safe audit evidence verified");

  const runbook = readFileSync("docs/runbooks/worker-replay-and-reconciliation.md", "utf8");
  for (const required of [
    "owner",
    "REPLAY",
    "reasonDigest",
    "tenantId",
    "Stop-the-line",
    "reconciliation",
    "/api/admin/ops/dead-letters/",
  ]) {
    assert(runbook.includes(required), `runbook must include ${required}`);
  }
  console.log("PASS runbook rehearsal: authority, preflight, stop conditions, replay and reconciliation evidence are documented");
} finally {
  await db.$disconnect();
}
