import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, getClientIp, requireAdmin } from "@/lib/api/security";
import { isSupportedDocumentStatus, isSupportedReviewStatus } from "@/lib/documents/config";
import { reviewDocumentItem } from "@/lib/documents/repository";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const unauthorized = await requireAdmin(req, { roles: ["owner", "admin"] });
    if (unauthorized) return unauthorized;
    const context = await getAdminContext(req);
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as {
      status?: string;
      reviewStatus?: string;
      reviewNote?: string | null;
    };

    if (!isSupportedDocumentStatus(body.status) || !isSupportedReviewStatus(body.reviewStatus)) {
      return NextResponse.json({ error: "Invalid document status or reviewStatus" }, { status: 400 });
    }

    const document = await reviewDocumentItem(
      id,
      {
        status: body.status,
        reviewStatus: body.reviewStatus,
        reviewNote: body.reviewNote,
      },
      {
        actor: context?.actor || "admin",
        actorRole: context?.role || "admin",
        action: "document.reviewed",
        ip: getClientIp(req),
        userAgent: req.headers.get("user-agent"),
      }
    );
    return NextResponse.json({ ok: true, document });
  } catch (err) {
    console.error("[PATCH /api/admin/documents/:id/review]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 400 });
  }
}
