import { runtimeEnvironment } from "@/infrastructure/config/runtime-environment";
import { db } from "@/lib/db";
import {
  assertSameTenant,
  assertTenantContext,
  signTenantClaim,
  type TenantContext,
} from "@/application/tenancy/tenant-context";
import type {
  DeadLetterItem,
  DeadLetterKind,
  DeadLetterRepository,
} from "@/application/ops/dead-letter";

function failureCode(value: string | null | undefined) {
  const normalized = value?.trim() || "UNKNOWN_FAILURE";
  const explicit = normalized.match(/\b[A-Z][A-Z0-9_]{3,80}\b/)?.[0];
  return explicit || "PROCESSING_FAILED";
}

export async function listDeadLetters(limit = 50): Promise<DeadLetterItem[]> {
  const take = Math.min(100, Math.max(1, Math.trunc(limit)));
  const [workers, outbox, attachments] = await Promise.all([
    db.workerJob.findMany({
      where: { status: "dead_letter" },
      orderBy: { completedAt: "desc" },
      take,
      select: { id: true, tenantId: true, jobType: true, status: true, attempts: true, maxAttempts: true, traceId: true, createdAt: true, completedAt: true, lastError: true },
    }),
    db.outboxEvent.findMany({
      where: { status: "dead_letter" },
      orderBy: { updatedAt: "desc" },
      take,
      select: { id: true, tenantId: true, eventType: true, status: true, attempts: true, maxAttempts: true, traceId: true, createdAt: true, updatedAt: true, lastError: true },
    }),
    db.chatAttachmentJob.findMany({
      where: { status: "failed" },
      orderBy: { completedAt: "desc" },
      take,
      select: { id: true, tenantId: true, status: true, attempts: true, maxAttempts: true, attachmentId: true, createdAt: true, completedAt: true, lastError: true },
    }),
  ]);
  return [
    ...workers.map((item): DeadLetterItem => ({
      kind: "worker", id: item.id, tenantId: item.tenantId, queue: `worker:${item.jobType}`,
      status: "dead_letter", attempts: item.attempts, maxAttempts: item.maxAttempts,
      traceId: item.traceId, createdAt: item.createdAt, completedAt: item.completedAt,
      failureCode: failureCode(item.lastError),
    })),
    ...outbox.map((item): DeadLetterItem => ({
      kind: "outbox", id: item.id, tenantId: item.tenantId, queue: `outbox:${item.eventType}`,
      status: "dead_letter", attempts: item.attempts, maxAttempts: item.maxAttempts,
      traceId: item.traceId, createdAt: item.createdAt, completedAt: item.updatedAt,
      failureCode: failureCode(item.lastError),
    })),
    ...attachments.map((item): DeadLetterItem => ({
      kind: "attachment", id: item.id, tenantId: item.tenantId, queue: "attachments",
      status: "failed", attempts: item.attempts, maxAttempts: item.maxAttempts,
      traceId: null, createdAt: item.createdAt, completedAt: item.completedAt,
      failureCode: failureCode(item.lastError),
    })),
  ].sort((left, right) => (right.completedAt?.getTime() || 0) - (left.completedAt?.getTime() || 0)).slice(0, take);
}

