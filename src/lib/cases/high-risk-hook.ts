import { db } from "@/lib/db";
import { createHighRiskEscalationCase } from "@/lib/cases/repository";

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

  return created.case;
}
