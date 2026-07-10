import { DocumentStatus, Prisma, ReviewStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { generateLlmJson, getConfiguredLlmBackend, isLlmNotConfiguredError } from "@/lib/ai/llm-gateway";
import { searchPgvectorKnowledge, type PgvectorSearchResult } from "@/lib/embeddings/pgvector-rag";
import { isOfficialKnowledgeSource } from "@/lib/knowledge/official-source";

export type DocumentVerificationLayer = "rule" | "rag" | "cross_document";
export type DocumentVerificationSeverity = "none" | "minor" | "major" | "critical";
export type DocumentVerificationStatus = "pass" | "warning" | "fail" | "skipped";

export interface DocumentVerificationIssue {
  code: string;
  layer: DocumentVerificationLayer;
  severity: Exclude<DocumentVerificationSeverity, "none">;
  message: string;
  sourceRefs: string[];
  evidence?: Record<string, unknown>;
}

export interface DocumentVerificationSource {
  docId: string;
  title: string;
  sourceUrl: string;
  sourceType: string | null;
  jurisdiction: string | null;
  validFrom: string | null;
  validTo: string | null;
  lastCheckedAt: string | null;
  reviewStatus: string | null;
  owner: string | null;
  acceptedBy: Array<"vector" | "keyword">;
  thresholds: {
    minVectorScore: number;
    minKeywordScore: number;
  };
  chunkId: string;
  score?: number;
  vectorScore?: number;
  keywordScore?: number;
}

export type DocumentVerificationLlmStatus = "not_requested" | "passed" | "issues" | "unconfigured" | "failed";

export interface DocumentVerificationBasis {
  notice: string;
  acceptedSourceCount: number;
  officialSourceCount: number;
  latestCheckedAt: string | null;
  sourceLabels: string[];
  requirementLastCheckedAt: string | null;
}

export interface DocumentVerificationLayerDetails {
  rag?: {
    query: string | null;
    queryCharCount: number;
    minVectorScore: number;
    minKeywordScore: number;
    retrievedCount: number;
    acceptedSourceCount: number;
    officialSourceCount: number;
    topResults: Array<{
      docId: string;
      score: number;
      vectorScore: number;
      keywordScore: number;
      accepted: boolean;
      acceptedBy: Array<"vector" | "keyword">;
    }>;
    llm: {
      enabled: boolean;
      status: DocumentVerificationLlmStatus;
      provider: "kimi" | "claude" | null;
      issueCount: number;
      errorCode?: string;
    };
  };
}

export interface DocumentVerificationResult {
  ok: boolean;
  status: DocumentVerificationStatus;
  severity: DocumentVerificationSeverity;
  documentItemId: string;
  documentType: string;
  visaType: string;
  stayAction: string;
  applicantContext: string;
  requirementCode: string | null;
  requirementReviewStatus: string | null;
  requirementLastCheckedAt: string | null;
  requirementSourceRefs: string[];
  layers: Record<DocumentVerificationLayer, DocumentVerificationStatus>;
  issues: DocumentVerificationIssue[];
  sources: DocumentVerificationSource[];
  basis: DocumentVerificationBasis;
  layerDetails: DocumentVerificationLayerDetails;
  checkedAt: string;
  requiresHumanReview: boolean;
}

export interface VerifyDocumentOptions {
  visaType?: string;
  stayAction?: string;
  applicantContext?: string;
  enableRag?: boolean;
  enableLlm?: boolean;
  minRagVectorScore?: number;
  minRagKeywordScore?: number;
  persist?: boolean;
  now?: Date;
}

export interface VerifyDocumentSetOptions extends VerifyDocumentOptions {
  studentProfileId?: string;
  caseId?: string;
  createMissingPlaceholders?: boolean;
}

export interface MissingDocumentRequirement {
  requirementCode: string;
  documentType: string;
  labelKo: string;
  labelEn: string;
  reviewStatus: string;
  sourceRefs: string[];
  createdDocumentItemId: string | null;
  issue: DocumentVerificationIssue;
}

export interface DocumentSetVerificationResult {
  ok: boolean;
  status: DocumentVerificationStatus;
  severity: DocumentVerificationSeverity;
  studentProfileId: string;
  caseId: string | null;
  visaType: string;
  stayAction: string;
  applicantContext: string;
  checkedAt: string;
  summary: {
    requiredDocuments: number;
    missingRequiredDocuments: number;
    duplicateDocumentTypes: number;
    duplicateDocumentItems: number;
    verifiedDocuments: number;
    passedDocuments: number;
    warningDocuments: number;
    failedDocuments: number;
    requiresHumanReviewDocuments: number;
  };
  setIssues: DocumentVerificationIssue[];
  missingRequirements: MissingDocumentRequirement[];
  documents: DocumentVerificationResult[];
}

type DocumentItemForVerification = Prisma.DocumentItemGetPayload<{
  include: {
    studentProfile: {
      include: {
        documents: true;
      };
    };
    file: true;
  };
}>;

type VisaDocumentRequirementForVerification = Prisma.VisaDocumentRequirementGetPayload<Record<string, never>>;

const SEVERITY_RANK: Record<DocumentVerificationSeverity, number> = {
  none: 0,
  minor: 1,
  major: 2,
  critical: 3,
};

const DEFAULT_MIN_RAG_VECTOR_SCORE = 0.8;
const DEFAULT_MIN_RAG_KEYWORD_SCORE = 0;
const RAG_QUERY_MAX_CHARS = 2400;
const RAG_EXTRACTION_QUERY_MAX_CHARS = 900;
const NON_PRESENT_DOCUMENT_STATUSES = new Set<DocumentStatus>([
  DocumentStatus.NOT_UPLOADED,
  DocumentStatus.MISSING,
  DocumentStatus.EXPIRED,
  DocumentStatus.REJECTED,
]);
const OCR_NOT_READY_DOCUMENT_STATUSES = new Set<DocumentStatus>([
  DocumentStatus.UPLOADED,
  DocumentStatus.OCR_PROCESSING,
]);
const SENSITIVE_RAG_QUERY_VALUE_KEY_RE =
  /(passport|alien|registration|resident|rrn|phone|email|address|birth|name|holder|employee|sponsor|occupant|account|balance|wage|salary|amount|paid|businessnumber|business_no|businessno|number|_no|no$|date$|issuedate|documentdate|expirationdate|expirydate)/i;

const FIELD_PATHS: Record<string, string[]> = {
  passport_no: ["passport.passportNumber", "common.passportNumber"],
  full_name: ["passport.fullName", "common.holderName", "common.fullName"],
  birth_date: ["passport.birthDate", "common.birthDate", "common.dateOfBirth", "application.birthDate", "application.dateOfBirth"],
  expiry_date: ["passport.expirationDate", "common.expirationDate"],
  expiration_date: ["passport.expirationDate", "common.expirationDate"],
  holder_name: ["financialProof.holderName", "common.holderName"],
  balance: ["financialProof.balanceAmount"],
  currency: ["financialProof.currency"],
  issue_date: ["financialProof.issueDate", "common.documentDate"],
  document_date: ["common.documentDate", "financialProof.issueDate"],
  employee_name: ["employmentContract.employeeName", "common.employeeName", "common.holderName"],
  employer_name: ["employmentContract.employerName", "common.employerName", "businessRegistration.companyName"],
  company_name: ["businessRegistration.companyName", "common.companyName", "common.employerName"],
  business_no: ["businessRegistration.businessNumber", "common.businessNumber"],
  industry_code: ["businessRegistration.industryCode", "businessRegistration.industry", "common.industryCode", "common.industry"],
  business_type: ["businessRegistration.businessType", "common.businessType"],
  business_items: ["businessRegistration.businessItems", "common.businessItems"],
  job_title: ["jobDescription.jobTitle", "employmentContract.jobTitle", "common.jobTitle"],
  duties: ["jobDescription.duties", "employmentContract.duties", "common.duties"],
  required_qualification: ["jobDescription.requiredQualification", "common.requiredQualification"],
  occupation_code: ["jobDescription.occupationCode", "common.occupationCode", "common.visaOccupationCode"],
  visa_occupation: ["jobDescription.visaOccupation", "common.visaOccupation", "common.occupation"],
  wage: ["employmentContract.wage", "common.wage"],
  student_name: ["common.holderName", "passport.fullName"],
  applicant_name: ["common.holderName", "passport.fullName"],
  sponsor_name: ["common.sponsorName"],
  relationship: ["common.relationship"],
  school_name: [
    "common.schoolName",
    "common.instituteName",
    "standardAdmissionLetter.schoolName",
    "admissionLetter.schoolName",
    "admissionLetter.instituteName",
    "educationCertificate.schoolName",
    "transcript.schoolName",
    "enrollmentCertificate.schoolName",
  ],
  institute_name: [
    "common.schoolName",
    "common.instituteName",
    "admissionLetter.instituteName",
    "admissionLetter.schoolName",
    "standardAdmissionLetter.schoolName",
    "enrollmentCertificate.schoolName",
  ],
  program: ["common.program"],
  admission_period: ["common.admissionPeriod"],
  graduation_date: ["common.graduationDate"],
  grades: ["common.grades"],
  test_name: ["common.testName"],
  score_or_level: ["common.scoreOrLevel"],
  test_date: ["common.testDate", "common.documentDate"],
  alien_registration_no: ["common.alienRegistrationNo"],
  current_status: ["common.currentStatus", "common.currentVisaType", "application.currentStatus", "application.currentVisaType"],
  requested_status: [
    "common.requestedStatus",
    "common.requestedVisaType",
    "application.requestedStatus",
    "application.requestedVisaType",
    "visa.visaType",
    "common.visaType",
  ],
  visa_type: [
    "common.requestedVisaType",
    "common.requestedStatus",
    "application.requestedVisaType",
    "application.requestedStatus",
    "visa.visaType",
    "common.visaType",
    "common.stayVisaType",
  ],
  stay_action: ["common.stayAction", "application.stayAction", "application.action", "common.action"],
  enrollment_status: ["common.enrollmentStatus"],
  semester: ["common.semester"],
  academic_status: ["common.academicStatus"],
  attendance_rate: ["common.attendanceRate"],
  period: ["common.period"],
  training_period: ["common.trainingPeriod"],
  training_goal: ["common.trainingGoal"],
  training_schedule: ["common.trainingSchedule"],
  paid_amount: ["common.paidAmount"],
  covered_period: ["common.coveredPeriod"],
  address: ["common.address"],
  occupant_name: ["common.occupantName", "common.holderName"],
  result: ["common.result"],
  exam_date: ["common.examDate", "common.documentDate"],
  photo_standard: ["common.photoStandard"],
};

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function parseNumericValue(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return null;
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function getPath(record: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, record);
}

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function hasMeaningfulExtraction(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.some(hasMeaningfulExtraction);
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).some(hasMeaningfulExtraction);
  return false;
}

