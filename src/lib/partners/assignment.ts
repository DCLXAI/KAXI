import { ConsentScope, ConsentStatus, OrgType } from "@prisma/client";
import { db } from "@/lib/db";
import { notifyUsers } from "@/lib/notifications/repository";
import { slaDefaultMinutes, slaDueAt, slaTierForMinutes } from "@/lib/ops/sla-policy";

export class PartnerRequestAssignmentError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "PartnerRequestAssignmentError";
    this.code = code;
    this.status = status;
  }
}

export async function listAdminPartnerRequests() {
  const [requests, organizations] = await Promise.all([
    db.partnerRequest.findMany({
      where: { deletedAt: null },
      include: { lead: true, organization: true, assignedUser: true },
      orderBy: [{ createdAt: "desc" }],
      take: 300,
    }),
    db.organization.findMany({
      where: { type: OrgType.PARTNER_AGENT_OFFICE },
      include: {
        users: {
          where: { role: "PARTNER_AGENT" },
          select: { id: true, email: true, locale: true },
          orderBy: { email: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);
  return { requests, organizations };
}

export async function assignPartnerRequest(input: {
  requestId: string;
  organizationId: string;
  assignedUserId?: string | null;
  actor: string;
}) {
  return db.$transaction(async (tx) => {
    const [request, organization] = await Promise.all([
      tx.partnerRequest.findUnique({ where: { id: input.requestId } }),
      tx.organization.findUnique({
        where: { id: input.organizationId },
        include: {
          users: {
            where: { role: "PARTNER_AGENT" },
            select: { id: true, email: true, locale: true },
          },
        },
      }),
    ]);
    if (!request || request.deletedAt) {
      throw new PartnerRequestAssignmentError("request_not_found", "Partner request not found", 404);
    }
    if (request.status === "closed") {
      throw new PartnerRequestAssignmentError("request_closed", "Closed requests cannot be reassigned", 409);
    }
    const consentRows = await tx.consent.findMany({
      where: {
        user: { zaloUid: `lead:${request.leadId}` },
        scope: {
          in: [ConsentScope.THIRD_PARTY_PROVISION, ConsentScope.PROCESSING_CONSIGNMENT, ConsentScope.OVERSEAS_TRANSFER],
        },
        status: ConsentStatus.GRANTED,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { scope: true },
    });
    if (new Set(consentRows.map((row) => row.scope)).size !== 3) {
      throw new PartnerRequestAssignmentError("partner_consent_required", "Active partner routing consent is required", 428);
    }
    if (!organization || organization.type !== OrgType.PARTNER_AGENT_OFFICE) {
      throw new PartnerRequestAssignmentError("invalid_partner_office", "A partner office is required", 400);
    }
    if (input.assignedUserId && !organization.users.some((user) => user.id === input.assignedUserId)) {
      throw new PartnerRequestAssignmentError("invalid_assignee", "Assignee must belong to the selected partner office", 400);
    }

    const now = new Date();
    // PartnerRequest carries no risk/urgency column (see
    // prisma/postgres/schema.prisma), so this always resolves to the
    // standard-24h tier -- there is nothing risk-like to pass through.
    const slaMinutes = slaDefaultMinutes({ riskLevel: null, leadStage: null });
    const updated = await tx.partnerRequest.update({
      where: { id: request.id },
      data: {
        organizationId: organization.id,
        assignedUserId: input.assignedUserId || null,
        status: "matched",
        matchedAt: now,
        acceptedAt: null,
        closedAt: null,
        slaTier: slaTierForMinutes(slaMinutes),
        slaDueAt: slaDueAt(now, slaMinutes),
        // A fresh slaTier/slaDueAt means a fresh SLA window. Reset the rest of
        // the window in the same write -- otherwise a REassignment leaves the
        // previous office's slaFirstResponseAt in place, which permanently
        // short-circuits classifySlaItem into "skipped" for the new window,
        // and a stale slaBreachAlertedAt would permanently suppress the new
        // window's alert too.
        slaFirstResponseAt: null,
        slaBreachAlertedAt: null,
      },
      include: { lead: true, organization: true, assignedUser: true },
    });

    await tx.auditEvent.create({
      data: {
        actorRole: "admin",
        action: "partner.request.assigned",
        targetType: "PartnerRequest",
        targetId: request.id,
        organizationId: organization.id,
        success: true,
        metadata: {
          actor: input.actor,
          organizationId: organization.id,
          assignedUserId: input.assignedUserId || null,
          previousStatus: request.status,
        },
      },
    });

    const recipients = input.assignedUserId
      ? organization.users.filter((user) => user.id === input.assignedUserId)
      : organization.users;
    await notifyUsers({
      users: recipients,
      eventKey: `partner-request:${request.id}:matched:${organization.id}`,
      copy: {
        ko: { title: "새 상담 요청", message: "새로운 상담 요청이 파트너 워크스페이스에 배정되었습니다." },
        vi: { title: "Yêu cầu tư vấn mới", message: "Một yêu cầu tư vấn mới đã được giao vào không gian đối tác." },
        mn: { title: "Шинэ зөвлөгөөний хүсэлт", message: "Түншийн талбарт шинэ зөвлөгөөний хүсэлт хуваарилагдлаа." },
        en: { title: "New consultation request", message: "A new consultation request was assigned to your partner workspace." },
      },
      href: "/partner",
      metadata: { requestId: request.id, partnerType: request.partnerType },
      tx,
    });

    return updated;
  });
}

export async function listPartnerRequestInbox(organizationId: string) {
  return db.partnerRequest.findMany({
    where: {
      organizationId,
      deletedAt: null,
      status: { in: ["matched", "accepted"] },
    },
    include: { lead: true, organization: true, assignedUser: true },
    orderBy: [{ matchedAt: "desc" }, { createdAt: "desc" }],
    take: 200,
  });
}

export async function updatePartnerRequestStatus(input: {
  requestId: string;
  organizationId: string;
  userId: string;
  action: "accept" | "close";
}) {
  return db.$transaction(async (tx) => {
    const request = await tx.partnerRequest.findUnique({ where: { id: input.requestId } });
    if (!request || request.deletedAt) {
      throw new PartnerRequestAssignmentError("request_not_found", "Partner request not found", 404);
    }
    if (request.organizationId !== input.organizationId) {
      throw new PartnerRequestAssignmentError("request_scope_forbidden", "Request is not assigned to this organization", 403);
    }
    if (request.status === "closed") {
      throw new PartnerRequestAssignmentError("request_closed", "Request is already closed", 409);
    }
    if (request.assignedUserId && request.assignedUserId !== input.userId) {
      throw new PartnerRequestAssignmentError("request_assignee_forbidden", "Request is assigned to another partner", 403);
    }

    const now = new Date();
    const status = input.action === "accept" ? "accepted" : "closed";
    const transition = await tx.partnerRequest.updateMany({
      where: {
        id: request.id,
        organizationId: input.organizationId,
        deletedAt: null,
        status: input.action === "accept" ? "matched" : { in: ["matched", "accepted"] },
        OR: [{ assignedUserId: null }, { assignedUserId: input.userId }],
      },
      data: input.action === "accept"
        // The partner accepting the request is the SLA-bearing row's actual
        // first response -- matched/accepted are the only statuses an
        // assigned PartnerRequest can reach, and canTransitionPartnerRequestStatus
        // never allows matched/accepted -> contacted, so the admin "contacted"
        // stamp below is otherwise unreachable for these rows. Write-once:
        // never overwrite an existing slaFirstResponseAt (mirrors
        // acceptAssignedCase in src/lib/cases/repository.ts).
        ? { status, assignedUserId: input.userId, acceptedAt: now, slaFirstResponseAt: request.slaFirstResponseAt ?? now }
        : { status, assignedUserId: request.assignedUserId || input.userId, closedAt: now },
    });
    if (transition.count !== 1) {
      throw new PartnerRequestAssignmentError(
        "request_transition_conflict",
        "Request status changed before this action completed",
        409,
      );
    }
    const updated = await tx.partnerRequest.findUniqueOrThrow({
      where: { id: request.id },
      include: { lead: true, organization: true, assignedUser: true },
    });

    await tx.auditEvent.create({
      data: {
        actorUserId: input.userId,
        actorRole: "partner",
        organizationId: input.organizationId,
        action: `partner.request.${status}`,
        targetType: "PartnerRequest",
        targetId: request.id,
        success: true,
        metadata: { previousStatus: request.status, nextStatus: status },
      },
    });

    const admins = await tx.user.findMany({
      where: { role: "PLATFORM_ADMIN" },
      select: { id: true, locale: true },
    });
    await notifyUsers({
      users: admins,
      eventKey: `partner-request:${request.id}:${status}`,
      copy: {
        ko: { title: status === "accepted" ? "상담 요청 수락" : "상담 요청 종결", message: `파트너가 상담 요청을 ${status === "accepted" ? "수락" : "종결"}했습니다.` },
        vi: { title: status === "accepted" ? "Đã nhận yêu cầu" : "Đã đóng yêu cầu", message: `Đối tác đã ${status === "accepted" ? "nhận" : "đóng"} yêu cầu tư vấn.` },
        mn: { title: status === "accepted" ? "Хүсэлтийг хүлээн авлаа" : "Хүсэлтийг хаалаа", message: `Түнш зөвлөгөөний хүсэлтийг ${status === "accepted" ? "хүлээн авлаа" : "хаалаа"}.` },
        en: { title: status === "accepted" ? "Request accepted" : "Request closed", message: `The partner ${status === "accepted" ? "accepted" : "closed"} the consultation request.` },
      },
      href: "/admin/leads",
      metadata: { requestId: request.id, status },
      tx,
    });

    return updated;
  });
}
