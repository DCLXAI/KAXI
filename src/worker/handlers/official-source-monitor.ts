import type { ClaimedWorkerJob } from "@/infrastructure/worker/job-repository";
import { db } from "@/lib/db";
import {
  getOfficialKnowledgeSourceWatchlist,
  runOfficialKnowledgeSourceMonitor,
  type OfficialKnowledgeMonitorResult,
  type OfficialKnowledgeMonitorSummary,
} from "@/lib/knowledge/source-monitor";
import { sendKnowledgeMonitorAlert } from "@/lib/knowledge/monitor-alerts";

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function bool(value: unknown) {
  return value === true;
}

export async function processOfficialSourceMonitorJob(job: ClaimedWorkerJob, signal: AbortSignal) {
  const requested = new Set(strings(job.payload.sourceIds));
  const configured = getOfficialKnowledgeSourceWatchlist();
  const sources = requested.size > 0
    ? configured.filter((source) => requested.has(source.docId))
    : configured;
  const persisted = bool(job.payload.persistCandidates);
  const actor = typeof job.payload.actor === "string" ? job.payload.actor.slice(0, 120) : "kaxi-worker";
  const prior = await db.workerSourceCheckpoint.findMany({
    where: { jobId: job.id, status: "completed" },
    select: { sourceId: true },
  });
  const completed = new Set(prior.map((item) => item.sourceId));
  const results: OfficialKnowledgeMonitorResult[] = [];

  for (const [ordinal, source] of sources.entries()) {
    if (signal.aborted) throw signal.reason || new Error("WORKER_JOB_ABORTED");
    if (completed.has(source.docId)) continue;
    await db.workerSourceCheckpoint.upsert({
      where: { jobId_sourceId: { jobId: job.id, sourceId: source.docId } },
      create: {
        jobId: job.id,
        sourceId: source.docId,
        ordinal,
        status: "processing",
        startedAt: new Date(),
      },
      update: { status: "processing", startedAt: new Date(), lastError: null },
    });
    const summary = await runOfficialKnowledgeSourceMonitor({
      actor,
      persistCandidates: persisted,
      sources: [source],
      timeoutMs: 15_000,
      concurrency: 1,
    });
    const result = summary.results[0];
    results.push(result);
    await db.workerSourceCheckpoint.update({
      where: { jobId_sourceId: { jobId: job.id, sourceId: source.docId } },
      data: result.status === "failed"
        ? {
            status: "failed",
            lastError: result.error?.slice(0, 1_000) || "SOURCE_MONITOR_FAILED",
          }
        : {
            status: "completed",
            completedAt: new Date(),
            contentHash: result.contentHash || null,
            lastError: null,
          },
    });
  }

  const allCheckpoints = await db.workerSourceCheckpoint.findMany({
    where: { jobId: job.id },
    orderBy: { ordinal: "asc" },
  });
  const checkedAt = new Date().toISOString();
  const summary: OfficialKnowledgeMonitorSummary = {
    checkedAt,
    persistCandidates: persisted,
    total: sources.length,
    changed: results.filter((item) => item.status === "changed").length,
    unchanged: results.filter((item) => item.status === "unchanged").length,
    failed: allCheckpoints.filter((item) => item.status === "failed").length,
    candidatesCreated: results.filter((item) => item.candidatePersisted).length,
    results,
  };
  const alert = await sendKnowledgeMonitorAlert(summary, { actor, trigger: "worker" });
  if (summary.failed > 0) throw new Error(`OFFICIAL_SOURCE_MONITOR_FAILED:${summary.failed}`);
  return { ...summary, alert, resumedSources: prior.length };
}