function fieldValue(extraction: Record<string, unknown>, key: string): unknown {
  const paths = FIELD_PATHS[key] || [`common.${key}`, key];
  for (const path of paths) {
    const value = getPath(extraction, path);
    if (hasValue(value)) return value;
  }
  return undefined;
}

function maxSeverity(issues: DocumentVerificationIssue[]): DocumentVerificationSeverity {
  return issues.reduce<DocumentVerificationSeverity>(
    (current, issue) => (SEVERITY_RANK[issue.severity] > SEVERITY_RANK[current] ? issue.severity : current),
    "none"
  );
}

function statusFromSeverity(severity: DocumentVerificationSeverity): DocumentVerificationStatus {
  if (severity === "none") return "pass";
  if (severity === "critical") return "fail";
  return "warning";
}

function issue(input: {
  code: string;
  layer: DocumentVerificationLayer;
  severity: Exclude<DocumentVerificationSeverity, "none">;
  message: string;
  sourceRefs?: string[];
  evidence?: Record<string, unknown>;
}): DocumentVerificationIssue {
  return {
    code: input.code,
    layer: input.layer,
    severity: input.severity,
    message: input.message,
    sourceRefs: input.sourceRefs || [],
    evidence: input.evidence,
  };
}

function numericEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function ragThresholds(options: VerifyDocumentOptions) {
  return {
    minVectorScore: options.minRagVectorScore ?? numericEnv("DOCUMENT_RAG_MIN_VECTOR_SCORE", DEFAULT_MIN_RAG_VECTOR_SCORE),
    minKeywordScore: options.minRagKeywordScore ?? numericEnv("DOCUMENT_RAG_MIN_KEYWORD_SCORE", DEFAULT_MIN_RAG_KEYWORD_SCORE),
  };
}

function requirementRank(row: VisaDocumentRequirementForVerification, applicantContext: string): number {
  const reviewRank = row.reviewStatus === "APPROVED" ? 0 : 10;
  const contextRank = row.applicantContext === applicantContext ? 0 : 1;
  return reviewRank + contextRank;
}

async function findRequirement(input: {
  visaType: string;
  stayAction: string;
  applicantContext: string;
  documentType: string;
}): Promise<VisaDocumentRequirementForVerification | null> {
  const candidates = await db.visaDocumentRequirement.findMany({
    where: {
      visaType: input.visaType,
      stayAction: input.stayAction,
      documentType: input.documentType,
      applicantContext: { in: [input.applicantContext, "general"] },
      reviewStatus: { in: ["APPROVED", "PENDING"] },
    },
    orderBy: [
      { lastCheckedAt: "desc" },
    ],
  });
  return candidates
    .sort((a, b) => {
      const rank = requirementRank(a, input.applicantContext) - requirementRank(b, input.applicantContext);
      if (rank !== 0) return rank;
      return b.lastCheckedAt.getTime() - a.lastCheckedAt.getTime();
    })[0] || null;
}

