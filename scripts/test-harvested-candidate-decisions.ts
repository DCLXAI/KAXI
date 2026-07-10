import { existsSync, mkdtempSync, readFileSync, rmSync } from "fs";
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

function run(args: string[], env: NodeJS.ProcessEnv = process.env): string {
  const result = spawnSync(args[0], args.slice(1), {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    fail(`${args.join(" ")} failed\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }
  return `${result.stdout}\n${result.stderr}`;
}

process.env.TRANSFORMERS_ALLOW_REMOTE = "false";
prepareTestDb("harvested candidate decisions");

const { db } = await import("../src/lib/db");
const { upsertPendingKnowledgeCandidate } = await import("../src/lib/knowledge/repository");

const tmpDir = mkdtempSync(join(tmpdir(), "kaxi-candidate-decisions-"));

try {
  await upsertPendingKnowledgeCandidate({
    docId: "candidate-a__candidate__aaa111",
    actor: "test",
    title: "[검토 후보] candidate a",
    content: "D-2 document candidate A\n\n".repeat(20),
    sourceUrl: "https://www.hikorea.go.kr/a",
    sourceType: "official_government",
    language: "ko",
    jurisdiction: "KR",
    topic: "documents",
    supersedes: ["candidate-a"],
    chunkMaxChars: 100,
  });
  await upsertPendingKnowledgeCandidate({
    docId: "candidate-b__candidate__bbb222",
    actor: "test",
    title: "[검토 후보] candidate b",
    content: "D-4 document candidate B\n\n".repeat(20),
    sourceUrl: "https://www.hikorea.go.kr/b",
    sourceType: "official_government",
    language: "ko",
    jurisdiction: "KR",
    topic: "documents",
    supersedes: ["candidate-b"],
    chunkMaxChars: 100,
  });

  const todoPath = join(tmpDir, "todo.jsonl");
  run(["bun", "run", "scripts/prepare-harvested-candidate-decisions.ts", "--out", todoPath]);
  assert(existsSync(todoPath), "blank decision file should be written");
  const todoLines = readFileSync(todoPath, "utf8").trim().split("\n").map((line) => JSON.parse(line));
  assert(todoLines.length === 2, `expected 2 blank rows, got ${todoLines.length}`);
  assert(todoLines.every((line) => line.decision === "" && line.checkedBy === ""), "blank mode should not prefill decision/checkedBy");

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
    "홍길동 행정사 00-0000",
    "--checked-at",
    "2026-07-08",
  ]);
  const approvedLines = readFileSync(approvedPath, "utf8").trim().split("\n").map((line) => JSON.parse(line));
  assert(approvedLines.length === 2, `expected 2 approved rows, got ${approvedLines.length}`);
  assert(approvedLines.every((line) => line.decision === "APPROVED"), "approved mode should set APPROVED");
  assert(approvedLines.every((line) => line.checkedBy === "홍길동 행정사 00-0000"), "approved mode should set checkedBy");

  console.log("PASS harvested candidate decisions: blank and approved files generated");
} finally {
  await db.$disconnect();
  rmSync(tmpDir, { recursive: true, force: true });
}
