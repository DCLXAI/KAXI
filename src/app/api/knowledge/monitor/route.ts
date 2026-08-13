import { runtimeEnvironment } from "@/infrastructure/config/runtime-environment";
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { recordRequestAudit } from "@/lib/audit";
import { getAdminContext, requireAdmin } from "@/lib/api/security";
import { canWriteRuntimeDatabase } from "@/lib/db";
import { isEnvTrue } from "@/lib/env";
import {
  DEFAULT_CRON_KNOWLEDGE_SOURCE_IDS,
  OFFICIAL_KNOWLEDGE_SOURCE_WATCHLIST,
} from "@/lib/knowledge/official-source-watchlist";
import { authorizeCronRequest } from "@/lib/security/cron-auth";
import { enqueueWorkerJob, getWorkerJobStatus } from "@/infrastructure/worker/job-repository";
import { requestTraceContext } from "@/infrastructure/observability/trace-context";
import { platformServiceTenantContext } from "@/application/tenancy/tenant-context";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

function jsonNoStore(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("cache-control", "no-store, no-cache, must-revalidate");
  return response;
}

function candidateWritesEnabled() {
  return isEnvTrue(runtimeEnvironment().KNOWLEDGE_MONITOR_PERSIST_CANDIDATES);
}

function jobKey(sourceIds: string[], persistCandidates: boolean, actor: string, bucket: string) {
  return createHash("sha256")
    .update(`${sourceIds.join(",")}\n${persistCandidates}\n${actor}\n${bucket}`)
    .digest("hex");
}

function enqueueMonitor(input: {
  req: NextRequest;
  sourceIds: string[];
  persistCandidates: boolean;
  actor: string;
  bucket: string;
}) {
  const trace = requestTraceContext(input.req.headers);
  return enqueueWorkerJob({
    tenantContext: platformServiceTenantContext("knowledge-monitor"),
    requestId: input.req.headers.get("x-request-id")?.trim().slice(0, 128) || crypto.randomUUID(),
    jobType: "official-source-monitor",
    idempotencyKey: jobKey(input.sourceIds, input.persistCandidates, input.actor, input.bucket),
    payload: {
      sourceIds: input.sourceIds,
      persistCandidates: input.persistCandidates,
      actor: input.actor,
    },
    traceId: trace.traceId,
    traceparent: trace.traceparent,
    maxAttempts: 8,
    timeoutMs: 15 * 60_000,
    deadlineAt: new Date(Date.now() + 6 * 60 * 60_000),
  });
}

export async function GET(req: NextRequest) {
  if (!canWriteRuntimeDatabase()) {
    return jsonNoStore({ skipped: true, reason: "Writable production database is not configured" }, { status: 202 });
  }
  const unauthorized = authorizeCronRequest(req);
  if (unauthorized) return unauthorized;

  const jobId = req.nextUrl.searchParams.get("jobId");
  if (jobId) {
    const job = await getWorkerJobStatus(jobId, "default");
    return job ? jsonNoStore({ job }) : jsonNoStore({ error: "Job not found" }, { status: 404 });
  }

  const writesEnabled = candidateWritesEnabled();
  const sourceIds = [...DEFAULT_CRON_KNOWLEDGE_SOURCE_IDS];
  const bucket = new Date().toISOString().slice(0, 13);
  const job = await enqueueMonitor({
    req,
    sourceIds,
    persistCandidates: writesEnabled,
    actor: "vercel-cron-recovery",
    bucket,
  });
  await recordRequestAudit(req, {
    actor: "vercel-cron-recovery",
    actorRole: "system",
    action: "knowledge.monitor.enqueue",
    targetType: "WorkerJob",
    targetId: job.id,
    metadata: { sourceCount: sourceIds.length, persistCandidates: writesEnabled, executionOwner: "kaxi-worker" },
  });
  return jsonNoStore({ accepted: true, executionOwner: "kaxi-worker", job }, { status: 202 });
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req, { roles: ["owner", "admin"] });
  if (unauthorized) return unauthorized;
  const body = (await req.json().catch(() => ({}))) as {
    jobId?: string;
    persistCandidates?: boolean;
    maxSources?: number;
    sourceIds?: string[];
  };
  if (typeof body.jobId === "string" && body.jobId.trim()) {
    const job = await getWorkerJobStatus(body.jobId.trim(), "default");
    return job ? jsonNoStore({ job }) : jsonNoStore({ error: "Job not found" }, { status: 404 });
  }
  const actor = await getAdminContext(req);
  const knownIds = new Set(OFFICIAL_KNOWLEDGE_SOURCE_WATCHLIST.map((source) => source.docId));
  const requested = Array.isArray(body.sourceIds)
    ? [...new Set(body.sourceIds.filter((id): id is string => typeof id === "string" && knownIds.has(id)))]
    : OFFICIAL_KNOWLEDGE_SOURCE_WATCHLIST.map((source) => source.docId);
  const maxSources = Number.isFinite(body.maxSources) && Number(body.maxSources) > 0
    ? Math.min(100, Math.trunc(Number(body.maxSources)))
    : requested.length;
  const sourceIds = requested.slice(0, maxSources);
  if (sourceIds.length === 0) return jsonNoStore({ error: "No valid sourceIds" }, { status: 400 });
  const writesEnabled = candidateWritesEnabled();
  const persistCandidates = body.persistCandidates === true && writesEnabled;
  const actorName = actor?.actor || "admin";
  const job = await enqueueMonitor({
    req,
    sourceIds,
    persistCandidates,
    actor: actorName,
    bucket: req.headers.get("x-idempotency-key") || crypto.randomUUID(),
  });
  await recordRequestAudit(req, {
    actor: actorName,
    actorRole: actor?.role || "admin",
    action: "knowledge.monitor.enqueue",
    targetType: "WorkerJob",
    targetId: job.id,
    metadata: {
      sourceCount: sourceIds.length,
      persistCandidates,
      candidateWritePaused: body.persistCandidates === true && !writesEnabled,
      executionOwner: "kaxi-worker",
    },
  });
  return jsonNoStore({
    accepted: true,
    executionOwner: "kaxi-worker",
    candidateWritesEnabled: writesEnabled,
    candidateWritePaused: body.persistCandidates === true && !writesEnabled,
    job,
  }, { status: 202 });
}
