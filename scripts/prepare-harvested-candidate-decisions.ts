import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { db } from "../src/lib/db";

type Decision = "APPROVED" | "PENDING" | "REJECTED" | "";

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function normalizeDecision(value: string | undefined): Decision {
  if (!value) return "";
  const normalized = value.trim().toUpperCase();
  if (normalized === "APPROVED" || normalized === "PENDING" || normalized === "REJECTED") return normalized;
  fail(`Unsupported --decision "${value}". Use APPROVED, PENDING, REJECTED, or omit it for blanks.`);
}

async function main() {
  const decision = normalizeDecision(argValue("--decision"));
  const checkedBy = argValue("--reviewed-by")?.trim() || process.env.LEGAL_REVIEW_CHECKED_BY?.trim() || "";
  const checkedAt = argValue("--checked-at") || new Date().toISOString().slice(0, 10);
  const out = argValue("--out") || join(process.cwd(), "legal-review", "latest", "harvested-candidate-decisions.jsonl");

  if (decision && !checkedBy) {
    fail("--reviewed-by or LEGAL_REVIEW_CHECKED_BY is required when --decision is set.");
  }

  const candidates = await db.knowledgeDocument.findMany({
    where: {
      docId: { contains: "__candidate__" },
      reviewStatus: "PENDING",
    },
    include: {
      _count: { select: { chunks: true } },
    },
    orderBy: [{ topic: "asc" }, { docId: "asc" }],
  });

  await mkdir(dirname(out), { recursive: true });
  const lines = candidates.map((candidate) => JSON.stringify({
    targetType: "knowledge_document",
    targetId: candidate.docId,
    decision,
    checkedBy: decision ? checkedBy : "",
    checkedAt,
    notes: decision
      ? `Harvested official-source candidate reviewed for production RAG. chunks=${candidate._count.chunks}`
      : "",
    validTo: candidate.validTo?.toISOString().slice(0, 10) || null,
    supersededBy: candidate.supersededBy || null,
  }));
  await writeFile(out, `${lines.join("\n")}${lines.length > 0 ? "\n" : ""}`);

  const chunkCount = candidates.reduce((sum, candidate) => sum + candidate._count.chunks, 0);
  console.log(
    `[legal-review:candidates] wrote ${candidates.length} candidate decision row(s), chunks=${chunkCount}, ` +
      `decision=${decision || "(blank)"} out=${out}`
  );
}

main()
  .catch((error) => {
    console.error(`[legal-review:candidates] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
