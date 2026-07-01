import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api/security";
import { toAdminAuditLogItem, toAuditEventItem } from "@/lib/admin/serializers";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const unauthorized = await requireAdmin(req, { roles: ["owner", "admin", "viewer"] });
    if (unauthorized) return unauthorized;

    const caseId = req.nextUrl.searchParams.get("caseId") || undefined;
    const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit") || "100"), 1), 500);

    const [auditEvents, adminLogs] = await Promise.all([
      db.auditEvent.findMany({
        where: caseId ? { OR: [{ caseId }, { targetId: caseId }] } : {},
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      db.adminAuditLog.findMany({
        where: caseId ? { targetId: caseId } : {},
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
    ]);

    const events = [
      ...auditEvents.map(toAuditEventItem),
      ...adminLogs.map(toAdminAuditLogItem),
    ]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);

    return NextResponse.json({ events });
  } catch (err) {
    console.error("[GET /api/admin/audit]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
