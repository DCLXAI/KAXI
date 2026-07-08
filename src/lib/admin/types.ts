export type AdminCaseBucket = "new" | "due_soon" | "high_risk" | "needs_more_documents" | "approved";

export type AdminCaseAction =
  | "approve_send"
  | "request_more_documents"
  | "mark_high_risk"
  | "stop_suspected_fraud"
  | "assign_partner"
  | "accept_case"
  | "add_comment"
  | "request_supplement"
  | "close_case";

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
  organizationId: string | null;
  organizationName: string | null;
  assignedUserId: string | null;
  matchedAt: string | null;
  acceptedAt: string | null;
  closedAt: string | null;
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
  ocrExtractedRedacted: unknown;
  ocrValidation: unknown;
  ocrModel: string | null;
  ocrProcessedAt: string | null;
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

export interface AdminCaseTimelineItem {
  id: string;
  eventType: string;
  message: string | null;
  actorUserId: string | null;
  actorRole: string | null;
  metadata: unknown;
  createdAt: string;
}

export interface AdminCaseDocumentLinkItem {
  id: string;
  documentItemId: string;
  documentType: string;
  purpose: string;
  requested: boolean;
  note: string | null;
  createdAt: string;
}

export interface AdminPartnerOfficeItem {
  id: string;
  name: string;
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
  closedReason: string | null;
  documents: AdminDocumentItem[];
  caseDocumentLinks: AdminCaseDocumentLinkItem[];
  evaluations: AdminComplianceEvaluationItem[];
  reviews: AdminReviewItem[];
  timelineEvents: AdminCaseTimelineItem[];
  auditEvents: AdminAuditItem[];
  partnerOffices: AdminPartnerOfficeItem[];
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
  supersedes: string[];
  supersededBy: string | null;
  chunkCount: number;
  persisted: boolean;
  impact?: AdminKnowledgeImpact;
  diff?: AdminKnowledgeDiff;
}

export interface AdminKnowledgeImpact {
  sourceDocIds: string[];
  ruleCount: number;
  userCount: number;
  rules: Array<{
    id: string;
    ruleId: string;
    code: string;
    version: number;
    reviewStatus: string;
    sourceRefs: string[];
  }>;
  users: Array<{
    chatLogId: string;
    createdAt: string;
    lang: string;
    source: string;
  }>;
}

export interface AdminKnowledgeDiff {
  changed: boolean;
  addedChunks: number;
  removedChunks: number;
  unchangedChunks: number;
  currentChunkCount: number;
  candidateChunkCount: number;
  candidateContentHash: string;
  impact: AdminKnowledgeImpact;
}
