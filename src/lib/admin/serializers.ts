import type { Prisma } from "@prisma/client";
import {
  getRagDocumentMetadata,
  getSourceMetadata,
  KNOWLEDGE_DOCS,
  pickLangText,
} from "@/lib/data/knowledge";
import type {
  AdminAuditItem,
  AdminCaseBucket,
  AdminCaseCounts,
  AdminCaseDetail,
  AdminCaseListItem,
  AdminComplianceEvaluationItem,
  AdminDocumentItem,
  AdminKnowledgeItem,
  AdminReviewItem,
  AdminRuleItem,
} from "./types";

type CaseWithRelations = Prisma.EscalationCaseGetPayload<{
  include: {
    studentProfile: {
      include: {
        user: true;
        documents: { include: { file: true } };
        complianceEvaluations: {
          include: { ruleVersion: { include: { rule: true } } };
        };
      };
    };
    reviews: true;
  };
}>;

type RuleWithRelations = Prisma.ComplianceRuleGetPayload<{
  include: {
    versions: { include: { tests: true } };
  };
}>;

type KnowledgeWithChunks = Prisma.KnowledgeDocumentGetPayload<{
  include: { chunks: true };
}>;

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function parseMetadata(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function getCaseDueAt(caseItem: CaseWithRelations): Date | null {
  const expiries = caseItem.studentProfile.documents
    .map((doc) => doc.expiresAt)
    .filter((value): value is Date => Boolean(value));
  if (expiries.length === 0) return null;
  return expiries.sort((a, b) => a.getTime() - b.getTime())[0];
}

export function getCaseBucket(caseItem: CaseWithRelations, now = new Date()): AdminCaseBucket {
  if (caseItem.status === "APPROVED" || caseItem.status === "CLOSED") return "approved";
  if (caseItem.riskLevel === "HIGH" || caseItem.status === "HIGH_RISK" || caseItem.status === "STOPPED") return "high_risk";
  if (caseItem.status === "NEEDS_MORE_DOCUMENTS") return "needs_more_documents";

  const dueAt = getCaseDueAt(caseItem);
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;
  if (dueAt && dueAt.getTime() - now.getTime() <= fourteenDays) {
    return "due_soon";
  }

  return "new";
}

export function summarizeCaseCounts(cases: CaseWithRelations[]): AdminCaseCounts {
  const counts: AdminCaseCounts = {
    new: 0,
    due_soon: 0,
    high_risk: 0,
    needs_more_documents: 0,
    approved: 0,
    total: cases.length,
  };
  for (const caseItem of cases) counts[getCaseBucket(caseItem)] += 1;
  return counts;
}

export function toAdminCaseListItem(caseItem: CaseWithRelations): AdminCaseListItem {
  const dueAt = getCaseDueAt(caseItem);
  const missingDocumentCount = caseItem.studentProfile.documents.filter((doc) =>
    ["NOT_UPLOADED", "MISSING", "NEEDS_REVIEW", "REJECTED"].includes(doc.status) ||
    ["PENDING", "REJECTED", "NEEDS_HUMAN_REVIEW"].includes(doc.reviewStatus)
  ).length;

  return {
    id: caseItem.id,
    status: caseItem.status,
    riskLevel: caseItem.riskLevel,
    category: caseItem.category,
    summary: caseItem.summary,
    studentName: caseItem.studentProfile.user.email || caseItem.studentProfile.user.phone || caseItem.studentProfile.id,
    nationality: caseItem.studentProfile.nationality,
    visaType: caseItem.studentProfile.visaType,
    schoolName: caseItem.studentProfile.schoolName,
    programType: caseItem.studentProfile.programType,
    updatedAt: caseItem.updatedAt.toISOString(),
    createdAt: caseItem.createdAt.toISOString(),
    dueAt: iso(dueAt),
    missingDocumentCount,
    reviewCount: caseItem.reviews.length,
    bucket: getCaseBucket(caseItem),
  };
}

function toAdminDocumentItem(doc: CaseWithRelations["studentProfile"]["documents"][number]): AdminDocumentItem {
  return {
    id: doc.id,
    documentType: doc.documentType,
    required: doc.required,
    status: doc.status,
    reviewStatus: doc.reviewStatus,
    reviewNote: doc.reviewNote,
    expiresAt: iso(doc.expiresAt),
    file: doc.file
      ? {
          id: doc.file.id,
          originalName: doc.file.originalName,
          mimeType: doc.file.mimeType,
          sizeBytes: doc.file.sizeBytes,
          piiClass: doc.file.piiClass,
          createdAt: doc.file.createdAt.toISOString(),
        }
      : null,
  };
}

function toAdminEvaluationItem(
  evaluation: CaseWithRelations["studentProfile"]["complianceEvaluations"][number]
): AdminComplianceEvaluationItem {
  return {
    id: evaluation.id,
    riskLevel: evaluation.riskLevel,
    evaluatedAt: evaluation.evaluatedAt.toISOString(),
    ruleCode: evaluation.ruleVersion.rule.code,
    ruleVersion: evaluation.ruleVersion.version,
    ruleReviewStatus: evaluation.ruleVersion.reviewStatus,
    inputSnapshot: evaluation.inputSnapshot,
    outputSnapshot: evaluation.outputSnapshot,
  };
}

function toAdminReviewItem(review: CaseWithRelations["reviews"][number]): AdminReviewItem {
  return {
    id: review.id,
    decision: review.decision,
    note: review.note,
    responseDraft: review.responseDraft,
    reviewedAt: review.reviewedAt.toISOString(),
  };
}

export function toAdminCaseDetail(caseItem: CaseWithRelations, auditEvents: AdminAuditItem[]): AdminCaseDetail {
  return {
    ...toAdminCaseListItem(caseItem),
    student: {
      profileId: caseItem.studentProfile.id,
      userId: caseItem.studentProfile.userId,
      email: caseItem.studentProfile.user.email,
      phone: caseItem.studentProfile.user.phone,
      zaloUid: caseItem.studentProfile.user.zaloUid,
      locale: caseItem.studentProfile.user.locale,
      topikLevel: caseItem.studentProfile.topikLevel,
      semesterStatus: caseItem.studentProfile.semesterStatus,
      visaExpiryDate: iso(caseItem.studentProfile.visaExpiryDate),
    },
    conversationSummary: caseItem.conversationSummary,
    ruleSnapshot: caseItem.ruleSnapshot,
    aiDraft: caseItem.aiDraft,
    documents: caseItem.studentProfile.documents
      .map(toAdminDocumentItem)
      .sort((a, b) => a.documentType.localeCompare(b.documentType)),
    evaluations: caseItem.studentProfile.complianceEvaluations
      .map(toAdminEvaluationItem)
      .sort((a, b) => b.evaluatedAt.localeCompare(a.evaluatedAt)),
    reviews: caseItem.reviews.map(toAdminReviewItem).sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt)),
    auditEvents,
  };
}

