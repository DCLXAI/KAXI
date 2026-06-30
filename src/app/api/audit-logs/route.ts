import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api/security";

export async function GET(req: NextRequest) {
  try {
    const unauthorized = await requireAdmin(req, { roles: ["owner", "admin"] });
    if (unauthorized) return unauthorized;

    const searchParams = req.nextUrl.searchParams;
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || "100"), 1), 500);
    const action = searchParams.get("action") || undefined;
    const targetType = searchParams.get("targetType") || undefined;

    const logs = await db.adminAuditLog.findMany({
      where: {
        ...(action ? { action } : {}),
        ...(targetType ? { targetType } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ logs });
  } catch (err) {
    console.error("[GET /api/audit-logs]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
