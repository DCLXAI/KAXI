import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, requireAdmin } from "@/lib/api/security";
import { listSchools, normalizeSchoolPayload, type SchoolMutationInput } from "@/lib/schools/repository";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const schools = await listSchools({
    region: searchParams.get("region") || "all",
    program: searchParams.get("program") || "all",
    accreditation: searchParams.get("accreditation") || "all",
    maxTuition: Number(searchParams.get("maxTuition") || 0) || undefined,
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

    return NextResponse.json({ school }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/schools]", err);
    return jsonError(err instanceof Error ? err.message : "Unable to create school", 400);
  }
}
