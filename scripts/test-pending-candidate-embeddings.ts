import { LegalReviewStatus } from "@prisma/client";
import { prepareTestDb } from "./prepare-test-db";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

process.env.TRANSFORMERS_ALLOW_REMOTE = "true";
prepareTestDb("pending candidate embeddings");

const { db } = await import("../src/lib/db");
const { approveKnowledgeDocument, upsertPendingKnowledgeCandidate } = await import("../src/lib/knowledge/repository");
const { getRagCorpusReadiness } = await import("../src/lib/knowledge/corpus-readiness");
const {
  embedMissingKnowledgeChunksForPgvector,
  PGVECTOR_EMBEDDING_DIM,
  PGVECTOR_EMBEDDING_MODEL,
  searchPgvectorKnowledge,
} = await import("../src/lib/embeddings/pgvector-rag");

try {
  const testNow = new Date("2026-07-09T00:00:00.000Z");
  const candidate = await upsertPendingKnowledgeCandidate({
    docId: "candidate-hidden-needle__candidate__embedtest",
    actor: "test",
    title: "[검토 후보] Pending candidate embedding test",
    content: "candidate-hidden-needle 공식 출처 후보 문장입니다.\n\n".repeat(10),
    sourceUrl: "https://www.hikorea.go.kr/candidate-hidden-needle",
    sourceType: "official_government",
    language: "ko",
    jurisdiction: "KR",
    topic: "documents",
    supersedes: ["candidate-hidden-needle"],
    chunkMaxChars: 80,
    now: testNow,
  });
  assert(candidate.document.reviewStatus === "PENDING", "test candidate must remain pending");
  assert(candidate.document.chunks.length > 1, "test candidate should have multiple chunks");

  const embeddings = await embedMissingKnowledgeChunksForPgvector({
    force: true,
    reviewStatuses: [LegalReviewStatus.PENDING],
    candidateOnly: true,
  });
  assert(embeddings.failedChunks === 0, `candidate embedding should not fail: ${JSON.stringify(embeddings)}`);
  assert(embeddings.embeddedChunks === candidate.document.chunks.length, "all pending candidate chunks should be embedded");

  const embedded = await db.knowledgeChunk.count({
    where: {
      documentId: candidate.document.id,
      embeddingModel: PGVECTOR_EMBEDDING_MODEL,
      embeddingDim: PGVECTOR_EMBEDDING_DIM,
    },
  });
  assert(embedded === candidate.document.chunks.length, "pending candidate chunks should have pgvector embeddings");

  const results = await searchPgvectorKnowledge("candidate-hidden-needle", { topK: 5, languages: ["ko"] });
  assert(
    !results.some((result) => result.doc.id === "candidate-hidden-needle__candidate__embedtest"),
    "embedded pending candidates must not become production-searchable"
  );

  const chunkIdsBeforeApproval = await db.knowledgeChunk.findMany({
    where: { documentId: candidate.document.id },
    orderBy: { chunkIndex: "asc" },
    select: { id: true },
  });
  const approved = await approveKnowledgeDocument({
    docId: "candidate-hidden-needle__candidate__embedtest",
    actor: "김검수 행정사 12-3456",
    now: testNow,
  });
  assert(approved.document.reviewStatus === "APPROVED", "approved candidate should become production-approved");
  const chunkIdsAfterApproval = approved.document.chunks.map((chunk) => ({ id: chunk.id }));
  assert(
    JSON.stringify(chunkIdsAfterApproval) === JSON.stringify(chunkIdsBeforeApproval),
    "candidate approval should preserve existing chunk rows so precomputed embeddings survive"
  );
  const embeddedAfterApproval = await db.knowledgeChunk.count({
    where: {
      documentId: candidate.document.id,
      embeddingModel: PGVECTOR_EMBEDDING_MODEL,
      embeddingDim: PGVECTOR_EMBEDDING_DIM,
      document: { reviewStatus: LegalReviewStatus.APPROVED },
    },
  });
  assert(embeddedAfterApproval === embedded, "approved candidate should preserve pending pgvector embeddings");
  const readiness = await getRagCorpusReadiness({
    minApprovedChunks: approved.document.chunks.length,
    minApprovedEmbeddedChunks: approved.document.chunks.length,
    now: testNow,
  });
  assert(readiness.ok, `approved pre-embedded candidate should immediately satisfy readiness: ${JSON.stringify(readiness)}`);

  console.log(`PASS pending candidate embeddings: embedded=${embedded}, preservedAfterApproval=${embeddedAfterApproval}, productionResults=${results.length}`);
} finally {
  await db.$disconnect();
}
