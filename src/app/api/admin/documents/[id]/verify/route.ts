import { NextRequest, NextResponse } from "next/server";
import { recordAuditLog } from "@/lib/audit";
import { getAdminContext, getClientIp, requireAdmin } from "@/lib/api/security";
import { verifyDocumentItem } from "@/lib/documents/verification";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteParams = {
  params: Promise<{ id: string }>;
};

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

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const unauthorized = await requireAdmin(req, { roles: ["owner", "admin"] });
    if (unauthorized) return unauthorized;

    const context = await getAdminContext(req);
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await verifyDocumentItem(id, {
      visaType: optionalString(body.visaType),
      stayAction: optionalString(body.stayAction),
      applicantContext: optionalString(body.applicantContext),
      enableRag: optionalBoolean(body.enableRag) ?? true,
      enableLlm: optionalBoolean(body.enableLlm) ?? false,
      minRagVectorScore: optionalNumber(body.minRagVectorScore),
      minRagKeywordScore: optionalNumber(body.minRagKeywordScore),
      persist: optionalBoolean(body.persist) ?? true,
    });

    await recordAuditLog({
      actor: context?.actor || "admin",
      actorRole: context?.role || "admin",
      action: "document.verified",
      targetType: "documentItem",
      targetId: id,
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      metadata: {
        status: result.status,
        severity: result.severity,
        requirementCode: result.requirementCode,
        layers: result.layers,
        rag: result.layerDetails.rag
            ? {
              retrievedCount: result.layerDetails.rag.retrievedCount,
              acceptedSourceCount: result.layerDetails.rag.acceptedSourceCount,
              officialSourceCount: result.layerDetails.rag.officialSourceCount,
              llmStatus: result.layerDetails.rag.llm.status,
              llmErrorCode: result.layerDetails.rag.llm.errorCode,
            }
          : null,
        basis: {
          officialSourceCount: result.basis.officialSourceCount,
          acceptedSourceCount: result.basis.acceptedSourceCount,
          latestCheckedAt: result.basis.latestCheckedAt,
          sourceLabels: result.basis.sourceLabels.slice(0, 10),
        },
        issueCodes: result.issues.map((issue) => issue.code).slice(0, 20),
        sourceDocIds: result.sources.map((source) => source.docId).slice(0, 20),
      },
    });

    return NextResponse.json({ ok: true, verification: result });
  } catch (err) {
    console.error("[POST /api/admin/documents/:id/verify]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 400 });
  }
}
