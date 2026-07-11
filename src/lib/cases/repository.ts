import {
  ConsentScope,
  ConsentStatus,
  OrgType,
  Prisma,
  ReviewStatus,
  type EscalationCase,
} from "@prisma/client";
import { db } from "@/lib/db";
import { CASE_NOTIFICATION_COPY, notifyCaseStudent } from "@/lib/notifications/domain";
import { notifyUsers } from "@/lib/notifications/repository";

type Tx = Prisma.TransactionClient;

export class CasePipelineError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "CasePipelineError";
    this.code = code;
    this.status = status;
  }
}

export interface CaseActor {
  actorUserId?: string | null;
  actorRole?: string | null;
  organizationId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

export interface CreateHighRiskEscalationInput {
  studentProfileId: string;
  category: string;
  summary: string;
  conversationSummary?: string | null;
  ruleSnapshot?: unknown;
  aiDraft?: string | null;
  actor?: CaseActor;
}

export interface CaseActionResult {
  case: EscalationCase;
}

const OPEN_STATUSES = ["NEW", "NEEDS_MORE_DOCUMENTS", "HIGH_RISK", "APPROVED", "REJECTED"] as const;

function jsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function normalizeNote(value: string | null | undefined, fallback: string): string {
  const text = String(value || fallback).trim();
  return text.slice(0, 2000) || fallback;
}

function assertOpen(caseItem: Pick<EscalationCase, "status">) {
  if (caseItem.status === "CLOSED" || caseItem.status === "STOPPED") {
    throw new CasePipelineError("case_closed", "Closed or stopped cases cannot be updated", 409);
  }
}

async function findCaseOrThrow(tx: Tx, caseId: string) {
  const caseItem = await tx.escalationCase.findUnique({ where: { id: caseId } });
  if (!caseItem) throw new CasePipelineError("case_not_found", "Case not found", 404);
  return caseItem;
}

async function recordTimeline(
  tx: Tx,
  caseId: string,
  eventType: string,
  message: string | null,
  actor: CaseActor | undefined,
  metadata?: unknown
) {
  await tx.caseTimelineEvent.create({
    data: {
      escalationCaseId: caseId,
      actorUserId: actor?.actorUserId || null,
      actorRole: actor?.actorRole || null,
      eventType,
      message,
      metadata: jsonValue(metadata),
    },
  });
}

async function recordAudit(
  tx: Tx,
  action: string,
  caseId: string,
  actor: CaseActor | undefined,
  metadata?: unknown
) {
  await tx.auditEvent.create({
    data: {
      organizationId: actor?.organizationId || null,
      actorUserId: actor?.actorUserId || null,
      actorRole: actor?.actorRole || null,
      action,
      targetType: "case",
      targetId: caseId,
      caseId,
      ip: actor?.ip || null,
      userAgent: actor?.userAgent || null,
      success: true,
      metadata: jsonValue(metadata) || {},
    },
  });
}

export async function hasThirdPartyProvisionConsent(studentProfileId: string, tx: Tx | typeof db = db): Promise<boolean> {
  const profile = await tx.studentProfile.findUnique({
    where: { id: studentProfileId },
    select: { userId: true },
  });
  if (!profile) throw new CasePipelineError("student_not_found", "Student profile not found", 404);

  const activeConsent = await tx.consent.findFirst({
    where: {
      userId: profile.userId,
      scope: ConsentScope.THIRD_PARTY_PROVISION,
      status: ConsentStatus.GRANTED,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { grantedAt: "desc" },
    select: { id: true },
  });

  return Boolean(activeConsent);
}

export async function assertPartnerCaseScope(caseId: string, organizationId: string, tx: Tx | typeof db = db) {
  const caseItem = await tx.escalationCase.findUnique({
    where: { id: caseId },
    select: { id: true, organizationId: true, studentProfileId: true },
  });
  if (!caseItem) throw new CasePipelineError("case_not_found", "Case not found", 404);
  if (caseItem.organizationId !== organizationId) {
    throw new CasePipelineError("case_scope_forbidden", "Case is not assigned to this organization", 403);
  }
  if (!(await hasThirdPartyProvisionConsent(caseItem.studentProfileId, tx))) {
    throw new CasePipelineError("third_party_consent_required", "Third-party provision consent is required", 403);
  }
  return caseItem;
}

export async function listPartnerCases(organizationId: string) {
  const cases = await db.escalationCase.findMany({
    where: {
      organizationId,
      status: { in: [...OPEN_STATUSES] },
      studentProfile: {
        user: {
          consents: {
            some: {
              scope: ConsentScope.THIRD_PARTY_PROVISION,
              status: ConsentStatus.GRANTED,
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
          },
        },
      },
    },
    include: {
      organization: true,
      assignedUser: true,
      studentProfile: { include: { user: true, documents: { include: { file: true } } } },
      reviews: true,
      timelineEvents: { orderBy: { createdAt: "desc" }, take: 20 },
      documentLinks: { include: { documentItem: { include: { file: true } } } },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });
  return cases;
}

export async function createHighRiskEscalationCase(input: CreateHighRiskEscalationInput): Promise<CaseActionResult> {
  const actor = input.actor || { actorRole: "system" };
  return db.$transaction(async (tx) => {
    const student = await tx.studentProfile.findUnique({ where: { id: input.studentProfileId } });
    if (!student) throw new CasePipelineError("student_not_found", "Student profile not found", 404);

    const caseItem = await tx.escalationCase.create({
      data: {
        studentProfileId: input.studentProfileId,
        status: "HIGH_RISK",
        riskLevel: "HIGH",
        category: input.category.slice(0, 160),
        summary: input.summary.slice(0, 1000),
        conversationSummary: input.conversationSummary?.slice(0, 4000) || null,
        ruleSnapshot: jsonValue(input.ruleSnapshot),
        aiDraft: input.aiDraft?.slice(0, 8000) || null,
      },
    });

    await recordTimeline(tx, caseItem.id, "case.created", input.summary, actor, {
      category: input.category,
      riskLevel: "HIGH",
      source: "high-risk-hook",
    });
    await recordAudit(tx, "case.created", caseItem.id, actor, {
      status: caseItem.status,
      riskLevel: caseItem.riskLevel,
      category: caseItem.category,
    });
    await notifyCaseStudent({ caseId: caseItem.id, eventKey: "created", copy: CASE_NOTIFICATION_COPY.created, tx });

    return { case: caseItem };
  });
}

export async function assignCaseToPartnerOffice(input: {
  caseId: string;
  organizationId: string;
  assignedUserId?: string | null;
  note?: string | null;
  actor?: CaseActor;
}): Promise<CaseActionResult> {
  const actor = input.actor || { actorRole: "admin" };
  return db.$transaction(async (tx) => {
    const [caseItem, organization] = await Promise.all([
      findCaseOrThrow(tx, input.caseId),
      tx.organization.findUnique({
        where: { id: input.organizationId },
        include: {
          users: {
            where: { role: "PARTNER_AGENT" },
            select: { id: true, locale: true },
          },
        },
      }),
    ]);
    if (!organization || organization.type !== OrgType.PARTNER_AGENT_OFFICE) {
      throw new CasePipelineError("invalid_partner_office", "Organization must be a partner agent office", 400);
    }
    assertOpen(caseItem);

    if (input.assignedUserId) {
      const user = await tx.user.findUnique({
        where: { id: input.assignedUserId },
        select: { organizationId: true, role: true },
      });
      if (!user || user.organizationId !== input.organizationId || user.role !== "PARTNER_AGENT") {
        throw new CasePipelineError("invalid_assignee", "Assigned user must belong to the partner office", 400);
      }
    }

    const now = new Date();
    const updated = await tx.escalationCase.update({
      where: { id: input.caseId },
      data: {
        organizationId: input.organizationId,
        assignedUserId: input.assignedUserId || null,
        matchedAt: caseItem.matchedAt || now,
        status: caseItem.status === "NEW" ? "HIGH_RISK" : caseItem.status,
        riskLevel: caseItem.riskLevel === "UNKNOWN" ? "HIGH" : caseItem.riskLevel,
      },
    });
    const note = normalizeNote(input.note, `파트너 사무소 ${organization.name}에 배정`);
    await recordTimeline(tx, input.caseId, "case.assigned", note, actor, {
      organizationId: input.organizationId,
      assignedUserId: input.assignedUserId || null,
      previousStatus: caseItem.status,
      nextStatus: updated.status,
    });
    await recordAudit(tx, "case.assigned", input.caseId, actor, {
      organizationId: input.organizationId,
      assignedUserId: input.assignedUserId || null,
      previousStatus: caseItem.status,
      nextStatus: updated.status,
    });
    await notifyCaseStudent({ caseId: input.caseId, eventKey: "assigned", copy: CASE_NOTIFICATION_COPY.assigned, tx });
    const partnerRecipients = input.assignedUserId
      ? organization.users.filter((user) => user.id === input.assignedUserId)
      : organization.users;
    await notifyUsers({
      users: partnerRecipients,
      eventKey: `case:${input.caseId}:assigned:${organization.id}`,
      copy: {
        ko: { title: "새 케이스 배정", message: "파트너 워크스페이스에 새 케이스가 배정되었습니다." },
        vi: { title: "Hồ sơ mới được giao", message: "Một hồ sơ mới đã được giao vào không gian đối tác." },
        mn: { title: "Шинэ кейс хуваарилагдлаа", message: "Түншийн талбарт шинэ кейс хуваарилагдлаа." },
        en: { title: "New case assigned", message: "A new case was assigned to your partner workspace." },
      },
      href: `/partner/cases/${input.caseId}`,
      metadata: { caseId: input.caseId, organizationId: organization.id },
      tx,
    });

    return { case: updated };
  });
}

export async function acceptAssignedCase(input: {
  caseId: string;
  organizationId: string;
  reviewerUserId?: string | null;
  note?: string | null;
  actor?: CaseActor;
}): Promise<CaseActionResult> {
  const actor = { ...(input.actor || {}), organizationId: input.organizationId, actorRole: input.actor?.actorRole || "partner" };
  return db.$transaction(async (tx) => {
    const scopeCase = await assertPartnerCaseScope(input.caseId, input.organizationId, tx);
    const caseItem = await findCaseOrThrow(tx, scopeCase.id);
    assertOpen(caseItem);
    if (!caseItem.matchedAt) {
      throw new CasePipelineError("case_not_assigned", "Case must be assigned before acceptance", 409);
    }

    const now = new Date();
    const note = normalizeNote(input.note, "파트너 사무소가 케이스를 수임했습니다.");
    const updated = await tx.escalationCase.update({
      where: { id: input.caseId },
      data: {
        status: "APPROVED",
        acceptedAt: caseItem.acceptedAt || now,
        assignedUserId: input.reviewerUserId || caseItem.assignedUserId,
      },
    });
    await tx.agentReview.create({
      data: {
        escalationCaseId: input.caseId,
        reviewerUserId: input.reviewerUserId || null,
        decision: ReviewStatus.APPROVED,
        note,
      },
    });
    await recordTimeline(tx, input.caseId, "case.accepted", note, actor, {
      previousStatus: caseItem.status,
      nextStatus: updated.status,
    });
    await recordAudit(tx, "case.accepted", input.caseId, actor, {
      previousStatus: caseItem.status,
      nextStatus: updated.status,
      reviewerUserId: input.reviewerUserId || null,
    });
    await notifyCaseStudent({ caseId: input.caseId, eventKey: "accepted", copy: CASE_NOTIFICATION_COPY.accepted, tx });

    return { case: updated };
  });
}

export async function addCaseComment(input: {
  caseId: string;
  message: string;
  organizationId?: string | null;
  actor?: CaseActor;
}): Promise<CaseActionResult> {
  const actor = input.actor || { actorRole: input.organizationId ? "partner" : "admin" };
  return db.$transaction(async (tx) => {
    if (input.organizationId) await assertPartnerCaseScope(input.caseId, input.organizationId, tx);
    const caseItem = await findCaseOrThrow(tx, input.caseId);
    assertOpen(caseItem);

    const message = normalizeNote(input.message, "케이스 코멘트");
    await recordTimeline(tx, input.caseId, "case.comment_added", message, actor, {
      organizationId: input.organizationId || null,
    });
    await recordAudit(tx, "case.comment_added", input.caseId, actor, {
      organizationId: input.organizationId || null,
    });
    await notifyCaseStudent({
      caseId: input.caseId,
      eventKey: `comment:${Date.now()}`,
      copy: CASE_NOTIFICATION_COPY.comment,
      tx,
    });
    return { case: caseItem };
  });
}

export async function requestCaseSupplement(input: {
  caseId: string;
  documentItemIds?: string[];
  note?: string | null;
  organizationId?: string | null;
  actor?: CaseActor;
}): Promise<CaseActionResult> {
  const actor = input.actor || { actorRole: input.organizationId ? "partner" : "admin" };
  return db.$transaction(async (tx) => {
    if (input.organizationId) await assertPartnerCaseScope(input.caseId, input.organizationId, tx);
    const caseItem = await findCaseOrThrow(tx, input.caseId);
    assertOpen(caseItem);

    const documentItemIds = [...new Set(input.documentItemIds || [])].filter(Boolean);
    if (documentItemIds.length > 0) {
      const docs = await tx.documentItem.findMany({
        where: { id: { in: documentItemIds }, studentProfileId: caseItem.studentProfileId },
        select: { id: true },
      });
      if (docs.length !== documentItemIds.length) {
        throw new CasePipelineError("invalid_case_documents", "Documents must belong to the case student", 400);
      }
      for (const documentItemId of documentItemIds) {
        await tx.caseDocumentLink.upsert({
          where: { escalationCaseId_documentItemId: { escalationCaseId: input.caseId, documentItemId } },
          update: { requested: true, purpose: "supplement", note: normalizeNote(input.note, "보완 요청") },
          create: {
            escalationCaseId: input.caseId,
            documentItemId,
            requested: true,
            purpose: "supplement",
            note: normalizeNote(input.note, "보완 요청"),
          },
        });
      }
    }

    const note = normalizeNote(input.note, "추가 서류 보완이 필요합니다.");
    const updated = await tx.escalationCase.update({
      where: { id: input.caseId },
      data: { status: "NEEDS_MORE_DOCUMENTS", riskLevel: caseItem.riskLevel === "LOW" ? "MEDIUM" : caseItem.riskLevel },
    });
    await tx.agentReview.create({
      data: {
        escalationCaseId: input.caseId,
        decision: ReviewStatus.REJECTED,
        note,
      },
    });
    await recordTimeline(tx, input.caseId, "case.documents_requested", note, actor, {
      documentItemIds,
      previousStatus: caseItem.status,
      nextStatus: updated.status,
    });
    await recordAudit(tx, "case.documents_requested", input.caseId, actor, {
      documentItemIds,
      previousStatus: caseItem.status,
      nextStatus: updated.status,
    });
    await notifyCaseStudent({
      caseId: input.caseId,
      eventKey: `supplement:${updated.updatedAt.toISOString()}`,
      copy: CASE_NOTIFICATION_COPY.supplement,
      metadata: { documentItemIds },
      tx,
    });

    return { case: updated };
  });
}

export async function closeCase(input: {
  caseId: string;
  reason?: string | null;
  organizationId?: string | null;
  actor?: CaseActor;
}): Promise<CaseActionResult> {
  const actor = input.actor || { actorRole: input.organizationId ? "partner" : "admin" };
  return db.$transaction(async (tx) => {
    if (input.organizationId) await assertPartnerCaseScope(input.caseId, input.organizationId, tx);
    const caseItem = await findCaseOrThrow(tx, input.caseId);
    assertOpen(caseItem);
    if (!caseItem.acceptedAt && caseItem.status !== "APPROVED") {
      throw new CasePipelineError("case_not_accepted", "Case must be accepted before closure", 409);
    }

    const reason = normalizeNote(input.reason, "케이스 종결");
    const updated = await tx.escalationCase.update({
      where: { id: input.caseId },
      data: { status: "CLOSED", closedAt: new Date(), closedReason: reason },
    });
    await recordTimeline(tx, input.caseId, "case.closed", reason, actor, {
      previousStatus: caseItem.status,
      nextStatus: updated.status,
    });
    await recordAudit(tx, "case.closed", input.caseId, actor, {
      previousStatus: caseItem.status,
      nextStatus: updated.status,
      reason,
    });
    await notifyCaseStudent({ caseId: input.caseId, eventKey: "closed", copy: CASE_NOTIFICATION_COPY.closed, tx });

    return { case: updated };
  });
}
