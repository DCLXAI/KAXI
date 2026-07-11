import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, requireAdmin } from "@/lib/api/security";
import {
  PartnerRequestAssignmentError,
  assignPartnerRequest,
  listAdminPartnerRequests,
} from "@/lib/partners/assignment";
import { serializePartnerRequestForResponse } from "@/lib/privacy/serializers";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const unauthorized = await requireAdmin(req, { roles: ["owner", "admin", "viewer"] });
    if (unauthorized) return unauthorized;
    const result = await listAdminPartnerRequests();
    return NextResponse.json({
      requests: result.requests.map((request) => serializePartnerRequestForResponse(request, { revealPii: true })),
      organizations: result.organizations,
    });
  } catch (error) {
    console.error("[GET /api/admin/partner-requests]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const unauthorized = await requireAdmin(req, { roles: ["owner", "admin"] });
    if (unauthorized) return unauthorized;
    const body = (await req.json().catch(() => null)) as null | {
      requestId?: string;
      organizationId?: string;
      assignedUserId?: string | null;
    };
    if (!body?.requestId || !body.organizationId) {
      return NextResponse.json({ error: "requestId and organizationId are required" }, { status: 400 });
    }
    const context = await getAdminContext(req);
    const request = await assignPartnerRequest({
      requestId: body.requestId,
      organizationId: body.organizationId,
      assignedUserId: body.assignedUserId || null,
      actor: context?.actor || "admin",
    });
    return NextResponse.json({ request: serializePartnerRequestForResponse(request, { revealPii: true }) });
  } catch (error) {
    if (error instanceof PartnerRequestAssignmentError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[PATCH /api/admin/partner-requests]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
