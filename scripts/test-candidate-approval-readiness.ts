import { prepareTestDb } from "./prepare-test-db";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

process.env.TRANSFORMERS_ALLOW_REMOTE = "false";
prepareTestDb("candidate approval readiness");

const { db } = await import("../src/lib/db");
const { upsertPendingKnowledgeCandidate } = await import("../src/lib/knowledge/repository");
const { getCandidateApprovalReadiness, getRagCorpusReadiness } = await import("../src/lib/knowledge/corpus-readiness");
const { PGVECTOR_EMBEDDING_DIM, PGVECTOR_EMBEDDING_MODEL } = await import("../src/lib/embeddings/pgvector-rag");

function chunkCreates(prefix: string, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    chunkIndex: index,
    content: `${prefix} approved chunk ${index}`,
    contentHash: `${prefix}-approved-chunk-${index}`,
    embeddingModel: PGVECTOR_EMBEDDING_MODEL,
    embeddingDim: PGVECTOR_EMBEDDING_DIM,
  }));
}

function vectorLiteral(dim: number): string {
  return `[${Array.from({ length: dim }, (_, index) => (index === 0 ? "1" : "0")).join(",")}]`;
}

try {
  const internalDoc = await db.knowledgeDocument.create({
    data: {
      docId: "projection-internal-policy-doc",
      title: "내부 운영 문서",
      sourceUrl: "internal://projection-policy",
      sourceType: "internal_policy",
      language: "ko",
      jurisdiction: "KR",
      topic: "documents",
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      lastCheckedAt: new Date("2026-07-01T00:00:00.000Z"),
      checkedBy: "test",
      reviewStatus: "APPROVED",
      supersedes: [],
      chunks: { create: chunkCreates("projection-internal", 10) },
    },
  });
  await db.$executeRawUnsafe(
    `UPDATE "KnowledgeChunk"
     SET embedding = $1::vector,
         "embeddingModel" = $2,
         "embeddingDim" = $3
     WHERE "documentId" = $4`,
    vectorLiteral(PGVECTOR_EMBEDDING_DIM),
    PGVECTOR_EMBEDDING_MODEL,
    PGVECTOR_EMBEDDING_DIM,
    internalDoc.id
  );
  const spoofedOfficialDoc = await db.knowledgeDocument.create({
    data: {
      docId: "projection-spoofed-official-doc",
      title: "비공식 URL이 붙은 official 타입 문서",
      sourceUrl: "https://example.com/not-an-official-source",
      sourceType: "official_government",
      language: "ko",
      jurisdiction: "KR",
      topic: "documents",
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      lastCheckedAt: new Date("2026-07-01T00:00:00.000Z"),
      checkedBy: "test",
      reviewStatus: "APPROVED",
      supersedes: [],
      chunks: { create: chunkCreates("projection-spoofed", 10) },
    },
  });
  await db.$executeRawUnsafe(
    `UPDATE "KnowledgeChunk"
     SET embedding = $1::vector,
         "embeddingModel" = $2,
         "embeddingDim" = $3
     WHERE "documentId" = $4`,
    vectorLiteral(PGVECTOR_EMBEDDING_DIM),
    PGVECTOR_EMBEDDING_MODEL,
    PGVECTOR_EMBEDDING_DIM,
    spoofedOfficialDoc.id
  );
  const staleOfficialDoc = await db.knowledgeDocument.create({
    data: {
      docId: "projection-stale-official-doc",
      title: "검수일이 오래된 공식 문서",
      sourceUrl: "https://www.hikorea.go.kr/projection-stale",
      sourceType: "official_government",
      language: "ko",
      jurisdiction: "KR",
      topic: "documents",
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      lastCheckedAt: new Date("2026-01-01T00:00:00.000Z"),
      checkedBy: "test",
      reviewStatus: "APPROVED",
      supersedes: [],
      chunks: { create: chunkCreates("projection-stale", 10) },
    },
  });
  await db.$executeRawUnsafe(
    `UPDATE "KnowledgeChunk"
     SET embedding = $1::vector,
         "embeddingModel" = $2,
         "embeddingDim" = $3
     WHERE "documentId" = $4`,
    vectorLiteral(PGVECTOR_EMBEDDING_DIM),
    PGVECTOR_EMBEDDING_MODEL,
    PGVECTOR_EMBEDDING_DIM,
    staleOfficialDoc.id
  );

  await db.knowledgeDocument.create({
    data: {
      docId: "projection-base-doc",
      title: "기존 승인 문서",
      sourceUrl: "https://www.hikorea.go.kr/projection-base",
      sourceType: "official_government",
      language: "ko",
      jurisdiction: "KR",
      topic: "documents",
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      lastCheckedAt: new Date("2026-07-01T00:00:00.000Z"),
      checkedBy: "test",
      reviewStatus: "APPROVED",
      supersedes: [],
      chunks: { create: chunkCreates("projection-base", 3) },
    },
  });

  const internalOnlyCorpus = await getRagCorpusReadiness({
    minApprovedChunks: 8,
    minApprovedEmbeddedChunks: 8,
    now: new Date("2026-07-09T12:00:00.000Z"),
  });
  assert(!internalOnlyCorpus.ok, "internal approved chunks must not satisfy the official-source production corpus gate");
  assert(
    internalOnlyCorpus.approvedEmbeddedChunks >= 8 && internalOnlyCorpus.approvedOfficialEmbeddedChunks < 8,
    `expected official embedded count to be below threshold even when total approved embeddings pass: ${JSON.stringify(internalOnlyCorpus)}`
  );
  assert(
    internalOnlyCorpus.approvedEmbeddedChunks > internalOnlyCorpus.approvedOfficialEmbeddedChunks,
    "spoofed official source type and stale official documents must not be counted as current official sources"
  );
  assert(
    internalOnlyCorpus.reasons.includes("approved_official_embedded_chunks_below_8"),
    `expected official embedded readiness reason: ${JSON.stringify(internalOnlyCorpus)}`
  );

  await db.$executeRawUnsafe(
    `UPDATE "KnowledgeChunk"
     SET embedding = $1::vector,
         "embeddingModel" = $2,
         "embeddingDim" = $3
     WHERE "documentId" = $4`,
    vectorLiteral(PGVECTOR_EMBEDDING_DIM),
    PGVECTOR_EMBEDDING_MODEL,
    PGVECTOR_EMBEDDING_DIM,
    (await db.knowledgeDocument.findUniqueOrThrow({ where: { docId: "projection-base-doc" }, select: { id: true } })).id
  );
  const mixedCorpus = await getRagCorpusReadiness({
    minApprovedChunks: 8,
    minApprovedEmbeddedChunks: 8,
    minApprovedOfficialChunks: 3,
    minApprovedOfficialEmbeddedChunks: 3,
    now: new Date("2026-07-09T12:00:00.000Z"),
  });
  assert(mixedCorpus.ok, `mixed approved corpus should satisfy independently configured official floor: ${JSON.stringify(mixedCorpus)}`);
  assert(
    mixedCorpus.minApprovedOfficialChunks === 3 && mixedCorpus.minApprovedOfficialEmbeddedChunks === 3,
    "readiness should report independently configured official-source floors"
  );

  await upsertPendingKnowledgeCandidate({
    docId: "projection-base-doc__candidate__alpha",
    actor: "test-harvest",
    title: "[검토 후보] projection alpha",
    content: "projection alpha candidate paragraph.\n\n".repeat(4),
    sourceUrl: "https://www.hikorea.go.kr/projection-alpha",
    sourceType: "official_government",
    language: "ko",
    jurisdiction: "KR",
    topic: "documents",
    supersedes: ["projection-base-doc"],
    chunkMaxChars: 60,
    now: new Date("2026-07-09T00:00:00.000Z"),
  });
  await upsertPendingKnowledgeCandidate({
    docId: "projection-new-doc__candidate__beta",
    actor: "test-harvest",
    title: "[검토 후보] projection beta",
    content: "projection beta candidate paragraph.\n\n".repeat(4),
    sourceUrl: "https://www.hikorea.go.kr/projection-beta",
    sourceType: "official_government",
    language: "ko",
    jurisdiction: "KR",
    topic: "documents",
    supersedes: ["projection-new-doc"],
    chunkMaxChars: 60,
    now: new Date("2026-07-09T00:00:00.000Z"),
  });

  const beforeEmbedding = await getCandidateApprovalReadiness({
    minCandidateChunks: 4,
    minCandidateEmbeddedChunks: 4,
    minProjectedApprovedChunks: 4,
    minProjectedApprovedEmbeddedChunks: 4,
    now: new Date("2026-07-09T12:00:00.000Z"),
  });
  assert(!beforeEmbedding.ok, "candidate approval readiness should fail before candidate chunks are embedded");
  assert(
    beforeEmbedding.reasons.includes("pending_candidate_chunks_not_fully_embedded"),
    `expected unembedded candidate reason: ${JSON.stringify(beforeEmbedding)}`
  );

  await db.knowledgeChunk.updateMany({
    where: { document: { reviewStatus: "PENDING", docId: { contains: "__candidate__" } } },
    data: {
      embeddingModel: PGVECTOR_EMBEDDING_MODEL,
      embeddingDim: PGVECTOR_EMBEDDING_DIM,
    },
  });

  const afterMetadataOnly = await getCandidateApprovalReadiness({
    minCandidateChunks: 4,
    minCandidateEmbeddedChunks: 4,
    minProjectedApprovedChunks: 4,
    minProjectedApprovedEmbeddedChunks: 4,
    now: new Date("2026-07-09T12:00:00.000Z"),
  });
  assert(!afterMetadataOnly.ok, "candidate approval readiness should still fail when only embedding metadata is present");
  assert(
    afterMetadataOnly.reasons.includes("pending_candidate_chunks_not_fully_embedded"),
    `expected actual vector presence to be required: ${JSON.stringify(afterMetadataOnly)}`
  );

  await db.$executeRawUnsafe(
    `UPDATE "KnowledgeChunk"
     SET embedding = $1::vector,
         "embeddingModel" = $2,
         "embeddingDim" = $3
     WHERE "documentId" IN (
       SELECT id FROM "KnowledgeDocument"
       WHERE "reviewStatus" = 'PENDING'
         AND "docId" LIKE '%__candidate__%'
     )`,
    vectorLiteral(PGVECTOR_EMBEDDING_DIM),
    PGVECTOR_EMBEDDING_MODEL,
    PGVECTOR_EMBEDDING_DIM
  );

  const afterEmbedding = await getCandidateApprovalReadiness({
    minCandidateChunks: 4,
    minCandidateEmbeddedChunks: 4,
    minProjectedApprovedChunks: 4,
    minProjectedApprovedEmbeddedChunks: 4,
    now: new Date("2026-07-09T12:00:00.000Z"),
  });
  assert(afterEmbedding.ok, `candidate approval readiness should pass after pre-embedding: ${JSON.stringify(afterEmbedding)}`);
  assert(afterEmbedding.pendingCandidates === 2, "projection should count pending candidates");
  assert(afterEmbedding.pendingOfficialCandidates === 2, "projection should count official pending candidates");
  assert(afterEmbedding.projectedSupersededApprovedDocuments === 1, "projection should account for approved docs superseded by candidates");
  assert(afterEmbedding.projectedApprovedEmbeddedChunks >= afterEmbedding.minProjectedApprovedEmbeddedChunks, "projection should satisfy embedded corpus threshold");
  assert(
    afterEmbedding.projectedApprovedOfficialEmbeddedChunks >= afterEmbedding.minProjectedApprovedEmbeddedChunks,
    "projection should satisfy official embedded corpus threshold"
  );

  await upsertPendingKnowledgeCandidate({
    docId: "projection-spoofed-candidate__candidate__gamma",
    actor: "test-harvest",
    title: "[검토 후보] projection spoofed gamma",
    content: "projection spoofed candidate paragraph.\n\n".repeat(4),
    sourceUrl: "https://example.com/not-official-candidate",
    sourceType: "official_government",
    language: "ko",
    jurisdiction: "KR",
    topic: "documents",
    supersedes: ["projection-spoofed-candidate"],
    chunkMaxChars: 60,
    now: new Date("2026-07-09T00:00:00.000Z"),
  });
  await db.$executeRawUnsafe(
    `UPDATE "KnowledgeChunk"
     SET embedding = $1::vector,
         "embeddingModel" = $2,
         "embeddingDim" = $3
     WHERE "documentId" IN (
       SELECT id FROM "KnowledgeDocument"
       WHERE "reviewStatus" = 'PENDING'
         AND "docId" LIKE '%__candidate__%'
     )`,
    vectorLiteral(PGVECTOR_EMBEDDING_DIM),
    PGVECTOR_EMBEDDING_MODEL,
    PGVECTOR_EMBEDDING_DIM
  );
  const afterSpoofedCandidate = await getCandidateApprovalReadiness({
    minCandidateChunks: 4,
    minCandidateEmbeddedChunks: 4,
    minProjectedApprovedChunks: 4,
    minProjectedApprovedEmbeddedChunks: 4,
    now: new Date("2026-07-09T12:00:00.000Z"),
  });
  assert(!afterSpoofedCandidate.ok, "non-official URL candidates must block official candidate approval readiness");
  assert(
    afterSpoofedCandidate.reasons.includes("pending_candidate_non_official_sources_present"),
    `expected spoofed candidate official-source reason: ${JSON.stringify(afterSpoofedCandidate)}`
  );

  console.log(
    `PASS candidate approval readiness: candidates=${afterEmbedding.pendingCandidates}, projectedEmbedded=${afterEmbedding.projectedApprovedEmbeddedChunks}`
  );
} finally {
  await db.$disconnect();
}
