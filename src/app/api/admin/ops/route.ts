import { NextResponse, type NextRequest } from "next/server";
import { getAdminContext, requireAdmin } from "@/lib/api/security";
import { getAiBackendDiagnostics } from "@/lib/ai/backend-selector";
import { recordRequestAudit } from "@/lib/audit";
import { getReadinessPayload } from "@/lib/ops/readiness";

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req, { roles: ["owner", "admin", "viewer"] });
  if (unauthorized) return unauthorized;
  const context = await getAdminContext(req);

  try {
    const [aiBackend, readiness] = await Promise.all([
      Promise.resolve(getAiBackendDiagnostics()),
      getReadinessPayload(),
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
        aiBackendPolicyCheck: aiBackendPolicyCheck
          ? {
              ok: aiBackendPolicyCheck.ok,
              severity: aiBackendPolicyCheck.severity,
              detail: aiBackendPolicyCheck.detail,
              metadata: aiBackendPolicyCheck.metadata,
            }
          : null,
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/ops]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
