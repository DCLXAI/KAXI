import { randomUUID } from "crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import type { OutboxRepository } from "@/application/outbox/process-outbox";

export interface ClaimedOutboxEvent {
  id: string;
  tenantId: string;
  requestId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  traceId: string;
  attempts: number;
  maxAttempts: number;
  lockToken: string;
}

type ClaimedRow = {
  id: string;
  tenant_id: string;
  request_id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  idempotency_key: string;
  payload: unknown;
  trace_id: string;
  attempts: number;
  max_attempts: number;
  lock_token: string;
};

function payload(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export async function claimOutboxEvents(options: {
  client?: PrismaClient;
  limit?: number;
  leaseMs?: number;
  now?: Date;
} = {}): Promise<ClaimedOutboxEvent[]> {
  const client = options.client || db;
  const limit = Math.min(100, Math.max(1, Math.trunc(options.limit || 25)));
  const now = options.now || new Date();
  const leaseMs = Math.max(5_000, Math.trunc(options.leaseMs || 60_000));
  const staleAt = new Date(now.getTime() - leaseMs);
  const lockToken = randomUUID();

  const rows = await client.$transaction((tx) => tx.$queryRaw<ClaimedRow[]>(Prisma.sql`
    WITH candidates AS (
      SELECT id
      FROM public.outbox_events
      WHERE (
        status IN ('queued', 'retry')
        AND available_at <= ${now}
      ) OR (
        status = 'processing'
        AND locked_at <= ${staleAt}
      )
      ORDER BY available_at ASC, created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    )
    UPDATE public.outbox_events event
    SET
      status = 'processing',
      attempts = event.attempts + 1,
      locked_at = ${now},
      lock_token = ${lockToken}::uuid,
      updated_at = ${now}
    FROM candidates
    WHERE event.id = candidates.id
    RETURNING
      event.id::text,
      event.tenant_id,
      event.request_id,
      event.aggregate_type,
      event.aggregate_id,
      event.event_type,
      event.idempotency_key,
      event.payload,
      event.trace_id,
      event.attempts,
      event.max_attempts,
      event.lock_token::text
  `));

  return rows.map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    requestId: row.request_id,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    eventType: row.event_type,
    idempotencyKey: row.idempotency_key,
    payload: payload(row.payload),
    traceId: row.trace_id,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    lockToken: row.lock_token,
  }));
}

export async function markOutboxProcessed(
  event: Pick<ClaimedOutboxEvent, "id" | "lockToken">,
  client: PrismaClient = db,
) {
  const updated = await client.outboxEvent.updateMany({
    where: { id: event.id, lockToken: event.lockToken, status: "processing" },
    data: {
      status: "processed",
      processedAt: new Date(),
      lockedAt: null,
      lockToken: null,
      lastError: null,
    },
  });
  if (updated.count !== 1) throw new Error("OUTBOX_LEASE_LOST");
}

export const prismaOutboxRepository: OutboxRepository = {
  claim: (options) => claimOutboxEvents(options),
  markProcessed: async (event) => { await markOutboxProcessed(event); },
  markFailed: (event, error, options) => markOutboxFailed(event, error, options),
};

export function outboxRetryDelayMs(attempt: number): number {
  const exponent = Math.min(10, Math.max(0, attempt - 1));
  return Math.min(30 * 60_000, 1_000 * (2 ** exponent));
}

export async function markOutboxFailed(
  event: Pick<ClaimedOutboxEvent, "id" | "lockToken" | "attempts" | "maxAttempts">,
  error: unknown,
  options: { client?: PrismaClient; now?: Date } = {},
) {
  const client = options.client || db;
  const now = options.now || new Date();
  const deadLetter = event.attempts >= event.maxAttempts;
  const updated = await client.outboxEvent.updateMany({
    where: { id: event.id, lockToken: event.lockToken, status: "processing" },
    data: {
      status: deadLetter ? "dead_letter" : "retry",
      availableAt: deadLetter ? now : new Date(now.getTime() + outboxRetryDelayMs(event.attempts)),
      lockedAt: null,
      lockToken: null,
      lastError: (error instanceof Error ? error.message : String(error)).slice(0, 1_000),
    },
  });
  if (updated.count !== 1) throw new Error("OUTBOX_LEASE_LOST");
  return { deadLetter };
}
