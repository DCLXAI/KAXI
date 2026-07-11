import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminContext, requireAdmin } from "@/lib/api/security";
import { recordRequestAudit } from "@/lib/audit";
import type { AdminCaseAction } from "@/lib/admin/types";
import { CASE_NOTIFICATION_COPY, notifyCaseStudent } from "@/lib/notifications/domain";
import {
  CasePipelineError,
  acceptAssignedCase,
  addCaseComment,
  assignCaseToPartnerOffice,
  closeCase,
  requestCaseSupplement,
} from "@/lib/cases/repository";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ id: string }>;
};

type LegacyCaseAction = Extract<
  AdminCaseAction,
  "approve_send" | "request_more_documents" | "mark_high_risk" | "stop_suspected_fraud"
>;

const ACTIONS = new Set<AdminCaseAction>([
  "approve_send",
  "request_more_documents",
  "mark_high_risk",
  "stop_suspected_fraud",
  "assign_partner",
  "accept_case",
  "add_comment",
  "request_supplement",
  "close_case",
]);

function actionLabel(action: AdminCaseAction): string {
  return {
    approve_send: "승인 후 학생에게 전송",
    request_more_documents: "반려: 추가서류 요청",
    mark_high_risk: "고위험: 직접 상담 필요",
    stop_suspected_fraud: "허위/위조 의심: 처리 중단",
    assign_partner: "파트너 사무소 배정",
    accept_case: "파트너 수임",
    add_comment: "협업 코멘트 추가",
    request_supplement: "보완 요청",
    close_case: "케이스 종결",
  }[action];
}

function actionUpdate(action: LegacyCaseAction) {
  switch (action) {
    case "approve_send":
      return { status: "APPROVED" as const, riskLevel: "LOW" as const, closedAt: new Date() };
    case "request_more_documents":
      return { status: "NEEDS_MORE_DOCUMENTS" as const, riskLevel: "MEDIUM" as const, closedAt: null };
    case "mark_high_risk":
      return { status: "HIGH_RISK" as const, riskLevel: "HIGH" as const, closedAt: null };
    case "stop_suspected_fraud":
      return { status: "STOPPED" as const, riskLevel: "HIGH" as const, closedAt: new Date() };
  }
}

