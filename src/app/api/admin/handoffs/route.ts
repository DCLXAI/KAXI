import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, requireAdmin } from "@/lib/api/security";
import { JsonBodyError, readJsonBody } from "@/lib/api/json-body";
import { recordRequestAudit } from "@/lib/audit";
import { listAdminHandoffs, updateAdminHandoff, type HandoffAction } from "@/lib/handoffs/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req, { roles: ["owner", "admin", "viewer"] });
  if (unauthorized) return unauthorized;
  const context = await getAdminContext(req);

  try {
    const revealPii = context?.role === "owner" || context?.role === "admin";
    const result = await listAdminHandoffs({ revealPii, limit: Number(req.nextUrl.searchParams.get("limit") || 100) });
    await recordRequestAudit(req, {
      actor: context?.actor || "admin",
      actorRole: context?.role || "admin",
      action: "admin.handoff.list",
      targetType: "HandoffTask",
      targetId: "queue",
      metadata: { count: result.tasks.length, revealPii },
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/admin/handoffs]", error);
    return NextResponse.json({ error: "Could not load handoff queue" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const unauthorized = await requireAdmin(req, { roles: ["owner", "admin"] });
  if (unauthorized) return unauthorized;
  const context = await getAdminContext(req);

  try {
    const body = await readJsonBody<Record<string, unknown>>(req, 16 * 1024);
    const id = typeof body.id === "string" || typeof body.id === "number" ? String(body.id).trim() : "";
    const action = typeof body.action === "string" ? body.action.trim() as HandoffAction : "" as HandoffAction;
    if (!/^\d+$/.test(id)) return NextResponse.json({ error: "A valid handoff id is required" }, { status: 400 });
    if (!["assign", "start", "contacted", "resolve", "close", "reopen"].includes(action)) {
      return NextResponse.json({ error: "A valid handoff action is required" }, { status: 400 });
    }

    const result = await updateAdminHandoff({
      id,
      action,
      actor: context?.actor || "admin",
      assignee: typeof body.assignee === "string" ? body.assignee : undefined,
      assigneeUserId: typeof body.assigneeUserId === "string" ? body.assigneeUserId : undefined,
      organizationId: typeof body.organizationId === "string" ? body.organizationId : undefined,
      slaMinutes: typeof body.slaMinutes === "number" ? body.slaMinutes : undefined,
      slaPolicy: typeof body.slaPolicy === "string" ? body.slaPolicy : undefined,
      note: typeof body.note === "string" ? body.note.slice(0, 2_000) : undefined,
    });
    await recordRequestAudit(req, {
      actor: context?.actor || "admin",
      actorRole: context?.role || "admin",
      action: `admin.handoff.${action}`,
      targetType: "HandoffTask",
      targetId: id,
      metadata: {
        status: result.status,
        assigneeSet: Boolean(result.assignee),
        assigneeUserIdSet: Boolean(body.assigneeUserId),
        slaMinutes: typeof body.slaMinutes === "number" ? body.slaMinutes : null,
        noteProvided: Boolean(body.note),
      },
    });
    return NextResponse.json({ task: result });
  } catch (error) {
    if (error instanceof JsonBodyError) return NextResponse.json({ error: error.message }, { status: error.status });
    const message = error instanceof Error ? error.message : String(error);
    const status = message === "HANDOFF_NOT_FOUND"
      ? 404
      : [
          "HANDOFF_ACTION_INVALID",
          "HANDOFF_ASSIGNEE_REQUIRED",
          "HANDOFF_ASSIGNEE_INVALID",
          "HANDOFF_SLA_INVALID",
          "HANDOFF_CONTACT_REQUIRED",
        ].includes(message)
        ? 400
        : 500;
    console.error("[PATCH /api/admin/handoffs]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
