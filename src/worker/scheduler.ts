import { runtimeEnvironment } from "@/infrastructure/config/runtime-environment";
import { enqueueWorkerJob } from "@/infrastructure/worker/job-repository";
import { newTraceContext } from "@/infrastructure/observability/trace-context";
import { OFFICIAL_KNOWLEDGE_SOURCE_WATCHLIST } from "@/lib/knowledge/official-source-watchlist";
import { platformServiceTenantContext } from "@/application/tenancy/tenant-context";

function bucket(now: Date, minutes: number) {
  return Math.floor(now.getTime() / (minutes * 60_000)).toString(36);
}

function enabled(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

export async function enqueueScheduledWorkerJobs(now = new Date()) {
  const trace = newTraceContext();
  const requestId = `worker-schedule:${now.toISOString()}`;
  const tenantContext = platformServiceTenantContext("kaxi-worker-scheduler");
  const sourceIds = OFFICIAL_KNOWLEDGE_SOURCE_WATCHLIST.map((source) => source.docId);
  const monitorBucket = bucket(now, 30);
  const monitorJobs: Array<Promise<unknown>> = [];
  for (let index = 0; index < sourceIds.length; index += 10) {
    monitorJobs.push(enqueueWorkerJob({
      tenantContext,
      requestId,
      jobType: "official-source-monitor",
      idempotencyKey: `worker-schedule:${monitorBucket}:${Math.trunc(index / 10)}`,
      payload: {
        sourceIds: sourceIds.slice(index, index + 10),
        persistCandidates: enabled(runtimeEnvironment().KNOWLEDGE_MONITOR_PERSIST_CANDIDATES),
        actor: "kaxi-worker-scheduler",
      },
      traceId: trace.traceId,
      traceparent: trace.traceparent,
      timeoutMs: 15 * 60_000,
      deadlineAt: new Date(now.getTime() + 6 * 60 * 60_000),
    }));
  }

  const hourBucket = bucket(now, 60);
  const embedding = enqueueWorkerJob({
    tenantContext,
    requestId,
    jobType: "embedding-sync",
    idempotencyKey: `worker-schedule:${hourBucket}`,
    payload: { force: false },
    traceId: trace.traceId,
    traceparent: trace.traceparent,
    timeoutMs: 30 * 60_000,
    deadlineAt: new Date(now.getTime() + 4 * 60 * 60_000),
  });
  const projection = enqueueWorkerJob({
    tenantContext,
    requestId,
    jobType: "rag-serving-sync",
    idempotencyKey: `worker-schedule:${hourBucket}`,
    payload: { force: false, limit: 100 },
    traceId: trace.traceId,
    traceparent: trace.traceparent,
    timeoutMs: 15 * 60_000,
    deadlineAt: new Date(now.getTime() + 4 * 60 * 60_000),
  });
  const dayBucket = now.toISOString().slice(0, 10);
  const systemHealth = enqueueWorkerJob({
    tenantContext,
    requestId,
    jobType: "rag-system-health",
    idempotencyKey: `worker-schedule:${dayBucket}`,
    payload: { triggerSource: "worker-schedule" },
    traceId: trace.traceId,
    traceparent: trace.traceparent,
    timeoutMs: 15 * 60_000,
    deadlineAt: new Date(now.getTime() + 12 * 60 * 60_000),
  });
  await Promise.all([...monitorJobs, embedding, projection, systemHealth]);
}