function evaluateRuleLayer(input: {
  item: DocumentItemForVerification;
  requirement: VisaDocumentRequirementForVerification | null;
  extraction: Record<string, unknown>;
  now: Date;
}): { status: DocumentVerificationStatus; issues: DocumentVerificationIssue[] } {
  const { item, requirement, extraction, now } = input;
  const sourceRefs = asStringArray(requirement?.sourceRefs);
  const issues: DocumentVerificationIssue[] = [];

  if (!requirement) {
    issues.push(issue({
      code: "requirement_missing",
      layer: "rule",
      severity: "critical",
      message: "No visa document requirement row exists for this visa/action/document combination.",
    }));
    return { status: "fail", issues };
  }

  if (requirement.reviewStatus !== "APPROVED") {
    issues.push(issue({
      code: "requirement_not_approved",
      layer: "rule",
      severity: "minor",
      message: "The matching document requirement is not legally approved yet.",
      sourceRefs,
      evidence: { requirementCode: requirement.code, reviewStatus: requirement.reviewStatus },
    }));
  }

  const rules = asStringArray(requirement.validationRules);
  const requiredKeys = new Set(requiredFieldKeys(requirement.requiredFields));
  for (const rule of rules) {
    if (rule === "required_document_present") {
      const missing = !item.fileId || NON_PRESENT_DOCUMENT_STATUSES.has(item.status);
      if (missing && requirement.required) {
        issues.push(issue({
          code: "required_document_missing",
          layer: "rule",
          severity: "critical",
          message: "Required document file is missing or rejected.",
          sourceRefs,
          evidence: { status: item.status, fileId: item.fileId },
        }));
      }
      continue;
    }

    if (rule === "issuer_present") {
      if (!requirement.issuer.trim()) {
        issues.push(issue({
          code: "issuer_policy_missing",
          layer: "rule",
          severity: "major",
          message: "Requirement row does not define the expected issuing authority.",
          sourceRefs,
        }));
      }
      continue;
    }

    const fieldMatch = /^field:([^:]+):present$/.exec(rule);
    if (fieldMatch) {
      const key = fieldMatch[1];
      if (!hasValue(fieldValue(extraction, key))) {
        issues.push(issue({
          code: `field_missing:${key}`,
          layer: "rule",
          severity: "major",
          message: `Required field is missing from OCR extraction: ${key}`,
          sourceRefs,
          evidence: { field: key },
        }));
      }
      continue;
    }

    const numericPositiveMatch = /^numeric_positive:([^:]+)$/.exec(rule);
    if (numericPositiveMatch) {
      const key = numericPositiveMatch[1];
      const rawValue = fieldValue(extraction, key);
      if (!hasValue(rawValue)) continue;

      const parsed = parseNumericValue(rawValue);
      if (parsed === null || parsed <= 0) {
        issues.push(issue({
          code: `field_invalid_numeric_positive:${key}`,
          layer: "rule",
          severity: "major",
          message: `OCR field must be a positive numeric value: ${key}`,
          sourceRefs,
          evidence: {
            field: key,
            value: typeof rawValue === "string" || typeof rawValue === "number" ? rawValue : "[unsupported]",
          },
        }));
      }
      continue;
    }

    const numericRangeMatch = /^numeric_range:([^:]+):(-?\d+(?:\.\d+)?):(-?\d+(?:\.\d+)?)$/.exec(rule);
    if (numericRangeMatch) {
      const [, key, minRaw, maxRaw] = numericRangeMatch;
      const rawValue = fieldValue(extraction, key);
      if (!hasValue(rawValue)) continue;

      const min = Number(minRaw);
      const max = Number(maxRaw);
      const parsed = parseNumericValue(rawValue);
      if (parsed === null || parsed < min || parsed > max) {
        issues.push(issue({
          code: `field_invalid_numeric_range:${key}`,
          layer: "rule",
          severity: "major",
          message: `OCR field must be a numeric value between ${min} and ${max}: ${key}`,
          sourceRefs,
          evidence: {
            field: key,
            min,
            max,
            value: typeof rawValue === "string" || typeof rawValue === "number" ? rawValue : "[unsupported]",
          },
        }));
      }
      continue;
    }

    const issueDateMatch = /^issue_date_within:(\d+):days$/.exec(rule);
    if (issueDateMatch) {
      const maxDays = Number(issueDateMatch[1]);
      const issuedAt = parseDate(fieldValue(extraction, "issue_date") || fieldValue(extraction, "document_date"));
      const today = startOfUtcDay(now);
      if (!issuedAt) {
        issues.push(issue({
          code: "issue_date_missing",
          layer: "rule",
          severity: "major",
          message: "Issue date is required to validate document freshness.",
          sourceRefs,
          evidence: { maxDays },
        }));
      } else {
        const issuedDay = startOfUtcDay(issuedAt);
        if (issuedDay.getTime() > today.getTime()) {
          issues.push(issue({
            code: "document_issue_date_in_future",
            layer: "rule",
            severity: "major",
            message: "Document issue date is in the future.",
            sourceRefs,
            evidence: { issueDate: issuedDay.toISOString().slice(0, 10), maxDays },
          }));
          continue;
        }
        const ageDays = Math.floor((today.getTime() - issuedDay.getTime()) / (24 * 60 * 60 * 1000));
        if (ageDays > maxDays) {
          issues.push(issue({
            code: "document_stale",
            layer: "rule",
            severity: "critical",
            message: `Document issue date is older than ${maxDays} days.`,
            sourceRefs,
            evidence: { issueDate: issuedAt.toISOString().slice(0, 10), ageDays, maxDays },
          }));
        }
      }
    }
  }

  if (requiredKeys.has("expiry_date") || requiredKeys.has("expiration_date")) {
    const expiresAt = parseDate(fieldValue(extraction, "expiry_date") || fieldValue(extraction, "expiration_date"));
    if (expiresAt) {
      const expiresDay = startOfUtcDay(expiresAt);
      const today = startOfUtcDay(now);
      if (expiresDay.getTime() < today.getTime()) {
        issues.push(issue({
          code: "document_expired",
          layer: "rule",
          severity: "critical",
          message: "Document expiration date has already passed.",
          sourceRefs,
          evidence: { expirationDate: expiresDay.toISOString().slice(0, 10) },
        }));
      }
    }
  }

  const hasPresentFile = Boolean(item.fileId) && !NON_PRESENT_DOCUMENT_STATUSES.has(item.status);
  if (hasPresentFile && !hasMeaningfulExtraction(extraction)) {
    issues.push(issue({
      code: "ocr_extraction_missing",
      layer: "rule",
      severity: "major",
      message: "Document file is present but no OCR extraction is available for deterministic validation.",
      sourceRefs,
      evidence: { status: item.status, fileId: item.fileId },
    }));
  } else if (hasPresentFile && OCR_NOT_READY_DOCUMENT_STATUSES.has(item.status)) {
    issues.push(issue({
      code: "ocr_status_not_ready",
      layer: "rule",
      severity: "major",
      message: "Document OCR status is not complete; deterministic validation should wait for OCR_DONE or human review.",
      sourceRefs,
      evidence: { status: item.status },
    }));
  }

  return { status: statusFromSeverity(maxSeverity(issues)), issues };
}

function dateOnly(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function sourceLabel(source: Pick<DocumentVerificationSource, "sourceUrl" | "title">): string {
  if (source.sourceUrl.includes("law.go.kr")) return "국가법령정보센터";
  if (source.sourceUrl.includes("hikorea.go.kr")) return "하이코리아";
  if (source.sourceUrl.includes("studyinkorea")) return "Study in Korea";
  if (source.sourceUrl.includes("visa.go.kr")) return "비자포털";
  return source.title || source.sourceUrl;
}

function acceptedBy(input: {
  result: PgvectorSearchResult;
  minVectorScore: number;
  minKeywordScore: number;
}): Array<"vector" | "keyword"> {
  const accepted: Array<"vector" | "keyword"> = [];
  if (input.result.vectorScore >= input.minVectorScore) accepted.push("vector");
  if (input.result.keywordScore > input.minKeywordScore) accepted.push("keyword");
  return accepted;
}

function sourceFromSearch(
  result: PgvectorSearchResult,
  thresholds: { minVectorScore: number; minKeywordScore: number }
): DocumentVerificationSource {
  const meta = result.doc.ragMeta;
  const accepted = acceptedBy({
    result,
    minVectorScore: thresholds.minVectorScore,
    minKeywordScore: thresholds.minKeywordScore,
  });
  return {
    docId: meta?.doc_id || result.doc.id,
    title: meta?.title || result.doc.title.ko,
    sourceUrl: meta?.source_url || result.doc.source,
    sourceType: meta?.source_type || null,
    jurisdiction: meta?.jurisdiction || null,
    validFrom: meta?.valid_from || null,
    validTo: meta?.valid_to || null,
    lastCheckedAt: meta?.last_checked_at || null,
    reviewStatus: meta?.review_status || null,
    owner: meta?.owner || null,
    acceptedBy: accepted,
    thresholds,
    chunkId: result.chunkId,
    score: result.score,
    vectorScore: result.vectorScore,
    keywordScore: result.keywordScore,
  };
}

function latestDateOnly(values: Array<string | null | undefined>): string | null {
  const dates = values
    .map((value) => (value ? new Date(value) : null))
    .filter((value): value is Date => value instanceof Date && Number.isFinite(value.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());
  return dateOnly(dates[0]);
}

function isOfficialVerificationSource(source: DocumentVerificationSource): boolean {
  return isOfficialKnowledgeSource({
    sourceType: source.sourceType,
    sourceUrl: source.sourceUrl,
    owner: source.owner,
  });
}

function verificationBasis(input: {
  requirement: VisaDocumentRequirementForVerification | null;
  sources: DocumentVerificationSource[];
}): DocumentVerificationBasis {
  const requirementLastCheckedAt = dateOnly(input.requirement?.lastCheckedAt);
  const officialSources = input.sources.filter(isOfficialVerificationSource);
  const sourceLabels = Array.from(new Set(officialSources.map(sourceLabel))).slice(0, 6);
  const latestCheckedAt = latestDateOnly([
    requirementLastCheckedAt,
    ...officialSources.map((source) => source.lastCheckedAt),
  ]);
  const sourceText = sourceLabels.length > 0 ? sourceLabels.join(" / ") : "기준치 이상으로 채택된 공식 RAG 출처 없음";
  const dateText = latestCheckedAt || requirementLastCheckedAt || "확인일 미상";
  const notice = officialSources.length > 0
    ? `이 서류 검증은 ${dateText}에 확인된 공식 출처(${sourceText}) 및 KAXI 서류 매트릭스 기준입니다. 실제 접수 판단은 관할 출입국 또는 자격 있는 행정사 검토가 필요합니다.`
    : `이 서류 검증은 KAXI 서류 매트릭스 기준이며, 기준치 이상으로 채택된 공식 RAG 출처가 없습니다. 접수 전 관할 출입국 또는 자격 있는 행정사 검토가 필요합니다.`;

  return {
    notice,
    acceptedSourceCount: input.sources.length,
    officialSourceCount: officialSources.length,
    latestCheckedAt,
    sourceLabels,
    requirementLastCheckedAt,
  };
}

function compactText(value: string, maxChars = 160): string {
  return value.replace(/\s+/g, " ").trim().slice(0, maxChars).trim();
}

function pushUnique(target: string[], value: unknown, maxChars?: number) {
  if (value === null || value === undefined) return;
  const text = compactText(String(value), maxChars);
  if (text.length < 2) return;
  if (!target.includes(text)) target.push(text);
}

function requiredFieldsText(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const fragments: string[] = [];
  for (const field of value) {
    if (!field || typeof field !== "object") continue;
    const record = field as Record<string, unknown>;
    pushUnique(fragments, record.key);
    pushUnique(fragments, record.labelKo);
    pushUnique(fragments, record.labelEn);
  }
  return fragments;
}

function requiredFieldKeys(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((field) => asRecord(field).key)
    .filter((key): key is string => typeof key === "string" && key.trim().length > 0);
}

function collectExtractionQueryFragments(value: unknown, parentKey = "", depth = 0): string[] {
  if (depth > 5 || value === null || value === undefined) return [];

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    if (SENSITIVE_RAG_QUERY_VALUE_KEY_RE.test(parentKey)) return [];
    const text = compactText(String(value), 180);
    return text.length >= 2 ? [text] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectExtractionQueryFragments(item, parentKey, depth + 1));
  }

  if (typeof value !== "object") return [];

  const fragments: string[] = [];
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const path = parentKey ? `${parentKey}.${key}` : key;
    if (!SENSITIVE_RAG_QUERY_VALUE_KEY_RE.test(path)) {
      pushUnique(fragments, key.replace(/[_-]+/g, " "), 80);
    }
    for (const fragment of collectExtractionQueryFragments(nested, path, depth + 1)) {
      pushUnique(fragments, fragment);
    }
  }
  return fragments;
}

