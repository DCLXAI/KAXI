import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminContext, jsonError, requireAdmin } from "@/lib/api/security";
import { recordRequestAudit } from "@/lib/audit";
import { listSchools, normalizeSchoolPayload, type SchoolMutationInput } from "@/lib/schools/repository";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const includeExpired = searchParams.get("includeExpired") === "true";
  if (includeExpired) {
    const unauthorized = await requireAdmin(req, { roles: ["owner", "admin", "viewer"] });
    if (unauthorized) return unauthorized;
  }
  const schools = await listSchools({
    region: searchParams.get("region") || "all",
    program: searchParams.get("program") || "all",
    accreditation: searchParams.get("accreditation") || "all",
    maxTuition: Number(searchParams.get("maxTuition") || 0) || undefined,
    includeExpired,
  });

  return NextResponse.json({ schools, total: schools.length });
}

export async function POST(req: NextRequest) {
  try {
    const unauthorized = await requireAdmin(req);
    if (unauthorized) return unauthorized;

    const body = (await req.json()) as SchoolMutationInput;
    const data = normalizeSchoolPayload(body || {}, "create");
    const school = await db.school.create({ data: data as any });
    const actor = await getAdminContext(req);
    await recordRequestAudit(req, {
      actor: actor?.actor || "unknown",
      actorRole: actor?.role || "admin",
      action: "school.create",
      targetType: "School",
      targetId: school.id,
      metadata: { sourceUrl: school.sourceUrl, verifiedAt: school.verifiedAt, reviewAfter: school.reviewAfter },
    });

    return NextResponse.json({ school }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/schools]", err);
    return jsonError(err instanceof Error ? err.message : "Unable to create school", 400);
  }
}
