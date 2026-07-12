import { db } from "@/lib/db";
import { createHighRiskEscalationCase } from "@/lib/cases/repository";
import { sendOpsAlert } from "@/lib/ops/alerts";

export interface HighRiskEscalationSignal {
  studentProfileId?: string | null;
  category: string;
  summary: string;
  conversationSummary?: string | null;
  ruleSnapshot?: unknown;
  aiDraft?: string | null;
  source: "diagnosis" | "agent" | "consult" | "rules";
}

export async function maybeCreateHighRiskEscalationCase(signal: HighRiskEscalationSignal) {
  if (!signal.studentProfileId) return null;

  const existingOpenCase = await db.escalationCase.findFirst({
    where: {
      studentProfileId: signal.studentProfileId,
      status: { in: ["NEW", "NEEDS_MORE_DOCUMENTS", "HIGH_RISK", "APPROVED", "REJECTED"] },
      riskLevel: "HIGH",
      category: signal.category.slice(0, 160),
    },
    orderBy: { createdAt: "desc" },
  });
  if (existingOpenCase) return existingOpenCase;

  const created = await createHighRiskEscalationCase({
    studentProfileId: signal.studentProfileId,
    category: signal.category,
    summary: signal.summary,
    conversationSummary: signal.conversationSummary || null,
    ruleSnapshot: {
      source: signal.source,
      ...(signal.ruleSnapshot && typeof signal.ruleSnapshot === "object" ? (signal.ruleSnapshot as object) : { value: signal.ruleSnapshot }),
    },
    aiDraft: signal.aiDraft || null,
    actor: { actorRole: "system" },
  });

  sendOpsAlert({
    kind: "kaxi_ops_alert",
    source: "kaxi-cases",
    severity: "warning",
    eventType: "high_risk_case_created",
    message: "고위험 에스컬레이션 케이스가 생성되었습니다.",
    occurredAt: new Date().toISOString(),
    details: { caseId: created.case.id, category: created.case.category, source: signal.source },
    adminUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://kaxi.vercel.app"}/admin/cases`,
  }).catch((err) => console.warn("[ops alert] high-risk case", err instanceof Error ? err.message : err));

  return created.case;
}
