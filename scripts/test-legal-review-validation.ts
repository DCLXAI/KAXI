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
    fail(
      `${args.join(" ")} expected exit ${expectedStatus}, got ${result.status}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`
    );
  }
  return `${result.stdout}\n${result.stderr}`;
}

function parseSummary(output: string) {
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  assert(start >= 0 && end > start, `expected JSON summary in output:\n${output}`);
  return JSON.parse(output.slice(start, end + 1)) as {
    ok: boolean;
    decisions: { approved: number; blank: number };
    candidates: {
      pendingInDb: number;
      represented: number;
      approvedChunks: number;
      approvedEmbeddedChunks: number;
      missing: string[];
    };
    errors: string[];
  };
}

function writeJsonl(path: string, rows: unknown[]) {
  writeFileSync(path, rows.map((row) => JSON.stringify(row)).join("\n") + "\n");
}

function vectorLiteral(dim: number): string {
  return `[${Array.from({ length: dim }, (_, index) => (index === 0 ? "1" : "0")).join(",")}]`;
}

process.env.TRANSFORMERS_ALLOW_REMOTE = "false";
prepareTestDb("legal review validation");

const { db } = await import("../src/lib/db");
const { upsertPendingKnowledgeCandidate } = await import("../src/lib/knowledge/repository");
const { PGVECTOR_EMBEDDING_DIM, PGVECTOR_EMBEDDING_MODEL } = await import("../src/lib/embeddings/pgvector-rag");

const tmpDir = mkdtempSync(join(tmpdir(), "kaxi-legal-review-validation-"));