function extractionTextForRag(extraction: Record<string, unknown>): string {
  return collectExtractionQueryFragments(extraction)
    .join(" ")
    .slice(0, RAG_EXTRACTION_QUERY_MAX_CHARS)
    .trim();
}

export function sanitizeExtractionForRagJudgment(value: unknown, parentKey = "", depth = 0): unknown {
  if (depth > 8) return "[truncated]";
  if (value === null || value === undefined) return value;

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    if (SENSITIVE_RAG_QUERY_VALUE_KEY_RE.test(parentKey)) return "[redacted]";
    return typeof value === "string" ? compactText(value, 500) : value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeExtractionForRagJudgment(item, parentKey, depth + 1));
  }

  if (typeof value !== "object") return "[unsupported]";

  const sanitized: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const path = parentKey ? `${parentKey}.${key}` : key;
    sanitized[key] = sanitizeExtractionForRagJudgment(nested, path, depth + 1);
  }
  return sanitized;
}

function buildRagVerificationQuery(input: {
  requirement: VisaDocumentRequirementForVerification;
  extraction: Record<string, unknown>;
  visaType: string;
  stayAction: string;
}): string {
  const fragments: string[] = [];
  pushUnique(fragments, input.visaType);
  pushUnique(fragments, input.stayAction);
  pushUnique(fragments, input.requirement.documentType);
  pushUnique(fragments, input.requirement.labelKo);
  pushUnique(fragments, input.requirement.labelEn);
  pushUnique(fragments, input.requirement.issuer);
  for (const sourceRef of asStringArray(input.requirement.sourceRefs)) pushUnique(fragments, sourceRef);
  for (const field of requiredFieldsText(input.requirement.requiredFields)) pushUnique(fragments, field);
  for (const rule of asStringArray(input.requirement.validationRules)) pushUnique(fragments, rule);
  pushUnique(fragments, extractionTextForRag(input.extraction), RAG_EXTRACTION_QUERY_MAX_CHARS);
  return fragments.join(" ").slice(0, RAG_QUERY_MAX_CHARS).trim();
}

