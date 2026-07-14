import { NextRequest, NextResponse } from "next/server";
import { recordRequestAudit } from "@/lib/audit";
import { getAdminContext, requireAdmin } from "@/lib/api/security";
import { canWriteRuntimeDatabase } from "@/lib/db";
import {
  getCronOfficialKnowledgeSources,
  getOfficialKnowledgeSourceWatchlist,
  runOfficialKnowledgeSourceMonitor,
} from "@/lib/knowledge/source-monitor";
import { sendKnowledgeMonitorAlert } from "@/lib/knowledge/monitor-alerts";
import { authorizeCronRequest } from "@/lib/security/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function auditMetadata(result: Awaited<ReturnType<typeof runOfficialKnowledgeSourceMonitor>>) {
  return {
    checkedAt: result.checkedAt,
    persistCandidates: result.persistCandidates,
    total: result.total,
    changed: result.changed,
    unchanged: result.unchanged,
    failed: result.failed,
    candidatesCreated: result.candidatesCreated,
    changedDocIds: result.results
      .filter((item) => item.status === "changed")
      .map((item) => item.docId),
    failedDocIds: result.results
      .filter((item) => item.status === "failed")
      .map((item) => item.docId),
  };
}

function jsonNoStore(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("cache-control", "no-store, no-cache, must-revalidate");
  return response;
}

function positiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function candidateWritesEnabled() {
  return process.env.KNOWLEDGE_MONITOR_PERSIST_CANDIDATES === "true";
}

export async function GET(req: NextRequest) {
  if (!canWriteRuntimeDatabase()) {
    return jsonNoStore({
      skipped: true,
      reason: "Writable production database is not configured",
    }, { status: 202 });
  }

  const unauthorized = authorizeCronRequest(req);
  if (unauthorized) return unauthorized;

  const writesEnabled = candidateWritesEnabled();
  const result = await runOfficialKnowledgeSourceMonitor({
    actor: "vercel-cron",
    persistCandidates: writesEnabled,
    sources: getCronOfficialKnowledgeSources(),
    timeoutMs: positiveInt(process.env.KNOWLEDGE_MONITOR_FETCH_TIMEOUT_MS, 8_000),
    concurrency: positiveInt(process.env.KNOWLEDGE_MONITOR_CONCURRENCY, 2),
  });
  const alert = await sendKnowledgeMonitorAlert(result, {
    actor: "vercel-cron",
    trigger: "cron",
  });
  await recordRequestAudit(req, {
    actor: "vercel-cron",
    actorRole: "system",
    action: "knowledge.monitor",
    targetType: "KnowledgeDocument",
    metadata: { ...auditMetadata(result), alert },
  });
  return jsonNoStore({
    ...result,
    candidateWritesEnabled: writesEnabled,
    candidateWritePaused: !writesEnabled,
    alert,
  });
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req, { roles: ["owner", "admin"] });
  if (unauthorized) return unauthorized;

  const body = (await req.json().catch(() => ({}))) as {
    persistCandidates?: boolean;
    maxSources?: number;
    sourceIds?: string[];
  };
  const writesEnabled = candidateWritesEnabled();
  const persistCandidates = body.persistCandidates === true && writesEnabled;

  const actor = await getAdminContext(req);
  const requestedSourceIds = Array.isArray(body.sourceIds)
    ? new Set(body.sourceIds.filter((item): item is string => typeof item === "string" && item.trim().length > 0))
    : null;
  const configuredSources = getOfficialKnowledgeSourceWatchlist();
  const filteredSources = requestedSourceIds
    ? configuredSources.filter((source) => requestedSourceIds.has(source.docId))
    : configuredSources;
  const sources = body.maxSources && body.maxSources > 0
    ? filteredSources.slice(0, body.maxSources)
    : filteredSources;
  const result = await runOfficialKnowledgeSourceMonitor({
    actor: actor?.actor || "admin",
    persistCandidates,
    sources,
    timeoutMs: positiveInt(process.env.KNOWLEDGE_MONITOR_FETCH_TIMEOUT_MS, 8_000),
    concurrency: positiveInt(process.env.KNOWLEDGE_MONITOR_CONCURRENCY, 2),
  });
  const alert = await sendKnowledgeMonitorAlert(result, {
    actor: actor?.actor || "admin",
    trigger: persistCandidates ? "admin-persist" : "admin-preview",
  });
  await recordRequestAudit(req, {
    actor: actor?.actor || "unknown",
    actorRole: actor?.role || "admin",
    action: persistCandidates ? "knowledge.monitor.persist" : "knowledge.monitor.preview",
    targetType: "KnowledgeDocument",
    metadata: {
      ...auditMetadata(result),
      candidateWritesEnabled: writesEnabled,
      candidateWriteRequested: body.persistCandidates === true,
      candidateWritePaused: body.persistCandidates === true && !writesEnabled,
      alert,
    },
  });
  return jsonNoStore({
    ...result,
    candidateWritesEnabled: writesEnabled,
    candidateWritePaused: body.persistCandidates === true && !writesEnabled,
    alert,
  });
}
