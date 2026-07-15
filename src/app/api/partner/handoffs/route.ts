import { NextRequest, NextResponse } from "next/server";
import { recordRequestAudit } from "@/lib/audit";
import { AuthBridgeError, requireKaxiUser } from "@/lib/supabase/auth";
import {
  PartnerHandoffAssignmentError,
  listPartnerHandoffs,
  updatePartnerHandoff,
} from "@/lib/handoffs/partner";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireKaxiUser(["PARTNER_AGENT"]);
    const tasks = await listPartnerHandoffs(user.id);
    return NextResponse.json({ tasks });
  } catch (error) {
    if (error instanceof AuthBridgeError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[GET /api/partner/handoffs]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireKaxiUser(["PARTNER_AGENT"]);
    const body = (await req.json().catch(() => null)) as null | { id?: string; action?: string };
    if (!body?.id || !body.action) {
      return NextResponse.json({ error: "A valid id and action are required" }, { status: 400 });
    }
    const task = await updatePartnerHandoff({ id: String(body.id), userId: user.id, action: body.action });
    // Partner-attributed audit record, distinct from updateAdminHandoff's own
    // analytics event (recorded with surface "admin_handoff" regardless of
    // caller): without this, a partner's start/contacted mutation left no
    // audit trail identifying it as a partner action at all.
    await recordRequestAudit(req, {
      actor: user.id,
      actorRole: "partner",
      action: `partner_handoff.${body.action}`,
      targetType: "handoff_task",
      targetId: String(body.id),
      metadata: { surface: "partner_handoff" },
    });
    return NextResponse.json({ task });
  } catch (error) {
    if (error instanceof AuthBridgeError || error instanceof PartnerHandoffAssignmentError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[PATCH /api/partner/handoffs]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
