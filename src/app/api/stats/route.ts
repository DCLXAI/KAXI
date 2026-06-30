import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api/security";

// GET /api/stats - 관리자 대시보드 통계
export async function GET(req: NextRequest) {
  try {
    const unauthorized = await requireAdmin(req);
    if (unauthorized) return unauthorized;

    const [totalLeads, totalRequests, pendingRequests, brokerUsers] = await Promise.all([
      db.lead.count(),
      db.partnerRequest.count(),
      db.partnerRequest.count({ where: { status: "pending" } }),
      db.lead.count({ where: { usingBroker: true } }),
    ]);

    // 국적별 분포
    const byNationality = await db.lead.groupBy({
      by: ["nationality"],
      _count: true,
    });

    // 경로별 분포
    const byPath = await db.lead.groupBy({
      by: ["pathKey"],
      _count: true,
    });

    // 최근 7일 리드
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentLeads = await db.lead.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });

    return NextResponse.json({
      totalLeads,
      totalRequests,
      pendingRequests,
      brokerUsers,
      recentLeads,
      byNationality,
      byPath,
    });
  } catch (e) {
    console.error("[GET /api/stats]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
