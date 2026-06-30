// Vector Search smoke test
// Run: bun run scripts/test-vector-search.ts

import { join } from "path";
import { getKnowledgeDocsWithMetadata } from "../src/lib/data/knowledge";
import { getStoreStats, hybridSearch, initVectorStore } from "../src/lib/embeddings/vector-store";

if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("/home/z/")) {
  process.env.DATABASE_URL = `file:${join(process.cwd(), "db", "custom.db")}`;
}

const TEST_QUERIES = [
  { q: "D-2 비자 서류", expect: "visa-documents" },
  { q: "한국에서 얼마나 돈이 필요해요?", expect: "cost-breakdown" },
  { q: "허위 잔고증명 쓰면 어떻게 되나요", expect: "fake-documents-warning" },
  { q: "I want to study Korean language, what visa?", expect: "d4-overview" },
  { q: "Tôi muốn học tiếng Hàn thì xin visa gì?", expect: "d4-overview" },
];

async function main() {
  console.log("=".repeat(80));
  console.log("KAXI - Vector Search smoke test");
  console.log("=".repeat(80));

  initVectorStore();
  const stats = getStoreStats();
  console.log(`Docs: ${stats.docCount}/${getKnowledgeDocsWithMetadata().length}`);
  console.log(`Method: ${stats.method}`);
  console.log(`TF-IDF dim: ${stats.tfidfDim}`);
  console.log(`Transformer coverage: ${stats.transformerCoverage}/${stats.docCount}`);

  let pass = 0;
  for (const test of TEST_QUERIES) {
    const results = await hybridSearch(test.q, { topK: 3 });
    const ids = results.map((r) => r.doc.id);
    const ok = ids.includes(test.expect);
    if (ok) pass++;

    console.log(`\n[${ok ? "PASS" : "WARN"}] ${test.q}`);
    console.log(`Expected: ${test.expect}`);
    console.log(
      `Results: ${
        results.length
          ? results.map((r) => `${r.doc.id}(${r.score.toFixed(3)})`).join(", ")
          : "(none)"
      }`
    );
  }

  console.log(`\nResult: ${pass}/${TEST_QUERIES.length} expected docs found`);
  if (pass < TEST_QUERIES.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
