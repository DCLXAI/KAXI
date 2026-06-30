import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, requireAdmin } from "@/lib/api/security";
import { findSchoolById, normalizeSchoolPayload, type SchoolMutationInput } from "@/lib/schools/repository";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const school = await findSchoolById(id);
  if (!school) return jsonError("School not found", 404);
  return NextResponse.json({ school });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const unauthorized = await requireAdmin(req);
    if (unauthorized) return unauthorized;

    const { id } = await context.params;
    const body = (await req.json()) as SchoolMutationInput;
    const data = normalizeSchoolPayload(body || {}, "update");
    const school = await db.school.update({ where: { id }, data: data as any });

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

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/schools/:id]", err);
    return jsonError(err instanceof Error ? err.message : "Unable to delete school", 400);
  }
}
