import { NextRequest, NextResponse } from "next/server";
import { recordRequestAudit } from "@/lib/audit";
import { getAdminContext, jsonError, requireAdmin } from "@/lib/api/security";
import { canWriteRuntimeDatabase } from "@/lib/db";
import {
  getCronOfficialKnowledgeSources,
  getOfficialKnowledgeSourceWatchlist,
  runOfficialKnowledgeSourceMonitor,
} from "@/lib/knowledge/source-monitor";
import { sendKnowledgeMonitorAlert } from "@/lib/knowledge/monitor-alerts";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function authorizeCron(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV === "production"
      ? jsonError("CRON_SECRET is not configured", 503)
      : null;
  }

  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}` ? null : jsonError("Unauthorized", 401);
}

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

export async function GET(req: NextRequest) {
  if (!canWriteRuntimeDatabase()) {
    return jsonNoStore({
      skipped: true,
      reason: "Writable production database is not configured",
    }, { status: 202 });
  }

  const unauthorized = authorizeCron(req);
  if (unauthorized) return unauthorized;

  const result = await runOfficialKnowledgeSourceMonitor({
    actor: "vercel-cron",
    persistCandidates: process.env.KNOWLEDGE_MONITOR_PERSIST_CANDIDATES !== "false",
    sources: getCronOfficialKnowledgeSources(),
    timeoutMs: positiveInt(process.env.KNOWLEDGE_MONITOR_FETCH_TIMEOUT_MS, 8_000),
    concurrency: positiveInt(process.env.KNOWLEDGE_MONITOR_CONCURRENCY, 4),
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
  return jsonNoStore({ ...result, alert });
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req, { roles: ["owner", "admin"] });
  if (unauthorized) return unauthorized;

  const body = (await req.json().catch(() => ({}))) as {
    persistCandidates?: boolean;
    maxSources?: number;
    sourceIds?: string[];
  };

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
    persistCandidates: body.persistCandidates === true,
    sources,
    timeoutMs: positiveInt(process.env.KNOWLEDGE_MONITOR_FETCH_TIMEOUT_MS, 8_000),
    concurrency: positiveInt(process.env.KNOWLEDGE_MONITOR_CONCURRENCY, 4),
  });
  const alert = await sendKnowledgeMonitorAlert(result, {
    actor: actor?.actor || "admin",
    trigger: body.persistCandidates === true ? "admin-persist" : "admin-preview",
  });
  await recordRequestAudit(req, {
    actor: actor?.actor || "unknown",
    actorRole: actor?.role || "admin",
    action: body.persistCandidates === true ? "knowledge.monitor.persist" : "knowledge.monitor.preview",
    targetType: "KnowledgeDocument",
    metadata: { ...auditMetadata(result), alert },
  });
  return jsonNoStore({ ...result, alert });
}
