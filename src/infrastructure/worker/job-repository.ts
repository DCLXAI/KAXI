import { runtimeEnvironment } from "@/infrastructure/config/runtime-environment";
import { randomUUID } from "crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { parseTraceparent } from "@/infrastructure/observability/trace-context";
import {
  assertTenantContext,
  signTenantClaim,
  type TenantContext,
} from "@/application/tenancy/tenant-context";

export const WORKER_JOB_TYPES = [
  "official-source-monitor",
  "rag-serving-ingest",
  "rag-serving-sync",
  "embedding-sync",
  "document-ocr",
  "document-verify",
  "document-verify-set",
  "rag-system-health",
] as const;

export type WorkerJobType = typeof WORKER_JOB_TYPES[number];

export interface ClaimedWorkerJob {
  id: string;
  tenantId: string;
  requestId: string;
  jobType: WorkerJobType;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  traceId: string;
  traceparent: string | null;
  tenantClaim: string | null;
  attempts: number;
  maxAttempts: number;
  timeoutMs: number;
  deadlineAt: Date | null;
  lockToken: string;
}

type ClaimedRow = {
  id: string;
  tenant_id: string;
  request_id: string;
  job_type: WorkerJobType;
  idempotency_key: string;
  payload: unknown;
  trace_id: string;
  traceparent: string | null;
  tenant_claim: string | null;
  attempts: number;
  max_attempts: number;
  timeout_ms: number;
  deadline_at: Date | null;
  lock_token: string;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value || {})) as Prisma.InputJsonValue;
}

export async function enqueueWorkerJob(input: {
  tenantContext: TenantContext;
  requestId: string;
  jobType: WorkerJobType;
  idempotencyKey: string;
  payload?: Record<string, unknown>;
  traceId: string;
  traceparent?: string | null;
  maxAttempts?: number;
  timeoutMs?: number;
  deadlineAt?: Date | null;
  availableAt?: Date;
}, client: PrismaClient = db) {
  assertTenantContext(input.tenantContext);
  const tenantId = input.tenantContext.tenantId;
  if (!WORKER_JOB_TYPES.includes(input.jobType)) throw new Error("WORKER_JOB_TYPE_INVALID");
  if (!input.requestId.trim() || input.requestId.length > 128) throw new Error("WORKER_REQUEST_ID_INVALID");
  if (!input.idempotencyKey.trim()) throw new Error("WORKER_IDEMPOTENCY_KEY_REQUIRED");
  const traceparent = input.traceparent && parseTraceparent(input.traceparent)
    ? input.traceparent.toLowerCase()
    : null;
  return client.workerJob.upsert({
    where: {
      tenantId_jobType_idempotencyKey: {
        tenantId,
        jobType: input.jobType,
        idempotencyKey: input.idempotencyKey,
      },
    },
    create: {
      tenantId,
      requestId: input.requestId.trim(),
      jobType: input.jobType,
      idempotencyKey: input.idempotencyKey,
      payload: json(input.payload),
      traceId: input.traceId,
      traceparent,
      tenantClaim: signTenantClaim(input.tenantContext, {
        audience: "worker",
        subject: `worker-job:${input.jobType}:${input.idempotencyKey}`,
      }, runtimeEnvironment()),
      maxAttempts: Math.min(50, Math.max(1, Math.trunc(input.maxAttempts || 8))),
      timeoutMs: Math.min(3_600_000, Math.max(1_000, Math.trunc(input.timeoutMs || 300_000))),
      deadlineAt: input.deadlineAt || null,
      availableAt: input.availableAt || new Date(),
    },
    update: {},
    select: {
      id: true,
      status: true,
      attempts: true,
      createdAt: true,
      completedAt: true,
    },
  });
}

export async function claimWorkerJobs(options: {
  tenantContext: TenantContext;
  client?: PrismaClient;
  limit?: number;
  leaseMs?: number;
  now?: Date;
}): Promise<ClaimedWorkerJob[]> {
  assertTenantContext(options.tenantContext);
  const client = options.client || db;
  const limit = Math.min(25, Math.max(1, Math.trunc(options.limit || 5)));
  const now = options.now || new Date();
  const leaseMs = Math.max(5_000, Math.trunc(options.leaseMs || 90_000));
  const staleAt = new Date(now.getTime() - leaseMs);
  const lockToken = randomUUID();

  await client.workerJob.updateMany({
    where: {
      tenantId: options.tenantContext.tenantId,
      status: { in: ["queued", "retry"] },
      deadlineAt: { lt: now },
    },
    data: {
      status: "dead_letter",
      completedAt: now,
      lastError: "WORKER_JOB_DEADLINE_EXCEEDED",
    },
  });

  const rows = await client.$transaction((tx) => tx.$queryRaw<ClaimedRow[]>(Prisma.sql`
    WITH candidates AS (
      SELECT id
      FROM public.worker_jobs
      WHERE attempts < max_attempts
        AND tenant_id = ${options.tenantContext.tenantId}
        AND (deadline_at IS NULL OR deadline_at > ${now})
        AND (
          (status IN ('queued', 'retry') AND available_at <= ${now})
          OR (
            status = 'processing'
            AND COALESCE(heartbeat_at, locked_at) <= ${staleAt}
          )
        )
      ORDER BY available_at ASC, created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    )
    UPDATE public.worker_jobs job
    SET
      status = 'processing',
      attempts = job.attempts + 1,
      locked_at = ${now},
      heartbeat_at = ${now},
      lock_token = ${lockToken}::uuid,
      started_at = COALESCE(job.started_at, ${now}),
      last_error = NULL,
      updated_at = ${now}
    FROM candidates
    WHERE job.id = candidates.id
    RETURNING
      job.id::text,
      job.tenant_id,
      job.request_id,
      job.job_type,
      job.idempotency_key,
      job.payload,
      job.trace_id,
      job.traceparent,
      job.tenant_claim,
      job.attempts,
      job.max_attempts,
      job.timeout_ms,
      job.deadline_at,
      job.lock_token::text
  `));

  return rows.map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    requestId: row.request_id,
    jobType: row.job_type,
    idempotencyKey: row.idempotency_key,
    payload: record(row.payload),
    traceId: row.trace_id,
    traceparent: row.traceparent,
    tenantClaim: row.tenant_claim,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    timeoutMs: row.timeout_ms,
    deadlineAt: row.deadline_at,
    lockToken: row.lock_token,
  }));
}

