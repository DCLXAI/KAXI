import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AuthBridgeError, requireKaxiUser } from "@/lib/supabase/auth";
import { CasePipelineError, assertPartnerCaseScope } from "@/lib/cases/repository";
import { toPartnerCaseDetail } from "@/lib/cases/partner-serializers";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ id: string }>;
};

const INCLUDE = {
  studentProfile: { include: { user: true, documents: { include: { file: true } } } },
  reviews: true,
  timelineEvents: { orderBy: { createdAt: "desc" as const } },
  documentLinks: { include: { documentItem: { include: { file: true } } } },
} as const;

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const user = await requireKaxiUser(["PARTNER_AGENT"]);
    if (!user.organizationId) return NextResponse.json({ error: "Partner organization is required" }, { status: 403 });
    const { id } = await params;
    await assertPartnerCaseScope(id, user.organizationId);
    const caseItem = await db.escalationCase.findUnique({ where: { id }, include: INCLUDE });
    if (!caseItem) return NextResponse.json({ error: "Case not found" }, { status: 404 });
    return NextResponse.json({ case: toPartnerCaseDetail(caseItem) });
  } catch (err) {
    if (err instanceof AuthBridgeError || err instanceof CasePipelineError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("[GET /api/partner/cases/:id]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
