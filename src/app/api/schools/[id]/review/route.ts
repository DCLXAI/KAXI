import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recordRequestAudit } from "@/lib/audit";
import { getAdminContext, jsonError, requireAdmin } from "@/lib/api/security";
import { normalizeSchoolPayload } from "@/lib/schools/repository";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const unauthorized = await requireAdmin(req);
    if (unauthorized) return unauthorized;

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const verifiedAt = typeof body.verifiedAt === "string"
      ? body.verifiedAt
      : new Date().toISOString().slice(0, 10);
    const reviewAfter = typeof body.reviewAfter === "string"
      ? body.reviewAfter
      : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const data = normalizeSchoolPayload({
      sourceUrl: body.sourceUrl,
      officialUrl: body.officialUrl,
      verifiedAt,
      reviewAfter,
    }, "update");
    const school = await db.school.update({ where: { id }, data });
    const actor = await getAdminContext(req);
    await recordRequestAudit(req, {
      actor: actor?.actor || "unknown",
      actorRole: actor?.role || "admin",
      action: "school.reverify",
      targetType: "School",
      targetId: id,
      metadata: { sourceUrl: school.sourceUrl, verifiedAt: school.verifiedAt, reviewAfter: school.reviewAfter },
    });

    return NextResponse.json({ school });
  } catch (err) {
    console.error("[POST /api/schools/:id/review]", err);
    return jsonError(err instanceof Error ? err.message : "Unable to reverify school", 400);
  }
}
