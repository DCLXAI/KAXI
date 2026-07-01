import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminContext, requireAdmin } from "@/lib/api/security";
import { recordRequestAudit } from "@/lib/audit";
import type { AdminCaseAction } from "@/lib/admin/types";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ id: string }>;
};

const ACTIONS = new Set<AdminCaseAction>([
  "approve_send",
  "request_more_documents",
  "mark_high_risk",
  "stop_suspected_fraud",
]);

function actionLabel(action: AdminCaseAction): string {
  return {
    approve_send: "승인 후 학생에게 전송",
    request_more_documents: "반려: 추가서류 요청",
    mark_high_risk: "고위험: 직접 상담 필요",
    stop_suspected_fraud: "허위/위조 의심: 처리 중단",
  }[action];
}

function actionUpdate(action: AdminCaseAction) {
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
    };
    const action = body.action as AdminCaseAction;
    if (!ACTIONS.has(action)) {
      return NextResponse.json({ error: "Invalid case action" }, { status: 400 });
    }

    const existing = await db.escalationCase.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Case not found" }, { status: 404 });

    const note = String(body.note || actionLabel(action)).slice(0, 2000);
    const responseDraft = String(body.responseDraft || existing.aiDraft || "").slice(0, 8000);
    const update = actionUpdate(action);

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
          decision: reviewDecision(action),
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

    return NextResponse.json({ ok: true, case: updated });
  } catch (err) {
    console.error("[POST /api/admin/cases/:id/actions]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
