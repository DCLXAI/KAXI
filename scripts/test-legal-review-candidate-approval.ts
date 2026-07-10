import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
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

function run(args: string[], expectedStatus = 0, env: NodeJS.ProcessEnv = process.env): string {
  const result = spawnSync(args[0], args.slice(1), {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  if (result.status !== expectedStatus) {
    fail(`${args.join(" ")} expected exit ${expectedStatus}, got ${result.status}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }
  return `${result.stdout}\n${result.stderr}`;
}

function vectorLiteral(dim: number): string {
  return `[${Array.from({ length: dim }, (_, index) => (index === 0 ? "1" : "0")).join(",")}]`;
}

process.env.TRANSFORMERS_ALLOW_REMOTE = "false";
prepareTestDb("legal review candidate approval");

const { db } = await import("../src/lib/db");
const { upsertPendingKnowledgeCandidate } = await import("../src/lib/knowledge/repository");
const { getRagCorpusReadiness } = await import("../src/lib/knowledge/corpus-readiness");
const { PGVECTOR_EMBEDDING_DIM, PGVECTOR_EMBEDDING_MODEL } = await import("../src/lib/embeddings/pgvector-rag");

const tmpDir = mkdtempSync(join(tmpdir(), "kaxi-legal-review-candidates-"));

try {
  await db.knowledgeDocument.create({
    data: {
      docId: "official-base-doc",
      title: "기존 공식 문서",
      sourceUrl: "https://www.hikorea.go.kr/base",
      sourceType: "official_government",
      language: "ko",
      jurisdiction: "KR",
      topic: "documents",
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      lastCheckedAt: new Date("2026-07-01T00:00:00.000Z"),
      checkedBy: "test",
      reviewStatus: "APPROVED",
      supersedes: [],
      chunks: {
        create: [{
          chunkIndex: 0,
          content: "old official content",
          contentHash: "old-official-content",
        }],
      },
    },
  });

  const paragraph = [
    "D-2 D-4 D-10 E-7 F-2 F-5 체류자격별 공식 제출서류 검수 후보 본문입니다.",
    "행정사 검수 전에는 production RAG에 노출되지 않아야 하며 승인 후에만 임베딩됩니다.",
    "chunk boundary preservation test paragraph.",
  ].join(" ");
  const content = Array.from({ length: 520 }, (_, index) => `${index}. ${paragraph}`).join("\n\n");
  const candidate = await upsertPendingKnowledgeCandidate({
    docId: "official-base-doc__candidate__approvaltest",
    actor: "test-harvest",
    title: "[검토 후보] 기존 공식 문서",
    content,
    sourceUrl: "https://www.hikorea.go.kr/base",
    sourceType: "official_government",
    language: "ko",
    jurisdiction: "KR",
    topic: "documents",
    supersedes: ["official-base-doc"],
    chunkMaxChars: 260,
    now: new Date("2026-07-08T00:00:00.000Z"),
  });
  assert(candidate.document.chunks.length >= 500, `test candidate should have 500+ chunks, got ${candidate.document.chunks.length}`);

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
  const embeddedBeforeApproval = await db.knowledgeChunk.count({
    where: {
      documentId: candidate.document.id,
      embeddingDim: PGVECTOR_EMBEDDING_DIM,
      embeddingModel: PGVECTOR_EMBEDDING_MODEL,
    },
  });
  assert(embeddedBeforeApproval >= 500, "pending candidate should be pre-embedded before legal approval");

  run(["bun", "run", "scripts/export-legal-review-packet.ts", "--out", tmpDir]);
  const candidateReview = readFileSync(join(tmpDir, "A1B-harvested-candidates-review.md"), "utf8");
  const template = readFileSync(join(tmpDir, "review-decisions.template.jsonl"), "utf8");
  assert(candidateReview.includes("official-base-doc__candidate__approvaltest"), "candidate review packet should include harvested candidate");
  assert(template.includes("official-base-doc__candidate__approvaltest"), "decision template should include harvested candidate target");

  const decisionFile = join(tmpDir, "candidate-decision.jsonl");
  writeFileSync(decisionFile, JSON.stringify({
    targetType: "knowledge_document",
    targetId: "official-base-doc__candidate__approvaltest",
    decision: "APPROVED",
    checkedBy: "홍길동 행정사 00-0000",
    checkedAt: "2026-07-08",
    notes: "테스트 후보 승인",
  }) + "\n");

  const missingDateFile = join(tmpDir, "candidate-decision-missing-date.jsonl");
  writeFileSync(missingDateFile, JSON.stringify({
    targetType: "knowledge_document",
    targetId: "official-base-doc__candidate__approvaltest",
    decision: "APPROVED",
    checkedBy: "홍길동 행정사 00-0000",
    notes: "테스트 후보 승인",
  }) + "\n");
  const missingDateOutput = run(["bun", "run", "scripts/apply-legal-review-decisions.ts", "--file", missingDateFile, "--apply"], 1);
  assert(missingDateOutput.includes("checkedAt is required"), "apply should reject approved decisions without checkedAt");

  const strictTooHighOutput = run([
    "bun",
    "run",
    "scripts/apply-legal-review-decisions.ts",
    "--file",
    decisionFile,
    "--apply",
    "--require-decisions",
    "--require-candidate-coverage",
    "--require-approved-candidate-chunks",
    "999999",
  ], 1);
  assert(strictTooHighOutput.includes("below required 999999"), "strict apply should reject insufficient approved candidate chunks");

  run([
    "bun",
    "run",
    "scripts/apply-legal-review-decisions.ts",
    "--file",
    decisionFile,
    "--apply",
    "--require-decisions",
    "--require-candidate-coverage",
    "--require-approved-candidate-chunks",
    "500",
  ]);

  const [baseAfter, candidateAfter] = await Promise.all([
    db.knowledgeDocument.findUnique({ where: { docId: "official-base-doc" } }),
    db.knowledgeDocument.findUnique({
      where: { docId: "official-base-doc__candidate__approvaltest" },
      include: { chunks: true },
    }),
  ]);
  assert(baseAfter?.supersededBy === "official-base-doc__candidate__approvaltest", "approving candidate should supersede base doc");
  assert(candidateAfter?.reviewStatus === "APPROVED", "candidate should become approved");
  assert((candidateAfter?.chunks.length || 0) >= 500, "approval should preserve harvested chunk boundaries");
  const embeddedAfterApproval = await db.knowledgeChunk.count({
    where: {
      documentId: candidateAfter!.id,
      embeddingDim: PGVECTOR_EMBEDDING_DIM,
      embeddingModel: PGVECTOR_EMBEDDING_MODEL,
    },
  });
  assert(embeddedAfterApproval === embeddedBeforeApproval, "approval should preserve precomputed candidate embeddings");

  const readiness = await getRagCorpusReadiness({
    minApprovedChunks: 500,
    minApprovedEmbeddedChunks: 500,
    now: new Date("2026-07-08T12:00:00.000Z"),
  });
  assert(readiness.ok, `approved corpus should pass 500+ readiness: ${JSON.stringify(readiness)}`);

  console.log(`PASS legal review candidate approval: approvedChunks=${readiness.approvedChunks}, embedded=${readiness.approvedEmbeddedChunks}`);
} finally {
  await db.$disconnect();
  rmSync(tmpDir, { recursive: true, force: true });
}