export async function heartbeatWorkerJob(
  job: Pick<ClaimedWorkerJob, "id" | "lockToken">,
  client: PrismaClient = db,
) {
  const updated = await client.workerJob.updateMany({
    where: { id: job.id, lockToken: job.lockToken, status: "processing" },
    data: { heartbeatAt: new Date() },
  });
  if (updated.count !== 1) throw new Error("WORKER_JOB_LEASE_LOST");
}

export async function completeWorkerJob(
  job: Pick<ClaimedWorkerJob, "id" | "lockToken">,
  result: unknown,
  client: PrismaClient = db,
) {
  const updated = await client.workerJob.updateMany({
    where: { id: job.id, lockToken: job.lockToken, status: "processing" },
    data: {
      status: "completed",
      result: json(result),
      completedAt: new Date(),
      lockedAt: null,
      lockToken: null,
      heartbeatAt: null,
      lastError: null,
    },
  });
  if (updated.count !== 1) throw new Error("WORKER_JOB_LEASE_LOST");
}

export function workerRetryDelayMs(attempt: number) {
  return Math.min(30 * 60_000, 5_000 * (2 ** Math.min(9, Math.max(0, attempt - 1))));
}

export async function failWorkerJob(
  job: Pick<ClaimedWorkerJob, "id" | "lockToken" | "attempts" | "maxAttempts">,
  error: unknown,
  options: { client?: PrismaClient; now?: Date } = {},
) {
  const client = options.client || db;
  const now = options.now || new Date();
  const deadLetter = job.attempts >= job.maxAttempts;
  const updated = await client.workerJob.updateMany({
    where: { id: job.id, lockToken: job.lockToken, status: "processing" },
    data: {
      status: deadLetter ? "dead_letter" : "retry",
      availableAt: deadLetter ? now : new Date(now.getTime() + workerRetryDelayMs(job.attempts)),
      completedAt: deadLetter ? now : null,
      lockedAt: null,
      lockToken: null,
      heartbeatAt: null,
      lastError: (error instanceof Error ? error.message : String(error)).slice(0, 1_000),
    },
  });
  if (updated.count !== 1) throw new Error("WORKER_JOB_LEASE_LOST");
  return { deadLetter };
}

type MetricRow = {
  queue: string;
  depth: bigint;
  retry_count: bigint;
  dead_letter_count: bigint;
  oldest_age_seconds: number | null;
};

export async function getWorkerQueueMetrics(client: PrismaClient = db) {
  const rows = await client.$queryRaw<MetricRow[]>(Prisma.sql`
    SELECT
      'worker:' || job_type AS queue,
      count(*) FILTER (WHERE status IN ('queued', 'retry', 'processing'))::bigint AS depth,
      count(*) FILTER (WHERE status = 'retry')::bigint AS retry_count,
      count(*) FILTER (WHERE status = 'dead_letter')::bigint AS dead_letter_count,
      EXTRACT(EPOCH FROM (now() - min(created_at) FILTER (WHERE status IN ('queued', 'retry', 'processing'))))::float8 AS oldest_age_seconds
    FROM public.worker_jobs
    GROUP BY job_type
    UNION ALL
    SELECT
      'outbox' AS queue,
      count(*) FILTER (WHERE status IN ('queued', 'retry', 'processing'))::bigint,
      count(*) FILTER (WHERE status = 'retry')::bigint,
      count(*) FILTER (WHERE status = 'dead_letter')::bigint,
      EXTRACT(EPOCH FROM (now() - min(created_at) FILTER (WHERE status IN ('queued', 'retry', 'processing'))))::float8
    FROM public.outbox_events
    UNION ALL
    SELECT
      'attachments' AS queue,
      count(*) FILTER (WHERE status IN ('queued', 'processing'))::bigint,
      count(*) FILTER (WHERE status = 'queued' AND attempts > 0)::bigint,
      count(*) FILTER (WHERE status = 'failed')::bigint,
      EXTRACT(EPOCH FROM (now() - min(created_at) FILTER (WHERE status IN ('queued', 'processing'))))::float8
    FROM public.chat_attachment_jobs
  `);
  return rows.map((row) => ({
    queue: row.queue,
    depth: Number(row.depth),
    retryCount: Number(row.retry_count),
    deadLetterCount: Number(row.dead_letter_count),
    oldestAgeSeconds: row.oldest_age_seconds === null ? null : Math.max(0, row.oldest_age_seconds),
  }));
}

export async function getWorkerJobStatus(id: string, tenantId: string, client: PrismaClient = db) {
  return client.workerJob.findFirst({
    where: { id, tenantId },
    select: {
      id: true,
      jobType: true,
      status: true,
      attempts: true,
      maxAttempts: true,
      createdAt: true,
      startedAt: true,
      completedAt: true,
      lastError: true,
      result: true,
    },
  });
}
