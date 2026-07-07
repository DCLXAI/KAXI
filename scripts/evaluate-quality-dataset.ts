import { readFileSync } from "fs";
import { hybridSearch, initVectorStore, getStoreStats } from "../src/lib/embeddings/vector-store";
import {
  embedMissingKnowledgeChunksForPgvector,
  getPgvectorStats,
  ingestStaticKnowledgeDocsForPgvector,
} from "../src/lib/embeddings/pgvector-rag";
import { db } from "../src/lib/db";
import { SEED_SYNONYMS } from "../src/lib/data/synonym-seed";

// Earlier ci:domain steps reset the database; synonym expansion is part of the
// production search path, so evaluate against a seeded synonym table.
async function seedSynonymsForEvaluation(): Promise<void> {
  for (const seed of SEED_SYNONYMS) {
    await db.synonym.upsert({
      where: { source: seed.source },
      create: {
        source: seed.source,
        targets: JSON.stringify(seed.targets),
        category: seed.category,
        origin: seed.origin ?? "manual",
        enabled: true,
        autoMeta: seed.autoMeta ? JSON.stringify(seed.autoMeta) : null,
      },
      update: {
        targets: JSON.stringify(seed.targets),
        category: seed.category,
      },
    });
  }
}

interface QualityCase {
  id: string;
  lang: "ko" | "vi" | "mn" | "en";
  question: string;
  expectedDocIds: string[];
  expectedRefusal: boolean;
  expectedCostFormat: "none" | "itemized-krw";
}

const datasetPath = "quality/multilingual-eval-cases.json";
if (!/^postgres(?:ql)?:\/\//i.test(process.env.DATABASE_URL || "")) {
  throw new Error("quality dataset evaluation requires DATABASE_URL=postgresql://...");
}

const cases = JSON.parse(readFileSync(datasetPath, "utf-8")) as QualityCase[];

function validateSchema(testCase: QualityCase): string[] {
  const errors: string[] = [];
  if (!testCase.id) errors.push("missing id");
  if (!["ko", "vi", "mn", "en"].includes(testCase.lang)) errors.push("invalid lang");
  if (!testCase.question?.trim()) errors.push("missing question");
  if (!Array.isArray(testCase.expectedDocIds) || testCase.expectedDocIds.length === 0) {
    errors.push("expectedDocIds must not be empty");
  }
  if (typeof testCase.expectedRefusal !== "boolean") errors.push("expectedRefusal must be boolean");
  if (!["none", "itemized-krw"].includes(testCase.expectedCostFormat)) {
    errors.push("invalid expectedCostFormat");
  }
  if (testCase.expectedRefusal && !testCase.expectedDocIds.some((id) => id.includes("warning"))) {
    errors.push("expectedRefusal cases should target a warning/refusal doc");
  }
  if (testCase.expectedCostFormat === "itemized-krw" && !testCase.expectedDocIds.includes("cost-breakdown")) {
    errors.push("itemized-krw cases should target cost-breakdown");
  }
  return errors;
}

async function main() {
  console.log("=".repeat(80));
  console.log("KAXI multilingual quality dataset");
  console.log("=".repeat(80));

  await seedSynonymsForEvaluation();
  await ingestStaticKnowledgeDocsForPgvector();
  await embedMissingKnowledgeChunksForPgvector();
  const pgStats = await getPgvectorStats();

  initVectorStore();
  const stats = getStoreStats();
  console.log(`Cases: ${cases.length}`);
  console.log(`Store: ${stats.method}, docs=${stats.docCount}, dim=${stats.tfidfDim}`);
  console.log(`pgvector: docs=${pgStats.approvedDocuments}, chunks=${pgStats.approvedEmbeddedChunks}/${pgStats.totalChunks}, dim=${pgStats.embeddingDim}`);

  const langs = new Set(cases.map((item) => item.lang));
  for (const lang of ["ko", "vi", "mn", "en"] as const) {
    if (!langs.has(lang)) throw new Error(`Missing quality cases for ${lang}`);
  }

  let pass = 0;
  const failures: string[] = [];

  for (const testCase of cases) {
    const schemaErrors = validateSchema(testCase);
    if (schemaErrors.length > 0) {
      failures.push(`${testCase.id}: ${schemaErrors.join(", ")}`);
      continue;
    }

    const results = await hybridSearch(testCase.question, { topK: 5 });
    const ids = results.map((result) => result.doc.id);
    const docHit = testCase.expectedDocIds.some((expected) => ids.includes(expected));

    if (docHit) {
      pass++;
      console.log(`[PASS] ${testCase.id}: ${ids.join(", ")}`);
    } else {
      failures.push(`${testCase.id}: expected ${testCase.expectedDocIds.join("|")} in ${ids.join(", ") || "(none)"}`);
      console.log(`[FAIL] ${testCase.id}: ${ids.join(", ") || "(none)"}`);
    }
  }

  const recallAt5 = pass / cases.length;
  console.log(`\nResult: ${pass}/${cases.length} cases matched expected docs`);
  console.log(`Recall@5: ${recallAt5.toFixed(3)}`);
  if (failures.length > 0 || recallAt5 < 0.85) {
    console.error("\nFailures:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
