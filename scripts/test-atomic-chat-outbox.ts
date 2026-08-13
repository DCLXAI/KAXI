import assert from "node:assert/strict";
import { prepareTestDb } from "./prepare-test-db";

prepareTestDb("atomic chat outbox");
process.env.NODE_ENV = "test";
process.env.DATA_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.PII_HASH_SECRET = "atomic-chat-outbox-hash-secret-with-sufficient-length";

const { db } = await import("../src/lib/db");
const { persistAtomicChatTurn } = await import("../src/infrastructure/chat/prisma-chat-unit-of-work");
const { processOutboxBatch } = await import("../src/application/outbox/process-outbox");
const { prismaOutboxRepository } = await import("../src/infrastructure/outbox/repository");
const { PLATFORM_TENANT_ID, platformServiceTenantContext } = await import("../src/application/tenancy/tenant-context");
const tenantContext = platformServiceTenantContext("atomic-chat-outbox-test");

function input(overrides: Record<string, unknown> = {}) {
  return {
    requestId: crypto.randomUUID(),
    idempotencyKey: `atomic-${crypto.randomUUID()}`,
    traceId: `trace-${crypto.randomUUID()}`,
    sessionKey: `session-${crypto.randomUUID()}`,
    tenantContext,
    locale: "ko",
    source: "typebot",
    question: "D-4 비자 연장과 필요한 서류를 알려주세요.",
    answer: "공식 출처를 확인하고 만료 전에 신청하세요.",
    riskLevel: "medium",
    needsHuman: true,
    leadStage: "review",
    nextStep: "행정사 검토",
    provenance: {
      workflowId: "atomic-test",
      workflowVersionId: "atomic-test@v1",
      modelVersion: "fixture-model",
      promptVersion: "fixture-prompt@v1",
    },
    sources: [{ id: "official-source", title: "공식 출처" }],
    searchMeta: {
      type: "hybrid",
      category: "visa",
      retrievedCount: 1,
      topScore: 0.91,
      noContext: false,
    },
    ...overrides,
  };
}

