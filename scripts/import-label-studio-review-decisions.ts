import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";

type Decision = "APPROVED" | "PENDING" | "REJECTED" | "";

interface LabelStudioResult {
  from_name?: string;
  value?: {
    choices?: string[];
    text?: string[];
  };
}

interface LabelStudioAnnotation {
  id?: number | string;
  completed_at?: string;
  updated_at?: string;
  result?: LabelStudioResult[];
}

interface LabelStudioTask {
  id?: number | string;
  data?: Record<string, unknown>;
  annotations?: LabelStudioAnnotation[];
  predictions?: LabelStudioAnnotation[];
}

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function normalizeDecision(value: unknown): Decision {
  const normalized = String(value || "").trim().toUpperCase();
  if (!normalized) return "";
  if (normalized === "APPROVED" || normalized === "PENDING" || normalized === "REJECTED") return normalized;
  if (normalized === "NEEDS_REVIEW") return "PENDING";
  if (normalized === "DEPRECATED") return "REJECTED";
  throw new Error(`Unsupported Label Studio decision "${String(value)}".`);
}

function parseTasks(raw: string): LabelStudioTask[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) return JSON.parse(trimmed) as LabelStudioTask[];
  return trimmed.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as LabelStudioTask);
}

function resultText(results: LabelStudioResult[], fromName: string): string {
  const result = results.find((candidate) => candidate.from_name === fromName);
  return result?.value?.text?.[0]?.trim() || "";
}

function resultDecision(results: LabelStudioResult[]): Decision {
  const result = results.find((candidate) => candidate.from_name === "decision");
  return normalizeDecision(result?.value?.choices?.[0]);
}

function selectedAnnotation(task: LabelStudioTask): LabelStudioAnnotation | null {
  const annotations = (task.annotations || []).filter((annotation) => (annotation.result || []).length > 0);
  if (annotations.length > 0) return annotations[annotations.length - 1];
  const predictions = (task.predictions || []).filter((prediction) => (prediction.result || []).length > 0);
  return predictions[predictions.length - 1] || null;
}

function stringField(data: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function nullableStringField(data: Record<string, unknown>, ...keys: string[]): string | null {
  const value = stringField(data, ...keys);
  return value || null;
}

async function main() {
  const file = argValue("--file");
  if (!file) {
    throw new Error(
      "Usage: bun run legal-review:label-studio:import -- --file legal-review/latest/label-studio-export.json [--out legal-review/latest/label-studio-decisions.jsonl] [--reviewed-by ...] [--checked-at YYYY-MM-DD]"
    );
  }

  const out = argValue("--out") || join(process.cwd(), "legal-review", "latest", "label-studio-decisions.jsonl");
  const fallbackCheckedBy = argValue("--reviewed-by")?.trim() || process.env.LEGAL_REVIEW_CHECKED_BY?.trim() || "";
  const fallbackCheckedAt = argValue("--checked-at") || new Date().toISOString().slice(0, 10);

  const tasks = parseTasks(await readFile(file, "utf8"));
  const rows = tasks.map((task) => {
    const data = task.data || {};
    const targetId = stringField(data, "target_id", "targetId", "doc_id", "docId");
    if (!targetId) throw new Error(`Task ${task.id || "(unknown)"} is missing data.target_id/doc_id.`);
    const targetType = stringField(data, "target_type", "targetType") || "knowledge_document";
    const annotation = selectedAnnotation(task);
    const results = annotation?.result || [];
    const decision = resultDecision(results);
    const checkedBy = decision ? resultText(results, "checked_by") || fallbackCheckedBy : "";
    const checkedAt = decision ? resultText(results, "checked_at") || fallbackCheckedAt : "";
    const notes = resultText(results, "notes");

    return {
      targetType,
      targetId,
      decision,
      checkedBy,
      checkedAt,
      notes,
      validTo: nullableStringField(data, "valid_to", "validTo"),
      supersededBy: nullableStringField(data, "superseded_by", "supersededBy"),
      source: "label_studio",
      labelStudioTaskId: task.id || null,
      labelStudioAnnotationId: annotation?.id || null,
    };
  });

  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, `${rows.map((row) => JSON.stringify(row)).join("\n")}${rows.length ? "\n" : ""}`);

  const counts = rows.reduce(
    (acc, row) => {
      if (row.decision === "APPROVED") acc.approved++;
      else if (row.decision === "PENDING") acc.pending++;
      else if (row.decision === "REJECTED") acc.rejected++;
      else acc.blank++;
      if (row.decision && !row.checkedBy) acc.missingReviewer++;
      return acc;
    },
    { approved: 0, pending: 0, rejected: 0, blank: 0, missingReviewer: 0 }
  );

  console.log(
    `[legal-review:label-studio:import] rows=${rows.length} approved=${counts.approved} pending=${counts.pending} rejected=${counts.rejected} blank=${counts.blank} missingReviewer=${counts.missingReviewer} out=${out}`
  );
}

main().catch((error) => {
  console.error(`[legal-review:label-studio:import] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
