import {
  KNOWLEDGE_DOCS,
  SOURCE_METADATA,
  getRagDocumentMetadata,
  getKnowledgeDocsWithMetadata,
  getKnowledgeSourceAudit,
  getSourceMetadata,
} from "../src/lib/data/knowledge";
import {
  SCHOOLS,
  isSchoolReviewCurrent,
  withSchoolSourceMetadata,
} from "../src/lib/data/schools";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assertHttpOrInternal(url: string, label: string) {
  if (url.startsWith("internal://")) return;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return;
  } catch {}
  fail(`${label} must use http(s) or internal:// URL`);
}

function maxReviewAfterDate(): Date {
  const dates = Object.values(SOURCE_METADATA).map((meta) => new Date(meta.reviewAfter).getTime());
  return new Date(Math.max(...dates) + 24 * 60 * 60 * 1000);
}

for (const [source, meta] of Object.entries(SOURCE_METADATA)) {
  const resolved = getSourceMetadata(source);
  if (!resolved.verifiedAt || !resolved.reviewAfter) fail(`${source} missing verifiedAt/reviewAfter`);
  if (!resolved.validFrom || !resolved.checkedBy || !resolved.reviewStatus || !resolved.sourceType || !resolved.jurisdiction) {
    fail(`${source} missing RAG governance metadata`);
  }
  assertHttpOrInternal(resolved.url, `${source}.url`);
  if (resolved.owner === "official" && resolved.url.startsWith("internal://")) {
    fail(`${source} is official but points to internal URL`);
  }
  if (new Date(resolved.verifiedAt).getTime() > new Date(resolved.reviewAfter).getTime()) {
    fail(`${source} reviewAfter must be >= verifiedAt`);
  }
  if (resolved.validTo && new Date(resolved.validFrom).getTime() > new Date(resolved.validTo).getTime()) {
    fail(`${source} validTo must be >= validFrom`);
  }
  if (resolved.reviewStatus !== "approved") {
    fail(`${source} must be approved before it is searchable`);
  }
  if (resolved.supersededBy) {
    fail(`${source} must not be superseded while active`);
  }
}

const sourceAudit = getKnowledgeSourceAudit();
if (sourceAudit.missingMetadata.length > 0) {
  fail(`RAG sources missing metadata: ${sourceAudit.missingMetadata.join(", ")}`);
}
if (sourceAudit.expiredDocs.length > 0) {
  fail(`RAG docs expired today: ${sourceAudit.expiredDocs.map((doc) => doc.id).join(", ")}`);
}

const requiredHiKoreaDocs = [
  "hikorea-homepage-urgent-notices",
  "hikorea-integrated-status-manual",
  "hikorea-d2-d4-d10-e7-f2-f5-requirements",
  "hikorea-stay-extension",
  "hikorea-status-change",
  "hikorea-activity-permit",
  "hikorea-forms-document-checklist",
  "hikorea-online-visit-application",
  "hikorea-fees-processing-authentication",
  "hikorea-policy-notice-monitor",
];
for (const docId of requiredHiKoreaDocs) {
  const doc = KNOWLEDGE_DOCS.find((item) => item.id === docId);
  if (!doc) fail(`Required HiKorea RAG doc missing: ${docId}`);
  const meta = getRagDocumentMetadata(doc, "ko");
  if (!meta.source_url.includes("hikorea.go.kr")) fail(`${docId} must point to hikorea.go.kr`);
  if (meta.source_type !== "official_government") fail(`${docId} must use official_government source type`);
  if (meta.last_checked_at !== "2026-07-02") fail(`${docId} checked date must be 2026-07-02`);
}

const requiredImmigrationLawDocs = [
  "immigration-law-recent-promulgations",
  "immigration-law-interpretation-hierarchy",
  "immigration-act-stay-status-scope",
  "immigration-decree-current-text",
  "immigration-decree-long-term-status-table",
  "immigration-act-permission-matrix",
  "immigration-rule-documents-attachments",
  "immigration-rule-fees",
  "immigration-law-violation-risk",
];
for (const docId of requiredImmigrationLawDocs) {
  const doc = KNOWLEDGE_DOCS.find((item) => item.id === docId);
  if (!doc) fail(`Required immigration law RAG doc missing: ${docId}`);
  const meta = getRagDocumentMetadata(doc, "ko");
  if (!meta.source_url.includes("law.go.kr")) fail(`${docId} must point to law.go.kr`);
  if (meta.source_type !== "official_law") fail(`${docId} must use official_law source type`);
  if (meta.last_checked_at !== "2026-07-02") fail(`${docId} checked date must be 2026-07-02`);
}

