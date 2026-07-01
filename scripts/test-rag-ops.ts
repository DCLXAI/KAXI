import { createHash } from "crypto";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { prepareLocalDb } from "./prepare-local-db";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

function contentHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function createKnowledgeDoc(
  db: any,
  input: {
    docId: string;
    title: string;
    content: string;
    reviewStatus: "APPROVED" | "REJECTED" | "PENDING";
    supersededBy?: string | null;
    sourceUrl?: string;
  }
) {
  return db.knowledgeDocument.create({
    data: {
      docId: input.docId,
      title: input.title,
      sourceUrl: input.sourceUrl || "https://www.studyinkorea.go.kr/phase7",
      sourceType: "official_government",
      language: "ko",
      jurisdiction: "KR",
      topic: "visa",
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      validTo: null,
      lastCheckedAt: new Date("2026-07-01T00:00:00.000Z"),
      checkedBy: "test_agent",
      reviewStatus: input.reviewStatus,
      supersedes: [],
      supersededBy: input.supersededBy || null,
      chunks: {
        create: [
          {
            chunkIndex: 0,
            content: input.content,
            contentHash: contentHash(input.content),
          },
        ],
      },
    },
  });
}

const tmpDir = mkdtempSync(join(tmpdir(), "kaxi-rag-ops-test-"));
process.env.DATABASE_URL = `file:${join(tmpDir, "rag-ops.db")}`;
process.env.RESTORE_SQLITE_DEMO_DB = "false";
process.env.TRANSFORMERS_ALLOW_REMOTE = "false";
process.env.KNOWLEDGE_RAG_SOURCE = "governed";
process.env.VECTOR_CACHE_FILE = join(tmpDir, "vector-cache.json");
prepareLocalDb(process.env.DATABASE_URL);

const { db } = await import("../src/lib/db");
const {
  analyzeKnowledgeDocumentDiff,
  calculateKnowledgeImpact,
  listApprovedKnowledgeDocsForRag,
} = await import("../src/lib/knowledge/repository");
const { buildRagBasisNotice, getRagDocumentMetadata } = await import("../src/lib/data/knowledge");
const { hybridSearch, getStoreStats } = await import("../src/lib/embeddings/vector-store");