function reviewDecision(action: AdminCaseAction) {
  switch (action) {
    case "approve_send":
      return "APPROVED" as const;
    case "request_more_documents":
      return "REJECTED" as const;
    case "mark_high_risk":
      return "NEEDS_HUMAN_REVIEW" as const;
    case "stop_suspected_fraud":
      return "REJECTED" as const;
    case "assign_partner":
    case "accept_case":
    case "add_comment":
    case "request_supplement":
    case "close_case":
      return "NEEDS_HUMAN_REVIEW" as const;
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const unauthorized = await requireAdmin(req, { roles: ["owner", "admin"] });
    if (unauthorized) return unauthorized;
    const context = await getAdminContext(req);

    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      note?: string;
      responseDraft?: string;
      organizationId?: string;
      assignedUserId?: string;
      documentItemIds?: string[];
    };
    const action = body.action as AdminCaseAction;
    if (!ACTIONS.has(action)) {
      return NextResponse.json({ error: "Invalid case action" }, { status: 400 });
    }

    const existing = await db.escalationCase.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Case not found" }, { status: 404 });

    const note = String(body.note || actionLabel(action)).slice(0, 2000);
    const responseDraft = String(body.responseDraft || existing.aiDraft || "").slice(0, 8000);

    const actor = {
      actorRole: context?.role || "admin",
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null,
      userAgent: req.headers.get("user-agent"),
    };

    if (action === "assign_partner") {
      if (!body.organizationId) return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
      const result = await assignCaseToPartnerOffice({
        caseId: id,
        organizationId: body.organizationId,
        assignedUserId: body.assignedUserId || null,
        note,
        actor,
      });
      await recordRequestAudit(req, {
        actor: context?.actor || "admin",
        actorRole: context?.role || "admin",
        action: "case.assign_partner",
        targetType: "case",
        targetId: id,
        success: true,
        metadata: { label: actionLabel(action), nextStatus: result.case.status, organizationId: body.organizationId },
      });
      return NextResponse.json({ ok: true, case: result.case });
    }

    if (action === "accept_case") {
      if (!body.organizationId) return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
      const result = await acceptAssignedCase({
        caseId: id,
        organizationId: body.organizationId,
        reviewerUserId: body.assignedUserId || existing.assignedUserId || null,
        note,
        actor,
      });
      await recordRequestAudit(req, {
        actor: context?.actor || "admin",
        actorRole: context?.role || "admin",
        action: "case.accept_case",
        targetType: "case",
        targetId: id,
        success: true,
        metadata: { label: actionLabel(action), nextStatus: result.case.status, organizationId: body.organizationId },
      });
      return NextResponse.json({ ok: true, case: result.case });
    }

    if (action === "add_comment") {
      const result = await addCaseComment({
        caseId: id,
        message: note,
        organizationId: body.organizationId || null,
        actor,
      });
      await recordRequestAudit(req, {
        actor: context?.actor || "admin",
        actorRole: context?.role || "admin",
        action: "case.add_comment",
        targetType: "case",
        targetId: id,
        success: true,
        metadata: { label: actionLabel(action), nextStatus: result.case.status },
      });
      return NextResponse.json({ ok: true, case: result.case });
    }

    if (action === "request_supplement") {
      const result = await requestCaseSupplement({
        caseId: id,
        documentItemIds: Array.isArray(body.documentItemIds) ? body.documentItemIds : [],
        note,
        organizationId: body.organizationId || null,
        actor,
      });
      await recordRequestAudit(req, {
        actor: context?.actor || "admin",
        actorRole: context?.role || "admin",
        action: "case.request_supplement",
        targetType: "case",
        targetId: id,
        success: true,
        metadata: { label: actionLabel(action), nextStatus: result.case.status, documentItemIds: body.documentItemIds || [] },
      });
      return NextResponse.json({ ok: true, case: result.case });
    }

    if (action === "close_case") {
      const result = await closeCase({
        caseId: id,
        reason: note,
        organizationId: body.organizationId || null,
        actor,
      });
      await recordRequestAudit(req, {
        actor: context?.actor || "admin",
        actorRole: context?.role || "admin",
        action: "case.close_case",
        targetType: "case",
        targetId: id,
        success: true,
        metadata: { label: actionLabel(action), nextStatus: result.case.status },
      });
      return NextResponse.json({ ok: true, case: result.case });
    }

    const legacyAction = action as LegacyCaseAction;
    const update = actionUpdate(legacyAction);

    const updated = await db.$transaction(async (tx) => {
      const caseItem = await tx.escalationCase.update({
        where: { id },
        data: {
          status: update.status,
          riskLevel: update.riskLevel,
          closedAt: update.closedAt,
          aiDraft: responseDraft || existing.aiDraft,
        },
      });

      await tx.agentReview.create({
        data: {
          escalationCaseId: id,
          decision: reviewDecision(legacyAction),
          note,
          responseDraft: responseDraft || null,
        },
      });

      await tx.auditEvent.create({
        data: {
          actorRole: context?.role || "admin",
          action: `case.${action}`,
          targetType: "case",
          targetId: id,
          caseId: id,
          ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null,
          userAgent: req.headers.get("user-agent"),
          success: true,
          metadata: {
            actor: context?.actor || "admin",
            label: actionLabel(action),
            previousStatus: existing.status,
            nextStatus: update.status,
          },
        },
      });

      return caseItem;
    });

    await recordRequestAudit(req, {
      actor: context?.actor || "admin",
      actorRole: context?.role || "admin",
      action: `case.${action}`,
      targetType: "case",
      targetId: id,
      success: true,
      metadata: { label: actionLabel(action), nextStatus: updated.status },
    });
    const notificationCopy = legacyAction === "request_more_documents"
      ? CASE_NOTIFICATION_COPY.supplement
      : legacyAction === "mark_high_risk"
        ? CASE_NOTIFICATION_COPY.created
        : CASE_NOTIFICATION_COPY.closed;
    await notifyCaseStudent({
      caseId: id,
      eventKey: `admin:${legacyAction}:${updated.updatedAt.toISOString()}`,
      copy: notificationCopy,
      metadata: { action: legacyAction, status: updated.status },
    });

    return NextResponse.json({ ok: true, case: updated });
  } catch (err) {
    if (err instanceof CasePipelineError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("[POST /api/admin/cases/:id/actions]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