const requiredPolicyNewsDocs = [
  "moj-immigration-policy-news",
];
for (const docId of requiredPolicyNewsDocs) {
  const doc = KNOWLEDGE_DOCS.find((item) => item.id === docId);
  if (!doc) fail(`Required immigration policy news RAG doc missing: ${docId}`);
  const meta = getRagDocumentMetadata(doc, "ko");
  if (!meta.source_url.includes("immigration.go.kr")) fail(`${docId} must point to immigration.go.kr`);
  if (meta.source_type !== "official_government") fail(`${docId} must use official_government source type`);
  if (meta.last_checked_at !== "2026-07-02") fail(`${docId} checked date must be 2026-07-02`);
}

const afterAllReviews = maxReviewAfterDate();
const futureDocs = getKnowledgeDocsWithMetadata({ referenceDate: afterAllReviews });
if (futureDocs.length !== 0) {
  fail("RAG reviewAfter filtering did not exclude expired documents");
}

const activeDocs = getKnowledgeDocsWithMetadata();
for (const doc of activeDocs) {
  const ragMeta = getRagDocumentMetadata(doc, "ko");
  const requiredKeys = [
    "doc_id",
    "title",
    "source_url",
    "source_type",
    "language",
    "jurisdiction",
    "topic",
    "valid_from",
    "last_checked_at",
    "checked_by",
    "review_status",
    "supersedes",
    "superseded_by",
  ];
  for (const key of requiredKeys) {
    if (!(key in ragMeta)) fail(`${doc.id} missing RAG metadata field ${key}`);
  }
  if (ragMeta.review_status !== "approved") fail(`${doc.id} RAG metadata is not approved`);
  if (ragMeta.superseded_by !== null) fail(`${doc.id} RAG metadata is superseded`);
}

const missingSourceDoc = {
  id: "__governance_missing_source__",
  category: "warning" as const,
  title: { ko: "누락 출처", vi: "Missing source", mn: "Missing source", en: "Missing source" },
  keywords: ["missing-source"],
  content: {
    ko: "출처 메타데이터가 없는 문서는 운영 검색에서 제외되어야 합니다.",
    vi: "Documents without source metadata must be excluded.",
    mn: "Documents without source metadata must be excluded.",
    en: "Documents without source metadata must be excluded.",
  },
  source: "__unregistered_governance_source__",
};
KNOWLEDGE_DOCS.push(missingSourceDoc);
try {
  const missingSourceAudit = getKnowledgeSourceAudit();
  if (!missingSourceAudit.missingMetadata.includes(missingSourceDoc.source)) {
    fail("RAG source audit did not report missing metadata");
  }
  const docsWithMissingSource = getKnowledgeDocsWithMetadata();
  if (docsWithMissingSource.some((doc) => doc.id === missingSourceDoc.id)) {
    fail("RAG runtime filtering did not exclude a document with missing source metadata");
  }
} finally {
  KNOWLEDGE_DOCS.pop();
}

const schools = SCHOOLS.map(withSchoolSourceMetadata);
for (const school of schools) {
  if (!school.sourceUrl || !school.verifiedAt || !school.reviewAfter) {
    fail(`${school.id} missing sourceUrl/verifiedAt/reviewAfter`);
  }
  assertHttpOrInternal(school.sourceUrl, `${school.id}.sourceUrl`);
  if (new Date(school.verifiedAt).getTime() > new Date(school.reviewAfter).getTime()) {
    fail(`${school.id} reviewAfter must be >= verifiedAt`);
  }
  if (!isSchoolReviewCurrent(school)) {
    fail(`${school.id} school source review is expired`);
  }
}

console.log("PASS data governance audit");
console.log(`RAG active docs: ${sourceAudit.activeDocs}/${sourceAudit.totalDocs}`);
console.log(`School seed rows current: ${schools.length}/${schools.length}`);
