import { NextRequest, NextResponse } from "next/server";
import { recordAuditLog } from "@/lib/audit";
import { getAdminContext, getClientIp, requireAdmin } from "@/lib/api/security";
import { verifyDocumentSet } from "@/lib/documents/verification";

export const runtime = "nodejs";
export const maxDuration = 120;

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    const unauthorized = await requireAdmin(req, { roles: ["owner", "admin"] });
    if (unauthorized) return unauthorized;

    const context = await getAdminContext(req);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await verifyDocumentSet({
      studentProfileId: optionalString(body.studentProfileId),
      caseId: optionalString(body.caseId),
      visaType: optionalString(body.visaType),
      stayAction: optionalString(body.stayAction),
      applicantContext: optionalString(body.applicantContext),
      enableRag: optionalBoolean(body.enableRag) ?? true,
      enableLlm: optionalBoolean(body.enableLlm) ?? false,
      minRagVectorScore: optionalNumber(body.minRagVectorScore),
      minRagKeywordScore: optionalNumber(body.minRagKeywordScore),
      persist: optionalBoolean(body.persist) ?? true,
      createMissingPlaceholders: optionalBoolean(body.createMissingPlaceholders) ?? false,
    });

    await recordAuditLog({
      actor: context?.actor || "admin",
      actorRole: context?.role || "admin",
      action: "document.set_verified",
      targetType: result.caseId ? "escalationCase" : "studentProfile",
      targetId: result.caseId || result.studentProfileId,
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      metadata: {
        visaType: result.visaType,
        stayAction: result.stayAction,
        applicantContext: result.applicantContext,
        status: result.status,
        severity: result.severity,
        summary: result.summary,
        rag: {
          acceptedSourceCount: result.documents.reduce(
            (sum, document) => sum + (document.layerDetails.rag?.acceptedSourceCount || 0),
            0
          ),
          officialSourceCount: result.documents.reduce(
            (sum, document) => sum + (document.layerDetails.rag?.officialSourceCount || 0),
            0
          ),
          latestCheckedAt: result.documents
            .map((document) => document.basis.latestCheckedAt)
            .filter(Boolean)
            .sort()
            .at(-1) || null,
          llmStatuses: result.documents.reduce<Record<string, number>>((counts, document) => {
            const status = document.layerDetails.rag?.llm.status || "unknown";
            counts[status] = (counts[status] || 0) + 1;
            return counts;
          }, {}),
        },
        setIssueCodes: result.setIssues.map((item) => item.code).slice(0, 50),
        missingRequirementCodes: result.missingRequirements.map((item) => item.requirementCode).slice(0, 50),
      },
    });

    return NextResponse.json({ ok: true, verification: result });
  } catch (err) {
    console.error("[POST /api/admin/documents/verify-batch]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 400 });
  }
}
