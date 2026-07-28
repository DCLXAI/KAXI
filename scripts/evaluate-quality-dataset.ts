import { readFileSync } from "fs";
import {
  embedMissingKnowledgeChunksForPgvector,
  getPgvectorStats,
  ingestStaticKnowledgeDocsForPgvector,
} from "../src/lib/embeddings/pgvector-rag";
import {
  searchSharedOpenAiRag,
  sharedOpenAiRagRuntimeInfo,
} from "../src/lib/chat/shared-openai-rag";

interface QualityCase {
  id: string;
  lang: "ko" | "vi" | "mn" | "en";
  question: string;
  expectedDocIds: string[];
  expectedRefusal: boolean;
  expectedCostFormat: "none" | "itemized-krw";
}

const datasetPath = "quality/multilingual-eval-cases.json";

// This dataset now scores the SAME retrieval path production requests use:
// searchSharedOpenAiRag -> OpenAI 1536d query embedding + Supabase hybrid_v3
// (the core behind /api/typebot-rag, the agent, and consult). That path needs a
// live Postgres knowledge store, the OpenAI embedding key, and the Supabase
// serving credentials, so this stays an opt-in integration run rather than a
// unit test — it is not expected to execute in the standard local/CI gates.
if (!/^postgres(?:ql)?:\/\//i.test(process.env.DATABASE_URL || "")) {
  throw new Error("quality dataset evaluation requires DATABASE_URL=postgresql://...");
}

const ragRuntime = sharedOpenAiRagRuntimeInfo();
if (!ragRuntime.ready) {
  const missing = [
    ragRuntime.embeddingConfigured ? null : "an OpenAI embedding key",
    ragRuntime.supabaseConfigured
      ? null
      : "Supabase serving credentials (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)",
  ]
    .filter(Boolean)
    .join(" and ");
  throw new Error(
    `quality dataset evaluation requires the OpenAI + Supabase RAG runtime; missing ${missing}`,
  );
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

  await ingestStaticKnowledgeDocsForPgvector();
  await embedMissingKnowledgeChunksForPgvector();
  const pgStats = await getPgvectorStats();

  console.log(`Cases: ${cases.length}`);
  console.log(
    `Retrieval: ${ragRuntime.method}, model=${ragRuntime.embeddingModel}, dim=${ragRuntime.embeddingDimensions}, fn=${ragRuntime.vectorFunction}`,
  );
  console.log(
    `pgvector: docs=${pgStats.approvedDocuments}, chunks=${pgStats.approvedEmbeddedChunks}/${pgStats.totalChunks}, dim=${pgStats.embeddingDim}`,
  );

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

    const sharedRag = await searchSharedOpenAiRag({
      query: testCase.question,
      locale: testCase.lang,
      maxDocuments: 5,
    });
    const ids = sharedRag.docs.map((doc) => doc.id);
    const docHit = testCase.expectedDocIds.some((expected) => ids.includes(expected));

    if (docHit) {
      pass++;
      console.log(`[PASS] ${testCase.id}: ${ids.join(", ")}`);
    } else {
      failures.push(`${testCase.id}: expected ${testCase.expectedDocIds.join("|")} in ${ids.join(", ") || "(none)"}`);
      console.log(`[FAIL] ${testCase.id}: ${ids.join(", ") || "(none)"}`);
    }
  }

  // Recall@5: fraction of cases for which at least one expectedDocId appears in
  // the top-5 documents the shared OpenAI/Supabase retrieval returned.
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
