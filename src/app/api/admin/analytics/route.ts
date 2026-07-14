import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, requireAdmin } from "@/lib/api/security";
import { getProductAnalytics } from "@/lib/analytics/admin";
import { recordRequestAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req, { roles: ["owner", "admin", "viewer"] });
  if (unauthorized) return unauthorized;
  const context = await getAdminContext(req);
  const parsedDays = Number(req.nextUrl.searchParams.get("days") || 30);
  const days = [7, 30, 90].includes(parsedDays) ? parsedDays : 30;
  try {
    const analytics = await getProductAnalytics(days);
    await recordRequestAudit(req, {
      actor: context?.actor || "admin",
      actorRole: context?.role || "viewer",
      action: "admin.analytics.read",
      targetType: "ProductAnalytics",
      targetId: `${days}d`,
      metadata: { days },
    });
    return NextResponse.json(analytics);
  } catch (error) {
    console.error("[GET /api/admin/analytics]", error);
    return NextResponse.json({ error: "Could not load product analytics" }, { status: 500 });
  }
}
