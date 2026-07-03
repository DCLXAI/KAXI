import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminContext, jsonError, requireAdmin } from "@/lib/api/security";
import { recordRequestAudit } from "@/lib/audit";
import {
  findSchoolById,
  isSchoolOperationalDatabaseError,
  normalizeSchoolPayload,
  type SchoolMutationInput,
} from "@/lib/schools/repository";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const includeExpired = _req.nextUrl.searchParams.get("includeExpired") === "true";
    if (includeExpired) {
      const unauthorized = await requireAdmin(_req, { roles: ["owner", "admin", "viewer"] });
      if (unauthorized) return unauthorized;
    }
    const school = await findSchoolById(id, { includeExpired });
    if (!school) return jsonError("School not found", 404);
    return NextResponse.json({ school });
  } catch (err) {
    if (isSchoolOperationalDatabaseError(err)) {
      return jsonError(err.message, 503);
    }
    console.error("[GET /api/schools/:id]", err);
    return jsonError("Unable to read school", 500);
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const unauthorized = await requireAdmin(req);
    if (unauthorized) return unauthorized;

    const { id } = await context.params;
    const body = (await req.json()) as SchoolMutationInput;
    const data = normalizeSchoolPayload(body || {}, "update");
    const school = await db.school.update({ where: { id }, data });
    const actor = await getAdminContext(req);
    await recordRequestAudit(req, {
      actor: actor?.actor || "unknown",
      actorRole: actor?.role || "admin",
      action: "school.update",
      targetType: "School",
      targetId: id,
      metadata: { fields: Object.keys(data) },
    });

    return NextResponse.json({ school });
  } catch (err) {
    console.error("[PATCH /api/schools/:id]", err);
    return jsonError(err instanceof Error ? err.message : "Unable to update school", 400);
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const unauthorized = await requireAdmin(req);
    if (unauthorized) return unauthorized;

    const { id } = await context.params;
    await db.school.delete({ where: { id } });
    const actor = await getAdminContext(req);
    await recordRequestAudit(req, {
      actor: actor?.actor || "unknown",
      actorRole: actor?.role || "admin",
      action: "school.delete",
      targetType: "School",
      targetId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/schools/:id]", err);
    return jsonError(err instanceof Error ? err.message : "Unable to delete school", 400);
  }
}