export function toAdminRuleItem(rule: RuleWithRelations): AdminRuleItem {
  return {
    id: rule.id,
    code: rule.code,
    domain: rule.domain,
    visaType: rule.visaType,
    ruleType: rule.ruleType,
    status: rule.status,
    updatedAt: rule.updatedAt.toISOString(),
    versions: rule.versions
      .map((version) => ({
        id: version.id,
        version: version.version,
        effectiveFrom: version.effectiveFrom.toISOString(),
        effectiveTo: iso(version.effectiveTo),
        reviewStatus: version.reviewStatus,
        reviewedBy: version.reviewedBy,
        reviewedAt: iso(version.reviewedAt),
        requiredInputs: version.requiredInputs,
        sourceRefs: version.sourceRefs,
        fallbackPolicy: version.fallbackPolicy,
        conditionAst: version.conditionAst,
        outputAst: version.outputAst,
        testCount: version.tests.length,
        passedTestCount: version.tests.filter((test) => test.passed).length,
      }))
      .sort((a, b) => b.version - a.version),
  };
}

export function toAuditEventItem(event: Prisma.AuditEventGetPayload<object>): AdminAuditItem {
  return {
    id: event.id,
    source: "AuditEvent",
    action: event.action,
    actor: event.actorUserId,
    actorRole: event.actorRole,
    targetType: event.targetType,
    targetId: event.targetId,
    caseId: event.caseId,
    success: event.success,
    metadata: event.metadata,
    createdAt: event.createdAt.toISOString(),
  };
}

export function toAdminAuditLogItem(event: Prisma.AdminAuditLogGetPayload<object>): AdminAuditItem {
  return {
    id: event.id,
    source: "AdminAuditLog",
    action: event.action,
    actor: event.actor,
    actorRole: event.actorRole,
    targetType: event.targetType,
    targetId: event.targetId,
    caseId: event.targetType === "case" ? event.targetId : null,
    success: event.success,
    metadata: parseMetadata(event.metadata),
    createdAt: event.createdAt.toISOString(),
  };
}

export function toAdminKnowledgeItem(document: KnowledgeWithChunks): AdminKnowledgeItem {
  return {
    id: document.id,
    docId: document.docId,
    title: document.title,
    sourceUrl: document.sourceUrl,
    sourceType: document.sourceType,
    language: document.language,
    jurisdiction: document.jurisdiction,
    topic: document.topic,
    validFrom: document.validFrom.toISOString(),
    validTo: iso(document.validTo),
    lastCheckedAt: document.lastCheckedAt.toISOString(),
    checkedBy: document.checkedBy,
    reviewStatus: document.reviewStatus,
    supersedes: stringArray(document.supersedes),
    supersededBy: document.supersededBy,
    chunkCount: document.chunks.length,
    persisted: true,
  };
}

export function staticKnowledgeItems(): AdminKnowledgeItem[] {
  return KNOWLEDGE_DOCS.map((doc) => {
    const ragMeta = getRagDocumentMetadata(doc, "ko");
    const sourceMeta = getSourceMetadata(doc.source);
    return {
      id: null,
      docId: doc.id,
      title: pickLangText(doc.title, "ko"),
      sourceUrl: ragMeta.source_url,
      sourceType: ragMeta.source_type,
      language: "ko",
      jurisdiction: ragMeta.jurisdiction,
      topic: doc.category,
      validFrom: ragMeta.valid_from,
      validTo: ragMeta.valid_to,
      lastCheckedAt: ragMeta.last_checked_at,
      checkedBy: ragMeta.checked_by,
      reviewStatus: sourceMeta.reviewStatus || "approved",
      supersedes: ragMeta.supersedes,
      supersededBy: ragMeta.superseded_by,
      chunkCount: 0,
      persisted: false,
    };
  });
}
