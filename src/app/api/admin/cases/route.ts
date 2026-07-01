import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api/security";
import { summarizeCaseCounts, toAdminCaseListItem } from "@/lib/admin/serializers";
import type { AdminCaseBucket } from "@/lib/admin/types";

export const runtime = "nodejs";

const CASE_INCLUDE = {
  studentProfile: {
    include: {
      user: true,
      documents: { include: { file: true } },
      complianceEvaluations: {
        include: { ruleVersion: { include: { rule: true } } },
      },
    },
  },
  reviews: true,
} as const;

function isBucket(value: string | null): value is AdminCaseBucket {
  if (!value) return false;
  return ["new", "due_soon", "high_risk", "needs_more_documents", "approved"].includes(value);
}

export async function GET(req: NextRequest) {
  try {
    const unauthorized = await requireAdmin(req, { roles: ["owner", "admin", "viewer"] });
    if (unauthorized) return unauthorized;

    const bucket = req.nextUrl.searchParams.get("bucket");
    const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit") || "100"), 1), 300);

    const cases = await db.escalationCase.findMany({
      include: CASE_INCLUDE,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: limit,
    });
    const counts = summarizeCaseCounts(cases);
    const items = cases.map(toAdminCaseListItem).filter((item) => !isBucket(bucket) || item.bucket === bucket);

    return NextResponse.json({ cases: items, counts });
  } catch (err) {
    console.error("[GET /api/admin/cases]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
