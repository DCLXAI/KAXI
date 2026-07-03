import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api/security";
import { getAiBackendDiagnostics } from "@/lib/ai/backend-selector";
import { getReadinessPayload } from "@/lib/ops/readiness";

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req, { roles: ["owner", "admin", "viewer"] });
  if (unauthorized) return unauthorized;

  try {
    const [aiBackend, readiness] = await Promise.all([
      Promise.resolve(getAiBackendDiagnostics()),
      getReadinessPayload(),
    ]);
    const aiBackendPolicyCheck = readiness.checks.find((check) => check.key === "ai.backend_policy");

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