try {
  const retrievalFailure = input();
  await assert.rejects(
    persistAtomicChatTurn(retrievalFailure, {
      failureInjection: { beforeRetrieval: () => { throw new Error("injected retrieval failure"); } },
    }),
    /injected retrieval failure/,
  );
  assert.equal(await db.chatSession.count({ where: { sessionKey: retrievalFailure.sessionKey } }), 0);
  assert.equal(await db.chatMessage.count({ where: { idempotencyKey: retrievalFailure.idempotencyKey } }), 0);
  assert.equal(await db.retrievalRun.count({ where: { requestId: retrievalFailure.requestId } }), 0);
  assert.equal(await db.handoffTask.count({ where: { sessionKey: retrievalFailure.sessionKey } }), 0);
  assert.equal(await db.outboxEvent.count({ where: { idempotencyKey: retrievalFailure.idempotencyKey } }), 0);
  console.log("PASS atomic rollback: retrieval failure leaves no partial message/session/handoff/outbox");

  const handoffFailure = input();
  await assert.rejects(
    persistAtomicChatTurn(handoffFailure, {
      failureInjection: { beforeHandoff: () => { throw new Error("injected handoff failure"); } },
    }),
    /injected handoff failure/,
  );
  assert.equal(await db.chatMessage.count({ where: { idempotencyKey: handoffFailure.idempotencyKey } }), 0);
  assert.equal(await db.retrievalRun.count({ where: { requestId: handoffFailure.requestId } }), 0);
  assert.equal(await db.handoffTask.count({ where: { sessionKey: handoffFailure.sessionKey } }), 0);
  assert.equal(await db.outboxEvent.count({ where: { idempotencyKey: handoffFailure.idempotencyKey } }), 0);
  console.log("PASS atomic rollback: required handoff failure rejects the whole accepted turn");

  const attachmentStorageKey = `atomic/${crypto.randomUUID()}.pdf`;
  const successful = input({
    attachments: [{
      bucket: "chat-attachments",
      storageKey: attachmentStorageKey,
      name: "visa.pdf",
      size: 128,
      type: "application/pdf",
      sha256: "a".repeat(64),
    }],
  });
  await db.chatSession.create({
    data: {
      sessionKey: successful.sessionKey,
      tenantId: PLATFORM_TENANT_ID,
      locale: "ko",
      source: "typebot",
      channel: "typebot",
    },
  });
  const attachment = await db.chatAttachment.create({
    data: {
      tenantId: PLATFORM_TENANT_ID,
      sessionKey: successful.sessionKey,
      bucket: "chat-attachments",
      storageKey: attachmentStorageKey,
      originalName: "visa.pdf",
      mimeType: "application/pdf",
      sizeBytes: 128,
      sha256: "a".repeat(64),
    },
  });
  const results = await Promise.all(
    Array.from({ length: 10 }, () => persistAtomicChatTurn(successful)),
  );
  assert.equal(new Set(results.map((result) => result.id.toString())).size, 1);
  assert.equal(new Set(results.map((result) => result.outboxEventId)).size, 1);
  assert.equal(results.every((result) => result.persistenceAccepted && result.handoffTaskPersisted), true);
  assert.equal(await db.chatMessage.count({ where: { idempotencyKey: successful.idempotencyKey } }), 1);
  assert.equal(await db.retrievalRun.count({ where: { requestId: successful.requestId } }), 1);
  assert.equal(await db.handoffTask.count({ where: { sessionKey: successful.sessionKey } }), 1);
  assert.equal(await db.outboxEvent.count({ where: { idempotencyKey: successful.idempotencyKey } }), 1);
  const linked = await db.chatAttachment.findUniqueOrThrow({ where: { id: attachment.id } });
  assert.equal(linked.messageId?.toString(), results[0].id.toString());

  const outbox = await db.outboxEvent.findFirstOrThrow({
    where: { idempotencyKey: successful.idempotencyKey },
  });
  const serializedPayload = JSON.stringify(outbox.payload).toLowerCase();
  assert.equal(outbox.requestId, successful.requestId);
  assert.doesNotMatch(serializedPayload, /비자 연장|공식 출처를 확인|email|phone|contact/);
  assert.equal(outbox.eventType, "handoff.created");
  console.log("PASS idempotency: 10 parallel retries yield one message/retrieval/handoff/outbox and one attachment link");
  console.log("PASS privacy: outbox payload contains identifiers and routing metadata, not conversation PII");

  let providerAvailable = false;
  const delivered = new Set<string>();
  const deliver = async (_event: unknown, context: { deliveryKey: string; requestId: string; traceId: string }) => {
    if (!providerAvailable) throw new Error("simulated provider outage");
    assert.equal(context.requestId, successful.requestId);
    assert.equal(context.traceId, successful.traceId);
    delivered.add(context.deliveryKey);
  };
  const outageAt = new Date(Date.now() + 1_000);
  const failedDelivery = await processOutboxBatch({ repository: prismaOutboxRepository, deliver, now: outageAt });
  assert.deepEqual(failedDelivery, { claimed: 1, processed: 0, retried: 1, deadLettered: 0 });
  const queuedHandoff = await db.handoffTask.findFirstOrThrow({ where: { sessionKey: successful.sessionKey } });
  assert.equal(queuedHandoff.status, "open", "handoff must remain immediately visible while provider is down");
  assert.equal((await db.outboxEvent.findUniqueOrThrow({ where: { id: outbox.id } })).status, "retry");

  providerAvailable = true;
  const recoveryAt = new Date(outageAt.getTime() + 30 * 60_000);
  const recovered = await processOutboxBatch({ repository: prismaOutboxRepository, deliver, now: recoveryAt });
  assert.deepEqual(recovered, { claimed: 1, processed: 1, retried: 0, deadLettered: 0 });
  assert.equal(delivered.has(outbox.id), true);
  assert.equal((await db.outboxEvent.findUniqueOrThrow({ where: { id: outbox.id } })).status, "processed");
  assert.deepEqual(
    await processOutboxBatch({ repository: prismaOutboxRepository, deliver, now: new Date(recoveryAt.getTime() + 60_000) }),
    { claimed: 0, processed: 0, retried: 0, deadLettered: 0 },
  );
  console.log("PASS outbox retry: handoff stays visible during a 30-minute outage and delivers once after recovery");
} finally {
  await db.$disconnect();
}
