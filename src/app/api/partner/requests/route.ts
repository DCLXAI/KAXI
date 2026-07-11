import { NextRequest, NextResponse } from "next/server";
import { AuthBridgeError, requireKaxiUser } from "@/lib/supabase/auth";
import {
  PartnerRequestAssignmentError,
  listPartnerRequestInbox,
  updatePartnerRequestStatus,
} from "@/lib/partners/assignment";
import { serializePartnerRequestForResponse } from "@/lib/privacy/serializers";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireKaxiUser(["PARTNER_AGENT"]);
    if (!user.organizationId) return NextResponse.json({ error: "Partner organization is required" }, { status: 403 });
    const requests = await listPartnerRequestInbox(user.organizationId);
    return NextResponse.json({
      requests: requests.map((request) => serializePartnerRequestForResponse(request, { revealPii: true })),
    });
  } catch (error) {
    if (error instanceof AuthBridgeError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[GET /api/partner/requests]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireKaxiUser(["PARTNER_AGENT"]);
    if (!user.organizationId) return NextResponse.json({ error: "Partner organization is required" }, { status: 403 });
    const body = (await req.json().catch(() => null)) as null | { requestId?: string; action?: "accept" | "close" };
    if (!body?.requestId || (body.action !== "accept" && body.action !== "close")) {
      return NextResponse.json({ error: "Valid requestId and action are required" }, { status: 400 });
    }
    const request = await updatePartnerRequestStatus({
      requestId: body.requestId,
      organizationId: user.organizationId,
      userId: user.id,
      action: body.action,
    });
    return NextResponse.json({ request: serializePartnerRequestForResponse(request, { revealPii: true }) });
  } catch (error) {
    if (error instanceof AuthBridgeError || error instanceof PartnerRequestAssignmentError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[PATCH /api/partner/requests]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