async function evaluateRagLayer(input: {
  requirement: VisaDocumentRequirementForVerification | null;
  extraction: Record<string, unknown>;
  visaType: string;
  stayAction: string;
  enableLlm: boolean;
  minVectorScore: number;
  minKeywordScore: number;
}): Promise<{
  status: DocumentVerificationStatus;
  issues: DocumentVerificationIssue[];
  sources: DocumentVerificationSource[];
  details: NonNullable<DocumentVerificationLayerDetails["rag"]>;
}> {
  const details: NonNullable<DocumentVerificationLayerDetails["rag"]> = {
    query: null,
    queryCharCount: 0,
    minVectorScore: input.minVectorScore,
    minKeywordScore: input.minKeywordScore,
    retrievedCount: 0,
    acceptedSourceCount: 0,
    officialSourceCount: 0,
    topResults: [],
    llm: {
      enabled: input.enableLlm,
      status: input.enableLlm ? "failed" : "not_requested",
      provider: input.enableLlm ? getConfiguredLlmBackend() : null,
      issueCount: 0,
    },
  };

  if (!input.requirement) {
    details.llm.status = input.enableLlm ? "not_requested" : "not_requested";
    return { status: "skipped", issues: [], sources: [], details };
  }
  const query = buildRagVerificationQuery({
    requirement: input.requirement,
    extraction: input.extraction,
    visaType: input.visaType,
    stayAction: input.stayAction,
  });
  details.query = query;
  details.queryCharCount = query.length;

  try {
    const results = await searchPgvectorKnowledge(query, { topK: 5, languages: ["ko"] });
    const strongResults = results.filter((result) =>
      result.vectorScore >= input.minVectorScore || result.keywordScore > input.minKeywordScore
    );
    const sources = strongResults.map((result) => sourceFromSearch(result, {
      minVectorScore: input.minVectorScore,
      minKeywordScore: input.minKeywordScore,
    }));
    details.retrievedCount = results.length;
    details.acceptedSourceCount = sources.length;
    details.officialSourceCount = sources.filter(isOfficialVerificationSource).length;
    details.topResults = results.slice(0, 5).map((result) => {
      const docId = result.doc.ragMeta?.doc_id || result.doc.id;
      return {
        docId,
        score: result.score,
        vectorScore: result.vectorScore,
        keywordScore: result.keywordScore,
        accepted: strongResults.some((strong) => (strong.doc.ragMeta?.doc_id || strong.doc.id) === docId),
        acceptedBy: acceptedBy({
          result,
          minVectorScore: input.minVectorScore,
          minKeywordScore: input.minKeywordScore,
        }),
      };
    });

    const issues: DocumentVerificationIssue[] = [];
    if (sources.length === 0) {
      details.llm.status = "not_requested";
      issues.push(issue({
        code: results.length > 0 ? "rag_basis_weak" : "rag_basis_missing",
        layer: "rag",
        severity: "major",
        message: results.length > 0
          ? "Retrieved RAG sources did not meet the configured similarity threshold."
          : "No approved RAG source was retrieved for this document requirement.",
        sourceRefs: asStringArray(input.requirement.sourceRefs),
        evidence: {
          minVectorScore: input.minVectorScore,
          minKeywordScore: input.minKeywordScore,
          topResults: results.slice(0, 5).map((result) => ({
            docId: result.doc.ragMeta?.doc_id || result.doc.id,
            score: result.score,
            vectorScore: result.vectorScore,
            keywordScore: result.keywordScore,
          })),
        },
      }));
      return { status: "warning", issues, sources, details };
    }

    if (details.officialSourceCount === 0) {
      issues.push(issue({
        code: "rag_basis_non_official",
        layer: "rag",
        severity: "major",
        message: "RAG retrieval found accepted sources, but none are official sources suitable for document verification grounding.",
        sourceRefs: asStringArray(input.requirement.sourceRefs),
        evidence: {
          acceptedSourceCount: sources.length,
          acceptedSourceDocIds: sources.map((source) => source.docId).slice(0, 10),
          sourceTypes: Array.from(new Set(sources.map((source) => source.sourceType || "unknown"))),
        },
      }));
    }

    if (input.enableLlm) {
      try {
        const redactedExtraction = sanitizeExtractionForRagJudgment(input.extraction);
        const judged = await generateLlmJson<{
          pass: boolean;
          severity: "none" | "minor" | "major" | "critical";
          issues: string[];
        }>({
          feature: "structured",
          maxTokens: 800,
          temperature: 0,
          jsonSchema: {
            name: "document_rag_verification",
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["pass", "severity", "issues"],
              properties: {
                pass: { type: "boolean" },
                severity: { enum: ["none", "minor", "major", "critical"] },
                issues: { type: "array", items: { type: "string" } },
              },
            },
          },
          messages: [
            {
              role: "system",
              content:
                "You are a Korean immigration document verification assistant. Use only the retrieved official sources. Do not give legal advice or guarantee an outcome.",
            },
            {
              role: "user",
              content: JSON.stringify({
                requirement: {
                  code: input.requirement.code,
                  documentType: input.requirement.documentType,
                  requiredFields: input.requirement.requiredFields,
                  validationRules: input.requirement.validationRules,
                  sourceRefs: input.requirement.sourceRefs,
                },
                redactedExtraction,
                retrievedSources: strongResults.map((result) => ({
                  docId: result.doc.ragMeta?.doc_id || result.doc.id,
                  title: result.doc.ragMeta?.title || result.doc.title.ko,
                  excerpt: result.doc.content.ko.slice(0, 1200),
                })),
              }),
            },
          ],
        });
        details.llm.status = judged.issues?.length ? "issues" : "passed";
        details.llm.issueCount = judged.issues?.filter((item) => item.trim()).length || 0;
        for (const item of judged.issues || []) {
          if (!item.trim()) continue;
          issues.push(issue({
            code: "llm_context_issue",
            layer: "rag",
            severity: judged.severity === "none" ? "minor" : judged.severity,
            message: item.slice(0, 500),
            sourceRefs: asStringArray(input.requirement.sourceRefs),
          }));
        }
      } catch (error) {
        const notConfigured = isLlmNotConfiguredError(error);
        details.llm.status = notConfigured ? "unconfigured" : "failed";
        details.llm.issueCount = 1;
        details.llm.errorCode = notConfigured ? "llm_not_configured" : "llm_judgment_failed";
        issues.push(issue({
          code: notConfigured ? "llm_judgment_unavailable" : "llm_judgment_failed",
          layer: "rag",
          severity: "minor",
          message: notConfigured
            ? "LLM judgment was requested but no managed backend is configured; deterministic RAG sources were still evaluated."
            : `LLM judgment failed after RAG retrieval: ${error instanceof Error ? error.message : String(error)}`,
          sourceRefs: asStringArray(input.requirement.sourceRefs),
        }));
      }
    } else {
      details.llm.status = "not_requested";
    }

    return { status: statusFromSeverity(maxSeverity(issues)), issues, sources, details };
  } catch (error) {
    details.llm.status = input.enableLlm ? "not_requested" : "not_requested";
    return {
      status: "warning",
      issues: [
        issue({
          code: "rag_verification_failed",
          layer: "rag",
          severity: "minor",
          message: error instanceof Error ? error.message : String(error),
          sourceRefs: asStringArray(input.requirement.sourceRefs),
        }),
      ],
      sources: [],
      details,
    };
  }
}

function extractComparableName(value: unknown): string | null {
  const record = asRecord(value);
  const raw = fieldValue(record, "full_name") || fieldValue(record, "student_name") || fieldValue(record, "holder_name");
  return typeof raw === "string" && raw.trim().length >= 2 ? raw.replace(/\s+/g, "").toLowerCase() : null;
}

function extractComparablePassportNumber(value: unknown): string | null {
  const record = asRecord(value);
  const raw = fieldValue(record, "passport_no");
  const normalized = stringifyValue(raw)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
  return normalized.length >= 4 ? normalized : null;
}

function passportNumbersCompatible(left: string, right: string): boolean {
  if (left === right) return true;
  const [shorter, longer] = left.length <= right.length ? [left, right] : [right, left];
  return shorter.length >= 4 && longer.endsWith(shorter);
}

function extractComparableBirthDate(value: unknown): string | null {
  const record = asRecord(value);
  const raw = fieldValue(record, "birth_date");
  if (typeof raw === "string") {
    const compact = raw.replace(/[^\d]/g, "");
    if (compact.length === 8) return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
  }
  return dateOnly(parseDate(raw));
}

function stringifyValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (Array.isArray(value)) return value.map(stringifyValue).filter(Boolean).join(" ");
  return "";
}

function textForFields(extraction: unknown, fields: string[]): string {
  const record = asRecord(extraction);
  return fields
    .map((field) => stringifyValue(fieldValue(record, field)))
    .filter(Boolean)
    .join(" ")
    .trim();
}

function normalizeComparableText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractVisaTypes(value: unknown): string[] {
  const raw = stringifyValue(value).toUpperCase();
  if (!raw.trim()) return [];
  const matches = Array.from(raw.matchAll(/([A-Z])\s*-?\s*(\d{1,2})/g))
    .map((match) => `${match[1]}-${match[2]}`);
  return Array.from(new Set(matches));
}

function normalizeVisaType(value: unknown): string | null {
  return extractVisaTypes(value)[0] || null;
}

function normalizeStayAction(value: unknown): string | null {
  const raw = stringifyValue(value).trim();
  if (!raw) return null;
  const compact = raw.toLowerCase().replace(/[\s_-]+/g, "");
  if (compact.includes("permanentresidence") || compact.includes("영주")) return "permanent_residence";
  if (compact.includes("extension") || compact.includes("extend") || compact.includes("연장")) return "extension";
  if (compact.includes("statuschange") || compact.includes("change") || compact.includes("변경")) return "change";
  if (compact.includes("issuance") || compact.includes("issue") || compact.includes("new") || compact.includes("발급") || compact.includes("신규")) return "issuance";
  return null;
}