try {
  const approvedContent = "phase7-approved-needle 공식 유학생 비자 승인 문서";
  const rejectedContent = "phase7-rejected-needle 폐기된 문서는 검색되면 안 됩니다";
  const supersededContent = "phase7-superseded-needle 대체된 문서는 검색되면 안 됩니다";

  await createKnowledgeDoc(db, {
    docId: "phase7-approved-doc",
    title: "Phase 7 approved RAG document",
    content: approvedContent,
    reviewStatus: "APPROVED",
  });
  await createKnowledgeDoc(db, {
    docId: "phase7-rejected-doc",
    title: "Phase 7 rejected RAG document",
    content: rejectedContent,
    reviewStatus: "REJECTED",
  });
  await createKnowledgeDoc(db, {
    docId: "phase7-superseded-doc",
    title: "Phase 7 superseded RAG document",
    content: supersededContent,
    reviewStatus: "APPROVED",
    supersededBy: "phase7-approved-doc",
  });

  const rule = await db.complianceRule.create({
    data: {
      code: "phase7-impact-rule",
      domain: "student_visa",
      visaType: "D-2/D-4",
      ruleType: "rag_impact",
      status: "ACTIVE",
      versions: {
        create: [
          {
            version: 1,
            effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
            conditionAst: { op: "always" },
            outputAst: {
              riskLevel: "LOW",
              resultType: "visa_rule",
              messageKey: "phase7-impact-rule",
              requiresHumanReview: false,
              operations: [{ op: "add_core_documents" }],
            },
            requiredInputs: ["visa_type"],
            sourceRefs: ["phase7-approved-doc"],
            fallbackPolicy: "Use approved RAG source or ask for human review.",
            reviewStatus: "APPROVED",
            reviewedBy: "test_agent",
            reviewedAt: new Date("2026-07-01T00:00:00.000Z"),
          },
        ],
      },
    },
  });
  assert(rule.id, "impact rule should be created");

  await db.chatLog.create({
    data: {
      lang: "ko",
      question: "phase7 impact test",
      answer: "answer",
      source: "rag",
      retrievedDocs: JSON.stringify({ docIds: ["phase7-approved-doc"] }),
    },
  });

  const approvedDocs = await listApprovedKnowledgeDocsForRag(new Date("2026-07-01T12:00:00.000Z"));
  assert(approvedDocs.some((doc) => doc.id === "phase7-approved-doc"), "approved document should be production RAG eligible");
  assert(!approvedDocs.some((doc) => doc.id === "phase7-rejected-doc"), "rejected document must not be production RAG eligible");
  assert(!approvedDocs.some((doc) => doc.id === "phase7-superseded-doc"), "superseded document must not be production RAG eligible");

  const approvedResults = await hybridSearch("phase7-approved-needle", { topK: 5 });
  assert(
    approvedResults.some((result) => result.doc.id === "phase7-approved-doc"),
    "approved document should be searchable"
  );
  const rejectedResults = await hybridSearch("phase7-rejected-needle", { topK: 5 });
  assert(
    !rejectedResults.some((result) => result.doc.id === "phase7-rejected-doc"),
    "rejected document must not be searchable"
  );
  const supersededResults = await hybridSearch("phase7-superseded-needle", { topK: 5 });
  assert(
    !supersededResults.some((result) => result.doc.id === "phase7-superseded-doc"),
    "superseded document must not be searchable"
  );

  const approvedDoc = approvedDocs.find((doc) => doc.id === "phase7-approved-doc");
  assert(approvedDoc, "approved document should be loaded");
  const ragMeta = getRagDocumentMetadata(approvedDoc, "ko");
  assert(ragMeta.source_url.includes("studyinkorea.go.kr"), "RAG metadata should expose source URL");
  assert(ragMeta.last_checked_at === "2026-07-01", "RAG metadata should expose last checked date");
  const notice = buildRagBasisNotice("ko", [approvedDoc]);
  assert(notice.includes("2026-07-01"), "answer notice should include checked date");
  assert(notice.includes("Study in Korea"), "answer notice should include source label");

  const impact = await calculateKnowledgeImpact({
    docId: "phase7-approved-doc",
    title: "Phase 7 approved RAG document",
    sourceUrl: "https://www.studyinkorea.go.kr/phase7",
    topic: "visa",
  });
  assert(impact.ruleCount === 1, `expected one impacted rule, got ${impact.ruleCount}`);
  assert(impact.userCount === 1, `expected one impacted user/chat log, got ${impact.userCount}`);

  const beforeChunks = await db.knowledgeChunk.count({
    where: { document: { docId: "phase7-approved-doc" } },
  });
  const diff = await analyzeKnowledgeDocumentDiff({
    docId: "phase7-approved-doc",
    actor: "test_agent",
    title: "Phase 7 approved RAG document",
    content: `${approvedContent}\n\n새로운 diff-only 후보 문장`,
    sourceUrl: "https://www.studyinkorea.go.kr/phase7",
    sourceType: "official_government",
    topic: "visa",
  });
  const afterChunks = await db.knowledgeChunk.count({
    where: { document: { docId: "phase7-approved-doc" } },
  });
  assert(diff.changed, "changed candidate content should be detected");
  assert(beforeChunks === afterChunks, "diff analysis must not mutate production chunks");

  const stats = getStoreStats();
  assert(stats.docCount > 0, "vector store should report active docs");
  console.log("PASS RAG ops: approved-only search, superseded blocking, source notice, impact, diff-only");
} finally {
  await db.$disconnect();
  rmSync(tmpDir, { recursive: true, force: true });
}
