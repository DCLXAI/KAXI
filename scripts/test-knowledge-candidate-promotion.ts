import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { spawnSync } from "child_process";
import { prepareTestDb } from "./prepare-test-db";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

function run(args: string[], expectedStatus = 0): string {
  const result = spawnSync(args[0], args.slice(1), {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
  });
  if (result.status !== expectedStatus) {
    fail(
      `${args.join(" ")} expected exit ${expectedStatus}, got ${result.status}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`
    );
  }
  return `${result.stdout}\n${result.stderr}`;
}

function vectorLiteral(dim: number): string {
  return `[${Array.from({ length: dim }, (_, index) => (index === 0 ? "1" : "0")).join(",")}]`;
}

process.env.TRANSFORMERS_ALLOW_REMOTE = "false";
prepareTestDb("knowledge candidate promotion");

const { db } = await import("../src/lib/db");
const { upsertPendingKnowledgeCandidate } = await import("../src/lib/knowledge/repository");
const { VISA_DOCUMENT_REQUIREMENT_SEEDS } = await import("../src/lib/documents/visa-document-matrix");
const { PGVECTOR_EMBEDDING_DIM, PGVECTOR_EMBEDDING_MODEL } = await import("../src/lib/embeddings/pgvector-rag");

function jsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

const tmpDir = mkdtempSync(join(tmpdir(), "kaxi-knowledge-promotion-"));

try {
  await db.visaDocumentRequirement.createMany({
    data: VISA_DOCUMENT_REQUIREMENT_SEEDS.map((seed) => ({
      ...seed,
      sourceRefs: jsonValue(seed.sourceRefs),
      requiredFields: jsonValue(seed.requiredFields),
      validationRules: jsonValue(seed.validationRules),
      lastCheckedAt: new Date(seed.lastCheckedAt),
    })),
  });

  const paragraph = "Promotion rehearsal official D-2 D-4 E-7 document guidance paragraph.";
  const candidate = await upsertPendingKnowledgeCandidate({
    docId: "promotion-official-source__candidate__reviewed",
    actor: "test-harvest",
    title: "[검토 후보] promotion official source",
    content: Array.from({ length: 8 }, (_, index) => `${index}. ${paragraph}`).join("\n\n"),
    sourceUrl: "https://www.hikorea.go.kr/promotion-test",
    sourceType: "official_government",
    language: "ko",
    jurisdiction: "KR",
    topic: "documents",
    supersedes: ["promotion-official-source"],
    chunkMaxChars: 80,
    now: new Date("2026-07-09T00:00:00.000Z"),
  });
  assert(candidate.document.chunks.length >= 4, `promotion fixture needs 4+ chunks, got ${candidate.document.chunks.length}`);

  await db.$executeRawUnsafe(
    `UPDATE "KnowledgeChunk"
     SET embedding = $1::vector,
         "embeddingModel" = $2,
         "embeddingDim" = $3
     WHERE "documentId" = $4`,
    vectorLiteral(PGVECTOR_EMBEDDING_DIM),
    PGVECTOR_EMBEDDING_MODEL,
    PGVECTOR_EMBEDDING_DIM,
    candidate.document.id
  );

  const decisionFile = join(tmpDir, "approved-candidates.jsonl");
  writeFileSync(decisionFile, JSON.stringify({
    targetType: "knowledge_document",
    targetId: "promotion-official-source__candidate__reviewed",
    decision: "APPROVED",
    checkedBy: "김검수 행정사 12-3456",
    checkedAt: "2026-07-09",
    notes: "promotion rehearsal approval",
  }) + "\n");

  const output = run([
    "bun",
    "run",
    "knowledge:promote:candidates",
    "--",
    "--file",
    decisionFile,
    "--min-approved-candidate-chunks",
    "4",
    "--min-approved-chunks",
    "4",
    "--min-approved-embedded-chunks",
    "4",
  ]);
  assert(output.includes("promotion complete"), "promotion script should finish all gates");

  const promoted = await db.knowledgeDocument.findUnique({
    where: { docId: "promotion-official-source__candidate__reviewed" },
    include: { chunks: true },
  });
  assert(promoted?.reviewStatus === "APPROVED", "promotion should approve the reviewed candidate");
  assert(promoted.checkedBy === "김검수 행정사 12-3456", "promotion should preserve reviewer identity");
  assert(promoted.chunks.length >= 4, "promotion should preserve candidate chunks");

  const approvedEmbeddedChunks = await db.knowledgeChunk.count({
    where: {
      embeddingDim: PGVECTOR_EMBEDDING_DIM,
      embeddingModel: PGVECTOR_EMBEDDING_MODEL,
      document: { reviewStatus: "APPROVED" },
    },
  });
  assert(approvedEmbeddedChunks >= 4, "promotion should leave 4+ approved embedded chunks");

  const pendingCandidates = await db.knowledgeDocument.count({
    where: { reviewStatus: "PENDING", docId: { contains: "__candidate__" } },
  });
  assert(pendingCandidates === 0, "promotion rehearsal should consume all pending candidates");

  console.log(`PASS knowledge candidate promotion: approvedEmbeddedChunks=${approvedEmbeddedChunks}`);
} finally {
  await db.$disconnect();
  rmSync(tmpDir, { recursive: true, force: true });
}
