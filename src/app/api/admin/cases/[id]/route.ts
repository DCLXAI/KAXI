import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api/security";
import { toAdminAuditLogItem, toAdminCaseDetail, toAuditEventItem } from "@/lib/admin/serializers";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ id: string }>;
};

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
  organization: true,
  assignedUser: true,
  timelineEvents: true,
  documentLinks: { include: { documentItem: true } },
} as const;

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const unauthorized = await requireAdmin(req, { roles: ["owner", "admin", "viewer"] });
    if (unauthorized) return unauthorized;

    const { id } = await params;
    const caseItem = await db.escalationCase.findUnique({
      where: { id },
      include: CASE_INCLUDE,
    });
    if (!caseItem) return NextResponse.json({ error: "Case not found" }, { status: 404 });

    const [auditEvents, adminLogs] = await Promise.all([
      db.auditEvent.findMany({
        where: { OR: [{ caseId: id }, { targetId: id }] },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      db.adminAuditLog.findMany({
        where: { targetType: "case", targetId: id },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    const [partnerOffices, events] = await Promise.all([
      db.organization.findMany({
        where: { type: "PARTNER_AGENT_OFFICE" },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      Promise.resolve([
      ...auditEvents.map(toAuditEventItem),
      ...adminLogs.map(toAdminAuditLogItem),
      ].sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
    ]);

    return NextResponse.json({ case: toAdminCaseDetail(caseItem, events, partnerOffices) });
  } catch (err) {
    console.error("[GET /api/admin/cases/:id]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
