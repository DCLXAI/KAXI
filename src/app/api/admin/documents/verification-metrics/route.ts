import { NextRequest, NextResponse } from "next/server";
import { recordRequestAudit } from "@/lib/audit";
import { getAdminContext, requireAdmin } from "@/lib/api/security";
import { getDocumentVerificationMetrics } from "@/lib/documents/verification-metrics";

export const runtime = "nodejs";

function parseDateParam(value: string | null): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

function parseLimit(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(req: NextRequest) {
  try {
    const unauthorized = await requireAdmin(req, { roles: ["owner", "admin", "viewer"] });
    if (unauthorized) return unauthorized;

    const context = await getAdminContext(req);
    const metrics = await getDocumentVerificationMetrics({
      since: parseDateParam(req.nextUrl.searchParams.get("since")),
      until: parseDateParam(req.nextUrl.searchParams.get("until")),
      limit: parseLimit(req.nextUrl.searchParams.get("limit")),
    });

    await recordRequestAudit(req, {
      actor: context?.actor || "admin",
      actorRole: context?.role || "admin",
      action: "document.verification_metrics.read",
      targetType: "DocumentVerificationMetrics",
      targetId: "summary",
      metadata: {
        feedbackCount: metrics.totals.feedbackCount,
        documentsWithFeedback: metrics.totals.documentsWithFeedback,
        accuracy: metrics.rates.accuracy,
        falsePositive: metrics.rates.falsePositive,
        falseNegative: metrics.rates.falseNegative,
      },
    });

    return NextResponse.json({ ok: true, metrics });
  } catch (err) {
    console.error("[GET /api/admin/documents/verification-metrics]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 400 });
  }
}