async function describe(kind: DeadLetterKind, id: string): Promise<DeadLetterItem | null> {
  if (kind === "worker") {
    const item = await db.workerJob.findFirst({
      where: { id, status: "dead_letter" },
      select: { id: true, tenantId: true, jobType: true, attempts: true, maxAttempts: true, traceId: true, createdAt: true, completedAt: true, lastError: true },
    });
    return item ? {
      kind, id: item.id, tenantId: item.tenantId, queue: `worker:${item.jobType}`, status: "dead_letter",
      attempts: item.attempts, maxAttempts: item.maxAttempts, traceId: item.traceId,
      createdAt: item.createdAt, completedAt: item.completedAt, failureCode: failureCode(item.lastError),
    } : null;
  }
  if (kind === "outbox") {
    const item = await db.outboxEvent.findFirst({
      where: { id, status: "dead_letter" },
      select: { id: true, tenantId: true, eventType: true, attempts: true, maxAttempts: true, traceId: true, createdAt: true, updatedAt: true, lastError: true },
    });
    return item ? {
      kind, id: item.id, tenantId: item.tenantId, queue: `outbox:${item.eventType}`, status: "dead_letter",
      attempts: item.attempts, maxAttempts: item.maxAttempts, traceId: item.traceId,
      createdAt: item.createdAt, completedAt: item.updatedAt, failureCode: failureCode(item.lastError),
    } : null;
  }
  const item = await db.chatAttachmentJob.findFirst({
    where: { id, status: "failed" },
    select: { id: true, tenantId: true, attempts: true, maxAttempts: true, createdAt: true, completedAt: true, lastError: true },
  });
  return item ? {
    kind, id: item.id, tenantId: item.tenantId, queue: "attachments", status: "failed",
    attempts: item.attempts, maxAttempts: item.maxAttempts, traceId: null,
    createdAt: item.createdAt, completedAt: item.completedAt, failureCode: failureCode(item.lastError),
  } : null;
}

async function replay(item: DeadLetterItem, tenantContext: TenantContext, now: Date): Promise<boolean> {
  assertTenantContext(tenantContext);
  assertSameTenant(tenantContext, item.tenantId);
  if (tenantContext.source !== "platform-operator") throw new Error("PLATFORM_OPERATOR_AUTHORITY_REQUIRED");

  if (item.kind === "worker") {
    const current = await db.workerJob.findFirst({ where: { id: item.id, tenantId: item.tenantId, status: "dead_letter" } });
    if (!current) return false;
    const deadlineAt = !current.deadlineAt || current.deadlineAt > now
      ? current.deadlineAt
      : new Date(now.getTime() + Math.min(24 * 60 * 60_000, Math.max(60 * 60_000, current.timeoutMs * 2)));
    const tenantClaim = signTenantClaim(tenantContext, {
      audience: "worker",
      subject: `worker-job:${current.jobType}:${current.idempotencyKey}`,
      now: now.getTime(),
    }, runtimeEnvironment());
    const updated = await db.workerJob.updateMany({
      where: { id: item.id, tenantId: item.tenantId, status: "dead_letter" },
      data: { status: "queued", attempts: 0, availableAt: now, completedAt: null, startedAt: null, lockedAt: null, heartbeatAt: null, lockToken: null, lastError: null, deadlineAt, tenantClaim },
    });
    return updated.count === 1;
  }

  if (item.kind === "outbox") {
    const updated = await db.outboxEvent.updateMany({
      where: { id: item.id, tenantId: item.tenantId, status: "dead_letter" },
      data: { status: "retry", attempts: 0, availableAt: now, lockedAt: null, lockToken: null, lastError: null, processedAt: null },
    });
    return updated.count === 1;
  }

  const current = await db.chatAttachmentJob.findFirst({
    where: { id: item.id, tenantId: item.tenantId, status: "failed" },
    select: { attachmentId: true },
  });
  if (!current) return false;
  const tenantClaim = signTenantClaim(tenantContext, {
    audience: "worker",
    subject: `attachment:${current.attachmentId}`,
    now: now.getTime(),
  }, runtimeEnvironment());
  const replayed = await db.$transaction(async (tx) => {
    const updated = await tx.chatAttachmentJob.updateMany({
      where: { id: item.id, tenantId: item.tenantId, status: "failed" },
      data: { status: "queued", attempts: 0, availableAt: now, completedAt: null, lockedAt: null, lockToken: null, lastError: null, tenantClaim },
    });
    if (updated.count !== 1) return false;
    await tx.chatAttachment.updateMany({
      where: { id: current.attachmentId, tenantId: item.tenantId },
      data: { status: "quarantined", processingStatus: "queued", processedAt: null, deletedAt: null },
    });
    return true;
  });
  return replayed;
}

export const prismaDeadLetterRepository: DeadLetterRepository = { describe, replay };
