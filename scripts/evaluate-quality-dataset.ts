import { readFileSync } from "fs";
import { join } from "path";
import { hybridSearch, initVectorStore, getStoreStats } from "../src/lib/embeddings/vector-store";

interface QualityCase {
  id: string;
  lang: "ko" | "vi" | "mn" | "en";
  question: string;
  expectedDocIds: string[];
  expectedRefusal: boolean;
  expectedCostFormat: "none" | "itemized-krw";
}

const datasetPath = join(process.cwd(), "quality", "multilingual-eval-cases.json");
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("/home/z/")) {
  process.env.DATABASE_URL = `file:${join(process.cwd(), "db", "custom.db")}`;
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

  initVectorStore();
  const stats = getStoreStats();
  console.log(`Cases: ${cases.length}`);
  console.log(`Store: ${stats.method}, docs=${stats.docCount}, dim=${stats.tfidfDim}`);

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

  console.log(`\nResult: ${pass}/${cases.length} cases matched expected docs`);
  if (failures.length > 0) {
    console.error("\nFailures:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
