import { runtimeEnvironment } from "@/infrastructure/config/runtime-environment";
import {
  claimWorkerJobs,
  completeWorkerJob,
  failWorkerJob,
  getWorkerQueueMetrics,
  heartbeatWorkerJob,
  type ClaimedWorkerJob,
} from "@/infrastructure/worker/job-repository";
import { newTraceContext, parseTraceparent } from "@/infrastructure/observability/trace-context";
import { structuredLog } from "@/infrastructure/observability/structured-log";
import { withSpan } from "@/infrastructure/observability/tracing";
import { processOutboxBatch } from "@/application/outbox/process-outbox";
import { prismaOutboxRepository } from "@/infrastructure/outbox/repository";
import { deliverOperationalOutboxEvent } from "@/infrastructure/outbox/ops-delivery";
import { recordOpsEvent } from "@/lib/ops/events";
import { processGenericWorkerJob } from "@/worker/handlers/generic-job";
import { enqueueScheduledWorkerJobs } from "@/worker/scheduler";
import { reconcileAttachmentPromotions } from "@/worker/attachment-promotion-saga";
import {
  assertSameTenant,
  platformServiceTenantContext,
  verifyTenantClaim,
} from "@/application/tenancy/tenant-context";

export interface WorkerCycleResult {
  jobs: { claimed: number; completed: number; retried: number; deadLettered: number };
  outbox: { claimed: number; processed: number; retried: number; deadLettered: number };
  attachments: { available: boolean; claimed: number; completed: number; retried: number; failed: number };
}

async function runClaimedJob(job: ClaimedWorkerJob) {
  const parent = parseTraceparent(job.traceparent) || newTraceContext();
  const controller = new AbortController();
  const deadlineMs = job.deadlineAt
    ? Math.max(0, job.deadlineAt.getTime() - Date.now())
    : job.timeoutMs;
  const timeout = setTimeout(() => controller.abort(new Error("WORKER_JOB_TIMEOUT")), Math.min(job.timeoutMs, deadlineMs));
  const heartbeat = setInterval(() => {
    void heartbeatWorkerJob(job).catch(() => controller.abort(new Error("WORKER_JOB_LEASE_LOST")));
  }, Math.max(5_000, Math.min(30_000, Math.trunc(job.timeoutMs / 3))));
  try {
    const tenantContext = verifyTenantClaim(job.tenantClaim || "", {
      audience: "worker",
      subject: `worker-job:${job.jobType}:${job.idempotencyKey}`,
    }, runtimeEnvironment());
    assertSameTenant(tenantContext, job.tenantId);
    const result = await withSpan({
      name: `worker.job.${job.jobType}`,
      parent,
      attributes: {
        jobId: job.id,
        jobType: job.jobType,
        requestId: job.requestId,
        attempt: job.attempts,
        tenantId: job.tenantId,
      },
      run: () => processGenericWorkerJob(job, tenantContext, controller.signal),
    });
    if (controller.signal.aborted) throw controller.signal.reason;
    await completeWorkerJob(job, result);
    structuredLog({
      level: "info",
      event: "worker.job.completed",
      service: "kaxi-worker",
      trace: parent,
      fields: { jobId: job.id, jobType: job.jobType, attempts: job.attempts },
    });
    return "completed" as const;
  } catch (error) {
    const failed = await failWorkerJob(job, error);
    structuredLog({
      level: failed.deadLetter ? "error" : "warn",
      event: failed.deadLetter ? "worker.job.dead_lettered" : "worker.job.retry_scheduled",
      service: "kaxi-worker",
      trace: parent,
      fields: { jobId: job.id, jobType: job.jobType, attempts: job.attempts, error },
    });
    if (failed.deadLetter) {
      await recordOpsEvent({
        source: "kaxi-worker",
        severity: "critical",
        eventType: "worker_job_dead_lettered",
        message: `Worker job ${job.jobType} reached its retry limit.`,
        executionId: job.id,
        payload: { jobId: job.id, jobType: job.jobType, traceId: job.traceId, attempts: job.attempts },
      }).catch(() => undefined);
    }
    return failed.deadLetter ? "dead_lettered" as const : "retried" as const;
  } finally {
    clearTimeout(timeout);
    clearInterval(heartbeat);
  }
}

export async function runWorkerCycle(options: {
  jobLimit?: number;
  attachmentLimit?: number;
  outboxLimit?: number;
} = {}): Promise<WorkerCycleResult> {
  const tenantContext = platformServiceTenantContext("kaxi-worker-runner");
  await enqueueScheduledWorkerJobs();
  const jobs = await claimWorkerJobs({ tenantContext, limit: options.jobLimit || 3 });
  const jobStats = { claimed: jobs.length, completed: 0, retried: 0, deadLettered: 0 };
  for (const job of jobs) {
    const status = await runClaimedJob(job);
    if (status === "completed") jobStats.completed += 1;
    else if (status === "retried") jobStats.retried += 1;
    else jobStats.deadLettered += 1;
  }

  const outbox = await processOutboxBatch({
    repository: prismaOutboxRepository,
    deliver: deliverOperationalOutboxEvent,
    observeDelivery: (event, run) => withSpan({
      name: "outbox.delivery",
      parent: newTraceContext(event.traceId),
      attributes: {
        outboxEventId: event.id,
        eventType: event.eventType,
        tenantId: event.tenantId,
        requestId: event.requestId,
      },
      run: () => run(),
    }),
    limit: options.outboxLimit || 25,
  });
  const { drainChatAttachmentJobs } = await import("@/worker/handlers/attachments");
  const attachments = await drainChatAttachmentJobs({ limit: options.attachmentLimit || 3 });
  await reconcileAttachmentPromotions({ tenantContext, limit: 25 });
  const metrics = await getWorkerQueueMetrics();
  const breaches = metrics.filter((metric) =>
    metric.deadLetterCount > 0
    || metric.depth >= 100
    || (metric.oldestAgeSeconds !== null && metric.oldestAgeSeconds >= 15 * 60)
  );
  const hourBucket = new Date().toISOString().slice(0, 13);
  for (const breach of breaches) {
    await recordOpsEvent({
      source: "kaxi-worker",
      severity: breach.deadLetterCount > 0 ? "critical" : "error",
      eventType: "worker_queue_slo_breached",
      message: `Worker queue ${breach.queue} exceeded its depth, age, or dead-letter threshold.`,
      executionId: `${breach.queue}:${hourBucket}`,
      payload: breach,
    }).catch(() => undefined);
  }
  return { jobs: jobStats, outbox, attachments };
}