try {
  const contentA = Array.from({ length: 8 }, (_, index) => `D-2 candidate A paragraph ${index}. 제출서류 공식 안내 후보입니다.`).join("\n\n");
  const contentB = Array.from({ length: 8 }, (_, index) => `D-4 candidate B paragraph ${index}. 체류자격 공식 안내 후보입니다.`).join("\n\n");

  await upsertPendingKnowledgeCandidate({
    docId: "validation-a__candidate__aaa111",
    actor: "test",
    title: "[검토 후보] validation a",
    content: contentA,
    sourceUrl: "https://www.hikorea.go.kr/a",
    sourceType: "official_government",
    language: "ko",
    jurisdiction: "KR",
    topic: "documents",
    supersedes: ["validation-a"],
    chunkMaxChars: 80,
    now: new Date("2026-07-08T00:00:00.000Z"),
  });
  await upsertPendingKnowledgeCandidate({
    docId: "validation-b__candidate__bbb222",
    actor: "test",
    title: "[검토 후보] validation b",
    content: contentB,
    sourceUrl: "https://www.hikorea.go.kr/b",
    sourceType: "official_government",
    language: "ko",
    jurisdiction: "KR",
    topic: "documents",
    supersedes: ["validation-b"],
    chunkMaxChars: 80,
    now: new Date("2026-07-08T00:00:00.000Z"),
  });

  const blankPath = join(tmpDir, "blank.jsonl");
  run(["bun", "run", "scripts/prepare-harvested-candidate-decisions.ts", "--out", blankPath]);
  const blankSummary = parseSummary(run([
    "bun",
    "scripts/validate-legal-review-decisions.ts",
    "--file",
    blankPath,
    "--require-candidate-coverage",
    "--now",
    "2026-07-08T23:59:59.000Z",
  ]));
  assert(blankSummary.ok, "blank candidate file should pass pre-review validation");
  assert(blankSummary.decisions.blank === 2, `expected two blank rows, got ${blankSummary.decisions.blank}`);
  assert(blankSummary.candidates.pendingInDb === 2, "both pending candidates should be counted");

  const requireDecisions = parseSummary(run([
    "bun",
    "scripts/validate-legal-review-decisions.ts",
    "--file",
    blankPath,
    "--require-decisions",
    "--now",
    "2026-07-08T23:59:59.000Z",
  ], 1));
  assert(!requireDecisions.ok, "require-decisions should fail blank rows");
  assert(requireDecisions.errors.some((error) => error.includes("blank row")), "blank row failure should be explicit");

  const approvedPath = join(tmpDir, "approved.jsonl");
  run([
    "bun",
    "run",
    "scripts/prepare-harvested-candidate-decisions.ts",
    "--out",
    approvedPath,
    "--decision",
    "APPROVED",
    "--reviewed-by",
    "김검수 행정사 12-3456",
    "--checked-at",
    "2026-07-08",
  ]);
  const unembeddedApprovedSummary = parseSummary(run([
    "bun",
    "scripts/validate-legal-review-decisions.ts",
    "--file",
    approvedPath,
    "--require-decisions",
    "--require-candidate-coverage",
    "--require-approved-candidate-chunks",
    "2",
    "--now",
    "2026-07-08T23:59:59.000Z",
  ], 1));
  assert(!unembeddedApprovedSummary.ok, "approved candidate file should fail strict validation before embeddings exist");
  assert(
    unembeddedApprovedSummary.errors.some((error) => error.includes("not fully embedded") || error.includes("embedded chunk")),
    "strict candidate validation should explain missing embeddings"
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

  const approvedSummary = parseSummary(run([
    "bun",
    "scripts/validate-legal-review-decisions.ts",
    "--file",
    approvedPath,
    "--require-decisions",
    "--require-candidate-coverage",
    "--require-approved-candidate-chunks",
    "2",
    "--now",
    "2026-07-08T23:59:59.000Z",
  ]));
  assert(approvedSummary.ok, "approved candidate file should pass strict validation");
  assert(approvedSummary.decisions.approved === 2, "both candidates should be approved");
  assert(approvedSummary.candidates.approvedChunks >= 2, "approved candidate chunks should be counted");
  assert(approvedSummary.candidates.approvedEmbeddedChunks >= 2, "approved candidate embedded chunks should be counted");

  const approvedRows = readFileSync(approvedPath, "utf8").trim().split("\n").map((line) => JSON.parse(line));
  const duplicatePath = join(tmpDir, "duplicate.jsonl");
  writeJsonl(duplicatePath, [approvedRows[0], approvedRows[0], approvedRows[1]]);
  const duplicateSummary = parseSummary(run([
    "bun",
    "scripts/validate-legal-review-decisions.ts",
    "--file",
    duplicatePath,
    "--now",
    "2026-07-08T23:59:59.000Z",
  ], 1));
  assert(duplicateSummary.errors.some((error) => error.includes("duplicate review target")), "duplicate target should fail");

  const missingReviewerPath = join(tmpDir, "missing-reviewer.jsonl");
  writeJsonl(missingReviewerPath, [{ ...approvedRows[0], checkedBy: "" }]);
  const missingReviewerSummary = parseSummary(run([
    "bun",
    "scripts/validate-legal-review-decisions.ts",
    "--file",
    missingReviewerPath,
    "--now",
    "2026-07-08T23:59:59.000Z",
  ], 1, { ...process.env, LEGAL_REVIEW_CHECKED_BY: "" }));
  assert(missingReviewerSummary.errors.some((error) => error.includes("checkedBy")), "missing checkedBy should fail");

  const futurePath = join(tmpDir, "future.jsonl");
  writeJsonl(futurePath, [{ ...approvedRows[0], checkedAt: "2099-01-01" }]);
  const futureSummary = parseSummary(run([
    "bun",
    "scripts/validate-legal-review-decisions.ts",
    "--file",
    futurePath,
    "--now",
    "2026-07-08T23:59:59.000Z",
  ], 1));
  assert(futureSummary.errors.some((error) => error.includes("future")), "future checkedAt should fail");

  const incompletePath = join(tmpDir, "incomplete.jsonl");
  writeJsonl(incompletePath, [approvedRows[0]]);
  const incompleteSummary = parseSummary(run([
    "bun",
    "scripts/validate-legal-review-decisions.ts",
    "--file",
    incompletePath,
    "--require-candidate-coverage",
    "--now",
    "2026-07-08T23:59:59.000Z",
  ], 1));
  assert(incompleteSummary.errors.some((error) => error.includes("missing 1 pending candidate")), "missing candidate coverage should fail");

  console.log("PASS legal review validation: strict approval preflight and failure cases verified");
} finally {
  await db.$disconnect();
  rmSync(tmpDir, { recursive: true, force: true });
}
