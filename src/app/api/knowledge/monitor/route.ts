import { NextRequest, NextResponse } from "next/server";
import { recordRequestAudit } from "@/lib/audit";
import { getAdminContext, jsonError, requireAdmin } from "@/lib/api/security";
import { canWriteRuntimeDatabase } from "@/lib/db";
import {
  getOfficialKnowledgeSourceWatchlist,
  runOfficialKnowledgeSourceMonitor,
} from "@/lib/knowledge/source-monitor";

export const runtime = "nodejs";
export const maxDuration = 60;

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

export async function GET(req: NextRequest) {
  if (!canWriteRuntimeDatabase()) {
    return NextResponse.json({
      skipped: true,
      reason: "Writable production database is not configured",
    }, { status: 202 });
  }

  const unauthorized = authorizeCron(req);
  if (unauthorized) return unauthorized;

  const result = await runOfficialKnowledgeSourceMonitor({
    actor: "vercel-cron",
    persistCandidates: process.env.KNOWLEDGE_MONITOR_PERSIST_CANDIDATES !== "false",
  });
  await recordRequestAudit(req, {
    actor: "vercel-cron",
    actorRole: "system",
    action: "knowledge.monitor",
    targetType: "KnowledgeDocument",
    metadata: auditMetadata(result),
  });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req, { roles: ["owner", "admin"] });
  if (unauthorized) return unauthorized;

  const body = (await req.json().catch(() => ({}))) as {
    persistCandidates?: boolean;
    maxSources?: number;
  };

  const actor = await getAdminContext(req);
  const sources = body.maxSources && body.maxSources > 0
    ? getOfficialKnowledgeSourceWatchlist().slice(0, body.maxSources)
    : undefined;
  const result = await runOfficialKnowledgeSourceMonitor({
    actor: actor?.actor || "admin",
    persistCandidates: body.persistCandidates === true,
    sources,
  });
  await recordRequestAudit(req, {
    actor: actor?.actor || "unknown",
    actorRole: actor?.role || "admin",
    action: body.persistCandidates === true ? "knowledge.monitor.persist" : "knowledge.monitor.preview",
    targetType: "KnowledgeDocument",
    metadata: auditMetadata(result),
  });
  return NextResponse.json(result);
}
