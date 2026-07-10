import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
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
prepareTestDb("label studio review");

const { db } = await import("../src/lib/db");
const { upsertPendingKnowledgeCandidate } = await import("../src/lib/knowledge/repository");

const tmpDir = mkdtempSync(join(tmpdir(), "kaxi-label-studio-review-"));

try {
  await upsertPendingKnowledgeCandidate({
    docId: "candidate-a__candidate__labelstudio1",
    actor: "test",
    title: "[검토 후보] Label Studio candidate A",
    content: [
      "# Label Studio candidate A",
      "source_url: https://www.hikorea.go.kr/label-studio-a",
      "source_type: official_government",
      "topic: documents",
      "extraction_method: pdf_text",
      "content_type: application/pdf",
      "byte_sha256: labelstudiohash",
      "byte_length: 1234",
      "extracted_chars: 860",
      "",
      "D-2 official document review candidate A\n\n".repeat(20),
    ].join("\n"),
    sourceUrl: "https://www.hikorea.go.kr/label-studio-a",
    sourceType: "official_government",
    language: "ko",
    jurisdiction: "KR",
    topic: "documents",
    supersedes: ["candidate-a"],
    chunkMaxChars: 120,
  });
  await upsertPendingKnowledgeCandidate({
    docId: "candidate-b__candidate__labelstudio2",
    actor: "test",
    title: "[검토 후보] Label Studio candidate B",
    content: "D-4 official document review candidate B\n\n".repeat(20),
    sourceUrl: "https://www.hikorea.go.kr/label-studio-b",
    sourceType: "official_government",
    language: "ko",
    jurisdiction: "KR",
    topic: "documents",
    supersedes: ["candidate-b"],
    chunkMaxChars: 120,
  });

  const tasksPath = join(tmpDir, "tasks.json");
  const configPath = join(tmpDir, "config.xml");
  run([
    "bun",
    "run",
    "scripts/export-label-studio-review-tasks.ts",
    "--out",
    tasksPath,
    "--config-out",
    configPath,
    "--max-content-chars",
    "8000",
  ]);

  assert(existsSync(tasksPath), "Label Studio tasks JSON should be written");
  assert(existsSync(configPath), "Label Studio config XML should be written");
  const tasks = JSON.parse(readFileSync(tasksPath, "utf8"));
  assert(tasks.length === 2, `expected 2 Label Studio tasks, got ${tasks.length}`);
  assert(tasks[0].data.target_type === "knowledge_document", "task should preserve legal-review target type");
  assert(tasks[0].data.chunk_count > 0, "task should include chunk count");
  assert(tasks[0].data.embedded_chunk_count === 0, "test candidate should start without pgvector embeddings");
  assert(tasks[0].data.extraction_method === "pdf_text", "task should expose extraction method");
  assert(tasks[0].data.extraction_byte_length === 1234, "task should expose source byte length");
  assert(String(tasks[0].data.metadata).includes("extraction_method: pdf_text"), "metadata should include extraction method");

  const labelStudioExport = tasks.map((task: { id: number; data: Record<string, unknown> }, index: number) => ({
    id: task.id,
    data: task.data,
    annotations: [
      {
        id: `annotation-${index + 1}`,
        result: [
          {
            from_name: "decision",
            value: { choices: [index === 0 ? "PENDING" : "REJECTED"] },
          },
          {
            from_name: "checked_by",
            value: { text: ["김검수 행정사 12-3456"] },
          },
          {
            from_name: "checked_at",
            value: { text: ["2026-07-08"] },
          },
          {
            from_name: "notes",
            value: { text: [index === 0 ? "추가 확인 필요" : "폐기 대상"] },
          },
        ],
      },
    ],
  }));
  const labelStudioExportPath = join(tmpDir, "label-studio-export.json");
  writeFileSync(labelStudioExportPath, JSON.stringify(labelStudioExport, null, 2));

  const decisionsPath = join(tmpDir, "decisions.jsonl");
  run([
    "bun",
    "run",
    "scripts/import-label-studio-review-decisions.ts",
    "--file",
    labelStudioExportPath,
    "--out",
    decisionsPath,
  ]);
  const rows = readFileSync(decisionsPath, "utf8").trim().split("\n").map((line) => JSON.parse(line));
  assert(rows.length === 2, `expected 2 imported decision rows, got ${rows.length}`);
  assert(rows[0].decision === "PENDING", "first Label Studio annotation should import as PENDING");
  assert(rows[1].decision === "REJECTED", "second Label Studio annotation should import as REJECTED");
  assert(rows.every((row) => row.checkedBy === "김검수 행정사 12-3456"), "import should preserve checkedBy");

  run([
    "bun",
    "run",
    "scripts/validate-legal-review-decisions.ts",
    "--file",
    decisionsPath,
    "--require-candidate-coverage",
    "--require-decisions",
  ]);

  console.log("PASS label studio review: exported tasks, imported decisions, and validated coverage");
} finally {
  await db.$disconnect();
  rmSync(tmpDir, { recursive: true, force: true });
}
