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
  { q: "강남구 외국인등록은 어느 출입국 관할이야?", expect: "moj-office-jurisdiction-seoul-incheon-gyeonggi" },
  { q: "원주 이동출입국사무소 운영 여부는 어디서 확인해?", expect: "moj-mobile-immigration-office" },
  { q: "C-3 단기방문으로 일해도 돼?", expect: "immigration-decree-short-term-status-table" },
  { q: "F-5 영주권 기본 법령 요건은 뭐야?", expect: "immigration-decree-permanent-residence-table" },
  { q: "한국에서 태어난 외국인 아이 체류자격 부여는 언제까지 해야 해?", expect: "immigration-act-status-grant" },
  { q: "D-4에서 D-2로 체류자격 변경하려면 법적으로 허가가 필요해?", expect: "immigration-act-status-change" },
  { q: "비자 만료 전에 체류기간 연장허가 받아야 해?", expect: "immigration-act-stay-extension" },
  { q: "입국 후 외국인등록은 언제까지 해야 해?", expect: "immigration-act-alien-registration" },
  { q: "여권 갱신하면 외국인등록사항 변경신고 해야 해?", expect: "immigration-act-registration-change-report" },
  { q: "이사했는데 체류지 변경신고 기한은?", expect: "immigration-act-address-change-report" },
  { q: "재입국허가 기간 안에 못 들어가면 어떻게 해?", expect: "immigration-act-reentry-permit" },
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
