import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminContext, requireAdmin } from "@/lib/api/security";
import { recordRequestAudit } from "@/lib/audit";
import { toAdminRuleItem } from "@/lib/admin/serializers";

export const runtime = "nodejs";

function isReviewStatus(value: unknown): value is "PENDING" | "APPROVED" | "REJECTED" {
  return value === "PENDING" || value === "APPROVED" || value === "REJECTED";
}

export async function GET(req: NextRequest) {
  try {
    const unauthorized = await requireAdmin(req, { roles: ["owner", "admin", "viewer"] });
    if (unauthorized) return unauthorized;

    const rules = await db.complianceRule.findMany({
      include: {
        versions: {
          include: { tests: true },
          orderBy: { version: "desc" },
        },
      },
      orderBy: [{ domain: "asc" }, { code: "asc" }],
    });

    return NextResponse.json({ rules: rules.map(toAdminRuleItem) });
  } catch (err) {
    console.error("[GET /api/admin/rules]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const unauthorized = await requireAdmin(req, { roles: ["owner", "admin"] });
    if (unauthorized) return unauthorized;
    const context = await getAdminContext(req);
    const body = (await req.json().catch(() => ({}))) as {
      versionId?: string;
      reviewStatus?: string;
    };

    if (!body.versionId || !isReviewStatus(body.reviewStatus)) {
      return NextResponse.json({ error: "versionId and valid reviewStatus are required" }, { status: 400 });
    }

    const version = await db.complianceRuleVersion.update({
      where: { id: body.versionId },
      data: {
        reviewStatus: body.reviewStatus,
        reviewedBy: context?.actor || "admin",
        reviewedAt: new Date(),
      },
      include: { rule: true },
    });

    await recordRequestAudit(req, {
      actor: context?.actor || "admin",
      actorRole: context?.role || "admin",
      action: "rule.review_status.update",
      targetType: "complianceRuleVersion",
      targetId: version.id,
      metadata: {
        ruleCode: version.rule.code,
        version: version.version,
        reviewStatus: version.reviewStatus,
      },
    });

    return NextResponse.json({ ok: true, version });
  } catch (err) {
    console.error("[PATCH /api/admin/rules]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
