import { NextResponse, type NextRequest } from "next/server";
import { getAdminContext, requireAdmin } from "@/lib/api/security";
import { recordRequestAudit } from "@/lib/audit";
import { acknowledgeOpsEvent, acknowledgeOpsEvents } from "@/lib/ops/events";
import { JsonBodyError, readJsonBody } from "@/lib/api/json-body";
import { getAdminOpsPayload } from "@/lib/ops/admin-ops-payload";
import { enqueueWorkerJob } from "@/infrastructure/worker/job-repository";
import { requestTraceContext } from "@/infrastructure/observability/trace-context";
import { platformServiceTenantContext } from "@/application/tenancy/tenant-context";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req, { roles: ["owner", "admin", "viewer"] });
  if (unauthorized) return unauthorized;
  const context = await getAdminContext(req);
  const traceId = req.nextUrl.searchParams.get("traceId")?.trim() || "";
  const requestId = req.nextUrl.searchParams.get("requestId")?.trim() || "";
  if (traceId && !/^[0-9a-f]{32}$/.test(traceId)) {
    return NextResponse.json({ error: "traceId must be 32 lowercase hexadecimal characters" }, { status: 400 });
  }
  if (requestId.length > 128) {
    return NextResponse.json({ error: "requestId is too long" }, { status: 400 });
  }

  try {
    const payload = await getAdminOpsPayload({ traceId: traceId || undefined, requestId: requestId || undefined });
    const { aiBackend, readiness } = payload;
    const aiBackendPolicyCheck = readiness.aiBackendPolicyCheck;
    await recordRequestAudit(req, {
      actor: context?.actor || "admin",
      actorRole: context?.role || "admin",
      action: "admin.ops.read",
      targetType: "AdminOps",
      targetId: "ai.backend_policy",
      metadata: {
        agentBackend: aiBackend.agent.backend,
        consultBackend: aiBackend.consult.backend,
        agentReady: aiBackend.agent.ready,
        consultReady: aiBackend.consult.ready,
        readinessStatus: readiness.status,
        aiBackendPolicyOk: aiBackendPolicyCheck?.ok ?? null,
        aiBackendPolicySeverity: aiBackendPolicyCheck?.severity ?? null,
        aiBackendIssueCount: aiBackend.issues.length,
        aiBackendWarningCount: aiBackend.warnings.length,
        requiredCheckFailures: readiness.checks.filter((check) => !check.ok && check.severity === "required").length,
        warningCheckFailures: readiness.checks.filter((check) => !check.ok && check.severity === "warning").length,
      },
    });

    return NextResponse.json(payload);
  } catch (err) {
    console.error("[GET /api/admin/ops]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req, { roles: ["owner", "admin"] });
  if (unauthorized) return unauthorized;
  const context = await getAdminContext(req);

  try {
    const trace = requestTraceContext(req.headers);
    const timeBucket = new Date().toISOString().slice(0, 16);
    const health = await enqueueWorkerJob({
      tenantContext: platformServiceTenantContext("admin-ops"),
      requestId: req.headers.get("x-request-id")?.trim().slice(0, 128) || crypto.randomUUID(),
      jobType: "rag-system-health",
      idempotencyKey: `admin:${context?.actor || "admin"}:${timeBucket}`,
      payload: { triggerSource: "admin" },
      traceId: trace.traceId,
      traceparent: trace.traceparent,
      timeoutMs: 900_000,
    });
    await recordRequestAudit(req, {
      actor: context?.actor || "admin",
      actorRole: context?.role || "admin",
      action: "admin.ops.health.run",
      targetType: "WorkerJob",
      targetId: health.id,
      success: true,
      metadata: { status: health.status, execution: "kaxi-worker" },
    });
    return NextResponse.json({ accepted: true, healthJob: health }, { status: 202 });
  } catch (error) {
    console.error("[POST /api/admin/ops]", error);
    return NextResponse.json({ error: "Health check failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const unauthorized = await requireAdmin(req, { roles: ["owner", "admin"] });
  if (unauthorized) return unauthorized;
  const context = await getAdminContext(req);

  try {
    const body = await readJsonBody<{ eventId?: unknown; eventIds?: unknown; acknowledgeBefore?: unknown }>(req, 32 * 1024);
    const eventId = typeof body.eventId === "string" ? body.eventId.trim() : "";
    const eventIds = Array.isArray(body.eventIds)
      ? [...new Set(body.eventIds.map((value) => typeof value === "string" ? value.trim() : ""))]
      : [];
    const acknowledgeBefore = typeof body.acknowledgeBefore === "string" ? body.acknowledgeBefore.trim() : "";
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isBulk = eventIds.length > 0 || Boolean(acknowledgeBefore);
    if (!isBulk && !uuidPattern.test(eventId)) {
      return NextResponse.json({ error: "A valid eventId is required" }, { status: 400 });
    }
    if (eventIds.length > 200 || eventIds.some((id) => !uuidPattern.test(id))) {
      return NextResponse.json({ error: "One to 200 valid eventIds are required" }, { status: 400 });
    }
    if (acknowledgeBefore) {
      const date = new Date(acknowledgeBefore);
      if (!Number.isFinite(date.getTime()) || date.getTime() > Date.now()) {
        return NextResponse.json({ error: "acknowledgeBefore must be a valid past timestamp" }, { status: 400 });
      }
    }

    const actor = context?.actor || "admin";
    if (isBulk) {
      const bulk = await acknowledgeOpsEvents({
        actor,
        eventIds: eventIds.length > 0 ? eventIds : undefined,
        before: acknowledgeBefore || undefined,
      });
      await recordRequestAudit(req, {
        actor,
        actorRole: context?.role || "admin",
        action: "admin.ops.event.bulk_acknowledge",
        targetType: "OpsEvent",
        targetId: "bulk",
        success: bulk.acknowledged > 0,
        metadata: {
          requested: bulk.requested,
          acknowledged: bulk.acknowledged,
          acknowledgeBefore: acknowledgeBefore || null,
        },
      });
      return NextResponse.json({ bulk });
    }

    const event = await acknowledgeOpsEvent(eventId, actor);
    await recordRequestAudit(req, {
      actor,
      actorRole: context?.role || "admin",
      action: "admin.ops.event.acknowledge",
      targetType: "OpsEvent",
      targetId: eventId,
      success: Boolean(event),
      metadata: { alreadyAcknowledgedOrMissing: !event },
    });
    if (!event) return NextResponse.json({ error: "Event was already acknowledged or not found" }, { status: 409 });
    return NextResponse.json({ event });
  } catch (error) {
    if (error instanceof JsonBodyError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : String(error);
    if (["OPS_EVENT_IDS_LIMIT_EXCEEDED", "OPS_EVENT_BEFORE_INVALID"].includes(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[PATCH /api/admin/ops]", error);
    return NextResponse.json({ error: "Could not acknowledge event" }, { status: 500 });
  }
}
