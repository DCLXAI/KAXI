export type AdminCaseBucket = "new" | "due_soon" | "high_risk" | "needs_more_documents" | "approved";

export type AdminCaseAction =
  | "approve_send"
  | "request_more_documents"
  | "mark_high_risk"
  | "stop_suspected_fraud";

export interface AdminCaseListItem {
  id: string;
  status: string;
  riskLevel: string;
  category: string;
  summary: string;
  studentName: string;
  nationality: string;
  visaType: string | null;
  schoolName: string | null;
  programType: string | null;
  updatedAt: string;
  createdAt: string;
  dueAt: string | null;
  missingDocumentCount: number;
  reviewCount: number;
  bucket: AdminCaseBucket;
}

export interface AdminCaseCounts {
  new: number;
  due_soon: number;
  high_risk: number;
  needs_more_documents: number;
  approved: number;
  total: number;
}

export interface AdminDocumentItem {
  id: string;
  documentType: string;
  required: boolean;
  status: string;
  reviewStatus: string;
  reviewNote: string | null;
  expiresAt: string | null;
  file: {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    piiClass: string;
    createdAt: string;
  } | null;
}

export interface AdminComplianceEvaluationItem {
  id: string;
  riskLevel: string;
  evaluatedAt: string;
  ruleCode: string;
  ruleVersion: number;
  ruleReviewStatus: string;
  inputSnapshot: unknown;
  outputSnapshot: unknown;
}

export interface AdminReviewItem {
  id: string;
  decision: string;
  note: string | null;
  responseDraft: string | null;
  reviewedAt: string;
}

export interface AdminAuditItem {
  id: string;
  source: "AuditEvent" | "AdminAuditLog";
  action: string;
  actor: string | null;
  actorRole: string | null;
  targetType: string;
  targetId: string | null;
  caseId: string | null;
  success: boolean;
  metadata: unknown;
  createdAt: string;
}

export interface AdminCaseDetail extends AdminCaseListItem {
  student: {
    profileId: string;
    userId: string;
    email: string | null;
    phone: string | null;
    zaloUid: string | null;
    locale: string;
    topikLevel: number | null;
    semesterStatus: string | null;
    visaExpiryDate: string | null;
  };
  conversationSummary: string | null;
  ruleSnapshot: unknown;
  aiDraft: string | null;
  documents: AdminDocumentItem[];
  evaluations: AdminComplianceEvaluationItem[];
  reviews: AdminReviewItem[];
  auditEvents: AdminAuditItem[];
}

export interface AdminRuleVersionItem {
  id: string;
  version: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  reviewStatus: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  requiredInputs: unknown;
  sourceRefs: unknown;
  fallbackPolicy: string;
  conditionAst: unknown;
  outputAst: unknown;
  testCount: number;
  passedTestCount: number;
}

export interface AdminRuleItem {
  id: string;
  code: string;
  domain: string;
  visaType: string;
  ruleType: string;
  status: string;
  updatedAt: string;
  versions: AdminRuleVersionItem[];
}

export interface AdminKnowledgeItem {
  id: string | null;
  docId: string;
  title: string;
  sourceUrl: string;
  sourceType: string;
  language: string;
  jurisdiction: string;
  topic: string;
  validFrom: string;
  validTo: string | null;
  lastCheckedAt: string;
  checkedBy: string;
  reviewStatus: string;
  supersededBy: string | null;
  chunkCount: number;
  persisted: boolean;
}
