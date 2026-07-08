import { NextResponse } from "next/server";
import { AuthBridgeError, requireKaxiUser } from "@/lib/supabase/auth";
import { listPartnerCases } from "@/lib/cases/repository";
import { toPartnerCaseListItem } from "@/lib/cases/partner-serializers";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireKaxiUser(["PARTNER_AGENT"]);
    if (!user.organizationId) return NextResponse.json({ error: "Partner organization is required" }, { status: 403 });
    const cases = await listPartnerCases(user.organizationId);
    return NextResponse.json({ cases: cases.map(toPartnerCaseListItem) });
  } catch (err) {
    if (err instanceof AuthBridgeError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("[GET /api/partner/cases]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