function normalizeInstitutionName(value: string): string {
  return normalizeComparableText(value)
    .replace(/\b(university|college|school|institute|language|center|centre)\b/g, " ")
    .replace(/(대학교|대학|학교|어학당|어학원|교육원|기관|센터|학원)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractComparableInstitutionName(value: unknown): string | null {
  const record = asRecord(value);
  const raw = fieldValue(record, "school_name") || fieldValue(record, "institute_name");
  if (typeof raw !== "string" || raw.trim().length < 2) return null;
  const normalized = normalizeInstitutionName(raw);
  return normalized.length >= 2 ? normalized : null;
}

function comparableInstitutionNameFromText(value: string | null | undefined): string | null {
  if (!value || value.trim().length < 2) return null;
  const normalized = normalizeInstitutionName(value);
  return normalized.length >= 2 ? normalized : null;
}

const OCCUPATION_INDUSTRY_GROUPS: Array<{ id: string; terms: RegExp[] }> = [
  {
    id: "software_it",
    terms: [/software/i, /\bit\b/i, /developer/i, /program/i, /data/i, /ai/i, /information/i, /소프트웨어/, /개발/, /프로그래/, /데이터/, /정보통신/, /전산/, /인공지능/],
  },
  {
    id: "engineering",
    terms: [/engineer/i, /mechanical/i, /electrical/i, /civil/i, /plant/i, /엔지니어/, /기계/, /전기/, /전자/, /토목/, /플랜트/],
  },
  {
    id: "design",
    terms: [/design/i, /designer/i, /graphic/i, /ui/i, /ux/i, /디자인/, /디자이너/, /그래픽/],
  },
  {
    id: "marketing_trade",
    terms: [/marketing/i, /trade/i, /sales/i, /export/i, /import/i, /market/i, /마케팅/, /무역/, /영업/, /수출/, /수입/],
  },
  {
    id: "research",
    terms: [/research/i, /scientist/i, /laboratory/i, /r&d/i, /연구/, /연구원/, /실험/, /개발연구/],
  },
  {
    id: "manufacturing",
    terms: [/manufactur/i, /production/i, /factory/i, /제조/, /생산/, /공장/],
  },
  {
    id: "food_service",
    terms: [/cook/i, /chef/i, /restaurant/i, /food/i, /kitchen/i, /조리/, /요리/, /식당/, /음식/, /주방/],
  },
  {
    id: "healthcare",
    terms: [/health/i, /medical/i, /nurse/i, /care/i, /hospital/i, /의료/, /간호/, /요양/, /병원/, /보건/],
  },
];

function occupationIndustryGroups(text: string): Set<string> {
  const normalized = normalizeComparableText(text);
  const groups = new Set<string>();
  for (const group of OCCUPATION_INDUSTRY_GROUPS) {
    if (group.terms.some((term) => term.test(normalized))) groups.add(group.id);
  }
  return groups;
}

function setIntersection<T>(left: Set<T>, right: Set<T>): T[] {
  return [...left].filter((item) => right.has(item));
}

function evaluateJobDescriptionOccupationCrossCheck(input: {
  item: DocumentItemForVerification;
  requirement: VisaDocumentRequirementForVerification | null;
}): DocumentVerificationIssue | null {
  const employmentDocs = input.item.studentProfile.documents.filter((doc) =>
    ["employment_contract", "career_certificate", "job_description"].includes(doc.documentType)
  );
  const companyDocs = input.item.studentProfile.documents.filter((doc) =>
    ["employer_business_registration", "company_registration", "business_registration"].includes(doc.documentType)
  );
  const hasEmployment = employmentDocs.length > 0;
  const hasCompany = companyDocs.length > 0;
  const sourceRefs = asStringArray(input.requirement?.sourceRefs);

  if (!hasEmployment || !hasCompany) {
    return issue({
      code: "cross_check_pending:job_description:visa_occupation",
      layer: "cross_document",
      severity: "major",
      message: "E-7 occupation matching requires both job-description and company-registration evidence.",
      sourceRefs,
      evidence: { hasEmployment, hasCompany },
    });
  }

  const jobText = employmentDocs
    .map((doc) => textForFields(doc.ocrExtractedRedacted, ["job_title", "duties", "required_qualification", "occupation_code", "visa_occupation"]))
    .filter(Boolean)
    .join(" ");
  const industryText = companyDocs
    .map((doc) => textForFields(doc.ocrExtractedRedacted, ["industry_code", "business_type", "business_items", "company_name"]))
    .filter(Boolean)
    .join(" ");

  if (!jobText || !industryText) {
    return issue({
      code: "cross_check_pending:occupation_industry_fields",
      layer: "cross_document",
      severity: "major",
      message: "E-7 cross-document matching needs OCR job and employer-industry fields.",
      sourceRefs,
      evidence: { hasJobText: Boolean(jobText), hasIndustryText: Boolean(industryText) },
    });
  }

  const jobGroups = occupationIndustryGroups(jobText);
  const industryGroups = occupationIndustryGroups(industryText);
  if (jobGroups.size === 0 || industryGroups.size === 0) {
    return issue({
      code: "cross_check_pending:occupation_industry_classification",
      layer: "cross_document",
      severity: "minor",
      message: "E-7 occupation and employer-industry fields could not be classified automatically.",
      sourceRefs,
      evidence: {
        jobText: normalizeComparableText(jobText).slice(0, 160),
        industryText: normalizeComparableText(industryText).slice(0, 160),
        jobGroups: [...jobGroups],
        industryGroups: [...industryGroups],
      },
    });
  }

  const overlap = setIntersection(jobGroups, industryGroups);
  if (overlap.length === 0) {
    return issue({
      code: "cross_document_occupation_industry_mismatch",
      layer: "cross_document",
      severity: "critical",
      message: "E-7 job-description duties do not appear to match the employer business-registration industry.",
      sourceRefs,
      evidence: {
        jobGroups: [...jobGroups],
        industryGroups: [...industryGroups],
        jobText: normalizeComparableText(jobText).slice(0, 160),
        industryText: normalizeComparableText(industryText).slice(0, 160),
      },
    });
  }

  return null;
}

function shouldCheckInstitutionConsistency(input: {
  item: DocumentItemForVerification;
  extraction: Record<string, unknown>;
}): boolean {
  const documentTypesWithInstitution = new Set([
    "standard_admission_letter",
    "admission_letter",
    "education_certificate",
    "final_education_certificate",
    "transcript",
    "transcript_or_attendance",
    "enrollment_certificate",
    "d4_completion_or_transcript",
  ]);
  return documentTypesWithInstitution.has(input.item.documentType) || Boolean(extractComparableInstitutionName(input.extraction));
}

function evaluateInstitutionConsistencyCrossCheck(input: {
  item: DocumentItemForVerification;
  extraction: Record<string, unknown>;
  requirement: VisaDocumentRequirementForVerification | null;
}): DocumentVerificationIssue | null {
  if (!shouldCheckInstitutionConsistency(input)) return null;

  const currentSchool = extractComparableInstitutionName(input.extraction);
  const schoolDocs = input.item.studentProfile.documents
    .filter((doc) => doc.id !== input.item.id && doc.ocrExtractedRedacted)
    .map((doc) => ({
      doc,
      school: extractComparableInstitutionName(doc.ocrExtractedRedacted),
    }))
    .filter((entry): entry is { doc: typeof entry.doc; school: string } => Boolean(entry.school));

  if (!currentSchool || schoolDocs.length === 0) return null;

  const conflicts = schoolDocs.filter((entry) => entry.school !== currentSchool);
  if (conflicts.length === 0) return null;

  return issue({
    code: "cross_document_school_mismatch",
    layer: "cross_document",
    severity: "major",
    message: "School or institute names differ across education/admission documents.",
    sourceRefs: asStringArray(input.requirement?.sourceRefs),
    evidence: {
      currentDocumentType: input.item.documentType,
      conflictingDocumentTypes: conflicts.map((entry) => entry.doc.documentType),
      currentSchool,
      conflictingSchools: Array.from(new Set(conflicts.map((entry) => entry.school))).slice(0, 8),
    },
  });
}

function evaluateProfileInstitutionConsistencyCrossCheck(input: {
  item: DocumentItemForVerification;
  extraction: Record<string, unknown>;
  requirement: VisaDocumentRequirementForVerification | null;
}): DocumentVerificationIssue | null {
  if (!shouldCheckInstitutionConsistency(input)) return null;

  const documentSchool = extractComparableInstitutionName(input.extraction);
  const profileSchool = comparableInstitutionNameFromText(input.item.studentProfile.schoolName);
  if (!documentSchool || !profileSchool || documentSchool === profileSchool) return null;

  return issue({
    code: "cross_document_profile_school_mismatch",
    layer: "cross_document",
    severity: "major",
    message: "School or institute name in OCR does not match the student profile school.",
    sourceRefs: asStringArray(input.requirement?.sourceRefs),
    evidence: {
      documentType: input.item.documentType,
      documentSchool,
      profileSchool,
    },
  });
}

function evaluateCrossDocumentLayer(input: {
  item: DocumentItemForVerification;
  requirement: VisaDocumentRequirementForVerification | null;
  extraction: Record<string, unknown>;
  visaType: string;
  stayAction: string;
}): { status: DocumentVerificationStatus; issues: DocumentVerificationIssue[] } {
  const issues: DocumentVerificationIssue[] = [];
  const currentName = extractComparableName(input.extraction);
  if (currentName) {
    const conflicts = input.item.studentProfile.documents
      .filter((doc) => doc.id !== input.item.id && doc.ocrExtractedRedacted)
      .map((doc) => ({ doc, name: extractComparableName(doc.ocrExtractedRedacted) }))
      .filter((entry) => entry.name && entry.name !== currentName);
    if (conflicts.length > 0) {
      issues.push(issue({
        code: "cross_document_name_mismatch",
        layer: "cross_document",
        severity: "critical",
        message: "OCR names differ across submitted documents.",
        sourceRefs: asStringArray(input.requirement?.sourceRefs),
        evidence: { conflictingDocumentTypes: conflicts.map((entry) => entry.doc.documentType) },
      }));
    }
  }

  const currentPassportNumber = extractComparablePassportNumber(input.extraction);
  if (currentPassportNumber) {
    const conflicts = input.item.studentProfile.documents
      .filter((doc) => doc.id !== input.item.id && doc.ocrExtractedRedacted)
      .map((doc) => ({ doc, passportNumber: extractComparablePassportNumber(doc.ocrExtractedRedacted) }))
      .filter((entry) => entry.passportNumber && !passportNumbersCompatible(currentPassportNumber, entry.passportNumber));
    if (conflicts.length > 0) {
      issues.push(issue({
        code: "cross_document_passport_number_mismatch",
        layer: "cross_document",
        severity: "major",
        message: "OCR passport numbers differ across submitted documents.",
        sourceRefs: asStringArray(input.requirement?.sourceRefs),
        evidence: {
          currentDocumentType: input.item.documentType,
          conflictingDocumentTypes: conflicts.map((entry) => entry.doc.documentType),
        },
      }));
    }
  }

  const currentBirthDate = extractComparableBirthDate(input.extraction);
  if (currentBirthDate) {
    const conflicts = input.item.studentProfile.documents
      .filter((doc) => doc.id !== input.item.id && doc.ocrExtractedRedacted)
      .map((doc) => ({ doc, birthDate: extractComparableBirthDate(doc.ocrExtractedRedacted) }))
      .filter((entry) => entry.birthDate && entry.birthDate !== currentBirthDate);
    if (conflicts.length > 0) {
      issues.push(issue({
        code: "cross_document_birth_date_mismatch",
        layer: "cross_document",
        severity: "major",
        message: "OCR birth dates differ across submitted documents.",
        sourceRefs: asStringArray(input.requirement?.sourceRefs),
        evidence: {
          currentDocumentType: input.item.documentType,
          conflictingDocumentTypes: conflicts.map((entry) => entry.doc.documentType),
        },
      }));
    }
  }

  const institutionIssue = evaluateInstitutionConsistencyCrossCheck(input);
  if (institutionIssue) issues.push(institutionIssue);
  const profileInstitutionIssue = evaluateProfileInstitutionConsistencyCrossCheck(input);
  if (profileInstitutionIssue) issues.push(profileInstitutionIssue);

  const sourceRefs = asStringArray(input.requirement?.sourceRefs);
  const documentVisaTypes = extractVisaTypes(fieldValue(input.extraction, "visa_type"));
  const caseVisaType = normalizeVisaType(input.visaType);
  if (documentVisaTypes.length > 0 && caseVisaType && !documentVisaTypes.includes(caseVisaType)) {
    issues.push(issue({
      code: "cross_document_visa_type_mismatch",
      layer: "cross_document",
      severity: "major",
      message: "Document OCR visa type does not match the case visa type.",
      sourceRefs,
      evidence: {
        caseVisaType,
        documentVisaTypes,
        documentType: input.item.documentType,
      },
    }));
  }

  const documentStayAction = normalizeStayAction(fieldValue(input.extraction, "stay_action"));
  const caseStayAction = normalizeStayAction(input.stayAction);
  if (documentStayAction && caseStayAction && documentStayAction !== caseStayAction) {
    issues.push(issue({
      code: "cross_document_stay_action_mismatch",
      layer: "cross_document",
      severity: "major",
      message: "Document OCR stay/action type does not match the requested stay action.",
      sourceRefs,
      evidence: {
        caseStayAction,
        documentStayAction,
        documentType: input.item.documentType,
      },
    }));
  }

  const crossRules = asStringArray(input.requirement?.validationRules).filter((rule) => rule.startsWith("cross_check:"));
  for (const rule of crossRules) {
    if (rule === "cross_check:job_description:visa_occupation") {
      const result = evaluateJobDescriptionOccupationCrossCheck(input);
      if (result) issues.push(result);
    }
  }

  return { status: statusFromSeverity(maxSeverity(issues)), issues };
}

function resolveApplicantContext(item: DocumentItemForVerification, options: VerifyDocumentOptions): string {
  if (options.applicantContext) return options.applicantContext;
  const program = item.studentProfile.programType?.toLowerCase() || "";
  if (program.includes("language")) return "language_training";
  if (program.includes("degree")) return "degree";
  return "general";
}

export async function verifyDocumentItem(
  documentItemId: string,
  options: VerifyDocumentOptions = {}
): Promise<DocumentVerificationResult> {
  const now = options.now || new Date();
  const item = await db.documentItem.findUnique({
    where: { id: documentItemId },
    include: {
      file: true,
      studentProfile: {
        include: { documents: true },
      },
    },
  });
  if (!item) throw new Error("DocumentItem not found.");

  const visaType = options.visaType || item.studentProfile.visaType || "D-2";
  const stayAction = options.stayAction || "issuance";
  const applicantContext = resolveApplicantContext(item, options);
  const requirement = await findRequirement({
    visaType,
    stayAction,
    applicantContext,
    documentType: item.documentType,
  });
  const extraction = asRecord(item.ocrExtractedRedacted);
  const thresholds = ragThresholds(options);

  const rule = evaluateRuleLayer({ item, requirement, extraction, now });
  const rag = options.enableRag === false
    ? {
        status: "skipped" as const,
        issues: [],
        sources: [],
        details: {
          query: null,
          queryCharCount: 0,
          minVectorScore: thresholds.minVectorScore,
          minKeywordScore: thresholds.minKeywordScore,
          retrievedCount: 0,
          acceptedSourceCount: 0,
          officialSourceCount: 0,
          topResults: [],
          llm: {
            enabled: options.enableLlm === true,
            status: "not_requested" as const,
            provider: null,
            issueCount: 0,
          },
        },
      }
    : await evaluateRagLayer({
        requirement,
        extraction,
        visaType,
        stayAction,
        enableLlm: options.enableLlm === true,
        minVectorScore: thresholds.minVectorScore,
        minKeywordScore: thresholds.minKeywordScore,
      });
  const cross = evaluateCrossDocumentLayer({ item, requirement, extraction, visaType, stayAction });

  const issues = [...rule.issues, ...rag.issues, ...cross.issues];
  const severity = maxSeverity(issues);
  const status = statusFromSeverity(severity);
  const requirementSourceRefs = asStringArray(requirement?.sourceRefs);
  const basis = verificationBasis({ requirement, sources: rag.sources });
  const result: DocumentVerificationResult = {
    ok: severity === "none" || severity === "minor",
    status,
    severity,
    documentItemId: item.id,
    documentType: item.documentType,
    visaType,
    stayAction,
    applicantContext,
    requirementCode: requirement?.code || null,
    requirementReviewStatus: requirement?.reviewStatus || null,
    requirementLastCheckedAt: dateOnly(requirement?.lastCheckedAt),
    requirementSourceRefs,
    layers: {
      rule: rule.status,
      rag: rag.status,
      cross_document: cross.status,
    },
    issues,
    sources: rag.sources,
    basis,
    layerDetails: {
      rag: rag.details,
    },
    checkedAt: now.toISOString(),
    requiresHumanReview: severity !== "none" || requirement?.reviewStatus !== "APPROVED",
  };

  if (options.persist !== false) {
    await db.documentItem.update({
      where: { id: item.id },
      data: {
        ocrValidation: jsonValue(result),
        reviewStatus: result.requiresHumanReview ? ReviewStatus.NEEDS_HUMAN_REVIEW : ReviewStatus.PENDING,
        status: result.severity === "critical" ? DocumentStatus.NEEDS_REVIEW : item.status,
        reviewNote: result.requiresHumanReview
          ? `Document verification ${result.status}: ${issues.slice(0, 3).map((item) => item.code).join(", ")}`
          : item.reviewNote,
      },
    });
  }

  return result;
}

function resolveApplicantContextFromProfile(
  profile: { programType: string | null },
  options: VerifyDocumentSetOptions
): string {
  if (options.applicantContext) return options.applicantContext;
  const program = profile.programType?.toLowerCase() || "";
  if (program.includes("language")) return "language_training";
  if (program.includes("degree")) return "degree";
  if (program.includes("specific")) return "specific_activity";
  return "general";
}

function chooseRequirementByDocumentType(
  rows: VisaDocumentRequirementForVerification[],
  applicantContext: string
): VisaDocumentRequirementForVerification[] {
  const byType = new Map<string, VisaDocumentRequirementForVerification>();
  for (const row of rows) {
    const current = byType.get(row.documentType);
    if (!current) {
      byType.set(row.documentType, row);
      continue;
    }
    const rank = requirementRank(row, applicantContext) - requirementRank(current, applicantContext);
    if (rank < 0 || (rank === 0 && row.lastCheckedAt.getTime() > current.lastCheckedAt.getTime())) {
      byType.set(row.documentType, row);
    }
  }
  return [...byType.values()].sort((a, b) => a.documentType.localeCompare(b.documentType));
}

async function loadDocumentSetTarget(options: VerifyDocumentSetOptions) {
  if (options.caseId) {
    const caseItem = await db.escalationCase.findUnique({
      where: { id: options.caseId },
      include: { studentProfile: true },
    });
    if (!caseItem) throw new Error("EscalationCase not found.");
    return { caseId: caseItem.id, profile: caseItem.studentProfile };
  }

  if (!options.studentProfileId) throw new Error("studentProfileId or caseId is required.");
  const profile = await db.studentProfile.findUnique({ where: { id: options.studentProfileId } });
  if (!profile) throw new Error("StudentProfile not found.");
  return { caseId: null, profile };
}

async function loadSetRequirements(input: {
  visaType: string;
  stayAction: string;
  applicantContext: string;
}): Promise<VisaDocumentRequirementForVerification[]> {
  const rows = await db.visaDocumentRequirement.findMany({
    where: {
      visaType: input.visaType,
      stayAction: input.stayAction,
      applicantContext: { in: [input.applicantContext, "general"] },
      reviewStatus: { in: ["APPROVED", "PENDING"] },
    },
    orderBy: [{ lastCheckedAt: "desc" }],
  });
  return chooseRequirementByDocumentType(rows, input.applicantContext);
}

function isDocumentPresent(item: { fileId: string | null; status: DocumentStatus }): boolean {
  return Boolean(item.fileId) && !NON_PRESENT_DOCUMENT_STATUSES.has(item.status);
}

function duplicateDocumentSetIssues(input: {
  documents: Array<{ id: string; documentType: string; fileId: string | null; status: DocumentStatus }>;
  requirements: VisaDocumentRequirementForVerification[];
}): DocumentVerificationIssue[] {
  const issues: DocumentVerificationIssue[] = [];
  const requirementByType = new Map(input.requirements.map((requirement) => [requirement.documentType, requirement]));

  for (const [documentType, requirement] of requirementByType) {
    const matching = input.documents.filter((document) => document.documentType === documentType);
    const present = matching.filter(isDocumentPresent);
    if (present.length <= 1) continue;

    issues.push(issue({
      code: `duplicate_document_type:${documentType}`,
      layer: "rule",
      severity: "major",
      message: "Multiple present documents of the same required type exist; reviewer must choose the authoritative one.",
      sourceRefs: asStringArray(requirement.sourceRefs),
      evidence: {
        documentType,
        requirementCode: requirement.code,
        presentCount: present.length,
        totalCount: matching.length,
        presentDocumentItemIds: present.map((document) => document.id),
      },
    }));
  }

  return issues;
}

async function maybeCreateMissingPlaceholder(input: {
  studentProfileId: string;
  requirement: VisaDocumentRequirementForVerification;
  shouldCreate: boolean;
  existingCount: number;
}): Promise<string | null> {
  if (!input.shouldCreate || input.existingCount > 0) return null;
  const created = await db.documentItem.create({
    data: {
      studentProfileId: input.studentProfileId,
      documentType: input.requirement.documentType,
      required: input.requirement.required,
      status: DocumentStatus.MISSING,
      reviewStatus: ReviewStatus.NEEDS_HUMAN_REVIEW,
      reviewNote: `Missing required document: ${input.requirement.code}`,
    },
  });
  return created.id;
}

export async function verifyDocumentSet(
  options: VerifyDocumentSetOptions = {}
): Promise<DocumentSetVerificationResult> {
  const now = options.now || new Date();
  const target = await loadDocumentSetTarget(options);
  const visaType = options.visaType || target.profile.visaType || "D-2";
  const stayAction = options.stayAction || "issuance";
  const applicantContext = resolveApplicantContextFromProfile(target.profile, options);
  const requirements = await loadSetRequirements({ visaType, stayAction, applicantContext });

  let documents = await db.documentItem.findMany({
    where: { studentProfileId: target.profile.id },
    orderBy: [{ documentType: "asc" }, { createdAt: "asc" }],
  });

  const missingRequirements: MissingDocumentRequirement[] = [];
  for (const requirement of requirements.filter((row) => row.required)) {
    const matching = documents.filter((document) => document.documentType === requirement.documentType);
    const present = matching.some(isDocumentPresent);
    if (present) continue;

    const createdDocumentItemId = await maybeCreateMissingPlaceholder({
      studentProfileId: target.profile.id,
      requirement,
      shouldCreate: options.createMissingPlaceholders === true,
      existingCount: matching.length,
    });
    if (createdDocumentItemId) {
      documents = await db.documentItem.findMany({
        where: { studentProfileId: target.profile.id },
        orderBy: [{ documentType: "asc" }, { createdAt: "asc" }],
      });
    }

    missingRequirements.push({
      requirementCode: requirement.code,
      documentType: requirement.documentType,
      labelKo: requirement.labelKo,
      labelEn: requirement.labelEn,
      reviewStatus: requirement.reviewStatus,
      sourceRefs: asStringArray(requirement.sourceRefs),
      createdDocumentItemId,
      issue: issue({
        code: `missing_required_document:${requirement.documentType}`,
        layer: "rule",
        severity: "critical",
        message: `Required document is missing from this document set: ${requirement.documentType}`,
        sourceRefs: asStringArray(requirement.sourceRefs),
        evidence: {
          requirementCode: requirement.code,
          reviewStatus: requirement.reviewStatus,
          createdDocumentItemId,
        },
      }),
    });
  }

  const requirementTypes = new Set(requirements.map((requirement) => requirement.documentType));
  const setIssues = duplicateDocumentSetIssues({ documents, requirements });
  const documentsToVerify = documents.filter((document) => requirementTypes.has(document.documentType));
  const verified: DocumentVerificationResult[] = [];
  for (const document of documentsToVerify) {
    verified.push(await verifyDocumentItem(document.id, {
      ...options,
      visaType,
      stayAction,
      applicantContext,
      now,
    }));
  }

  const issues = [...missingRequirements.map((item) => item.issue), ...setIssues, ...verified.flatMap((document) => document.issues)];
  const severity = maxSeverity(issues);
  const status = statusFromSeverity(severity);
  const requiresHumanReviewDocuments = verified.filter((document) => document.requiresHumanReview).length + missingRequirements.length;
  const duplicateDocumentItems = setIssues.reduce((sum, item) => {
    const count = item.evidence?.presentCount;
    return sum + (typeof count === "number" ? count : 0);
  }, 0);

  return {
    ok: severity === "none" || severity === "minor",
    status,
    severity,
    studentProfileId: target.profile.id,
    caseId: target.caseId,
    visaType,
    stayAction,
    applicantContext,
    checkedAt: now.toISOString(),
    summary: {
      requiredDocuments: requirements.filter((requirement) => requirement.required).length,
      missingRequiredDocuments: missingRequirements.length,
      duplicateDocumentTypes: setIssues.length,
      duplicateDocumentItems,
      verifiedDocuments: verified.length,
      passedDocuments: verified.filter((document) => document.status === "pass").length,
      warningDocuments: verified.filter((document) => document.status === "warning").length,
      failedDocuments: verified.filter((document) => document.status === "fail").length,
      requiresHumanReviewDocuments,
    },
    setIssues,
    missingRequirements,
    documents: verified,
  };
}
