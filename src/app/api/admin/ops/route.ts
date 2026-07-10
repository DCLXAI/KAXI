import { NextResponse, type NextRequest } from "next/server";
import { getAdminContext, requireAdmin } from "@/lib/api/security";
import { getAiBackendDiagnostics } from "@/lib/ai/backend-selector";
import { recordRequestAudit } from "@/lib/audit";
import { getReadinessPayload } from "@/lib/ops/readiness";
import { getLatestRagSystemHealth, runRagSystemHealth } from "@/lib/ops/rag-system-health";
import { acknowledgeOpsEvent, listOpenOpsEvents } from "@/lib/ops/events";
import { JsonBodyError, readJsonBody } from "@/lib/api/json-body";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req, { roles: ["owner", "admin", "viewer"] });
  if (unauthorized) return unauthorized;
  const context = await getAdminContext(req);

  try {
    const [aiBackend, readiness, systemHealth, openEvents] = await Promise.all([
      Promise.resolve(getAiBackendDiagnostics()),
      getReadinessPayload(),
      getLatestRagSystemHealth().catch(() => null),
      listOpenOpsEvents(),
    ]);
    const aiBackendPolicyCheck = readiness.checks.find((check) => check.key === "ai.backend_policy");
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

    return NextResponse.json({
      aiBackend,
      readiness: {
        status: readiness.status,
        environment: readiness.environment,
        production: readiness.production,
        checkedAt: readiness.checkedAt,
        checks: readiness.checks.map((check) => ({
          key: check.key,
          label: check.label,
          ok: check.ok,
          detail: check.detail,
          severity: check.severity,
        })),
        aiBackendPolicyCheck: aiBackendPolicyCheck
          ? {
              ok: aiBackendPolicyCheck.ok,
              severity: aiBackendPolicyCheck.severity,
              detail: aiBackendPolicyCheck.detail,
              metadata: aiBackendPolicyCheck.metadata,
            }
          : null,
      },
      systemHealth,
      openEvents,
    });
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
    const health = await runRagSystemHealth("admin");
    await recordRequestAudit(req, {
      actor: context?.actor || "admin",
      actorRole: context?.role || "admin",
      action: "admin.ops.health.run",
      targetType: "SystemHealthRun",
      targetId: health.id,
      success: health.status === "healthy",
      metadata: { status: health.status, durationMs: health.durationMs },
    });
    return NextResponse.json({ health });
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
    const body = await readJsonBody<{ eventId?: unknown }>(req, 8 * 1024);
    const eventId = typeof body.eventId === "string" ? body.eventId.trim() : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId)) {
      return NextResponse.json({ error: "A valid eventId is required" }, { status: 400 });
    }

    const actor = context?.actor || "admin";
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
    console.error("[PATCH /api/admin/ops]", error);
    return NextResponse.json({ error: "Could not acknowledge event" }, { status: 500 });
  }
}
