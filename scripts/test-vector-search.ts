// Vector Search smoke test
// Run: bun run scripts/test-vector-search.ts

import { getKnowledgeDocsWithMetadata } from "../src/lib/data/knowledge";
import { getStoreStats, hybridSearch, initVectorStore } from "../src/lib/embeddings/vector-store";
import { withImmigrationLegalBasisDocs } from "../src/lib/knowledge/legal-basis";
import {
  getPgvectorStats,
  ingestStaticKnowledgeDocsForPgvector,
  embedMissingKnowledgeChunksForPgvector,
} from "../src/lib/embeddings/pgvector-rag";

if (!/^postgres(?:ql)?:\/\//i.test(process.env.DATABASE_URL || "")) {
  throw new Error("vector search smoke test requires DATABASE_URL=postgresql://...");
}

const TEST_QUERIES = [
  { q: "D-2 비자 서류", expect: "visa-documents" },
  { q: "졸업 후 한국에서 구직하려면 D-10 체류자격은 어떤 경우에 검토하나요?", expect: "d10-overview" },
  { q: "한국에서 얼마나 돈이 필요해요?", expect: "cost-breakdown" },
  { q: "허위 잔고증명 쓰면 어떻게 되나요", expect: "fake-documents-warning" },
  { q: "I want to study Korean language, what visa?", expect: "d4-overview" },
  { q: "Tôi muốn học tiếng Hàn thì xin visa gì?", expect: "d4-overview" },
  { q: "강남구 외국인등록은 어느 출입국 관할이야?", expect: "moj-office-jurisdiction-seoul-incheon-gyeonggi" },
  { q: "원주 이동출입국사무소 운영 여부는 어디서 확인해?", expect: "moj-mobile-immigration-office" },
  { q: "C-3 단기방문으로 일해도 돼?", expect: "immigration-decree-short-term-status-table" },
  { q: "F-5 영주권 기본 법령 요건은 뭐야?", expect: "immigration-decree-permanent-residence-table" },
  { q: "단기체류자격과 장기체류자격은 90일 기준으로 어떻게 달라?", expect: "immigration-act-general-stay-status" },
  { q: "F-5 영주자격은 활동범위와 체류기간 제한을 받지 않아?", expect: "immigration-act-permanent-residence-status" },
  { q: "무사증 입국도 유효한 여권과 사증 예외 요건을 확인해야 해?", expect: "immigration-act-visa-passport-requirement" },
  { q: "사증발급인정서는 초청인이 대리 신청할 수 있어?", expect: "immigration-act-visa-issuance-certificate" },
  { q: "과거 강제퇴거 이력이 있으면 입국금지 사유가 될 수 있어?", expect: "immigration-act-entry-ban" },
  { q: "입국심사에서 입국목적과 체류자격을 확인해?", expect: "immigration-act-entry-inspection" },
  { q: "취업 가능한 체류자격이 아니어도 한국에서 일할 수 있어?", expect: "immigration-act-employment-restriction" },
  { q: "E-7 직원이 퇴직하거나 고용계약이 바뀌면 고용주가 15일 안에 신고해야 해?", expect: "immigration-act-employer-reporting-duty" },
  { q: "D-2 유학생이 휴학하거나 제적되면 학교가 출입국에 신고해야 해?", expect: "immigration-act-student-management-reporting" },
  { q: "D-2 유학생이 아르바이트하려면 체류자격외활동허가가 필요해?", expect: "immigration-act-outside-status-activity" },
  { q: "E-7 근무처를 바꾸거나 추가하면 허가나 신고가 필요해?", expect: "immigration-act-workplace-change-addition" },
  { q: "법무부가 외국인의 활동범위나 거소를 제한할 수 있어?", expect: "immigration-act-activity-scope-restriction" },
  { q: "비자 허가 신청에 허위서류를 내거나 알선하면 어떻게 돼?", expect: "immigration-act-false-application-documents" },
  { q: "한국에서 태어난 외국인 아이 체류자격 부여는 언제까지 해야 해?", expect: "immigration-act-status-grant" },
  { q: "D-4에서 D-2로 체류자격 변경하려면 법적으로 허가가 필요해?", expect: "immigration-act-status-change" },
  { q: "비자 만료 전에 체류기간 연장허가 받아야 해?", expect: "immigration-act-stay-extension" },
  { q: "가정폭력 피해 결혼이민자는 권리구제 절차 중 체류기간 연장이 가능해?", expect: "immigration-act-marriage-immigrant-extension-special" },
  { q: "국경 폐쇄나 장기 항공편 중단으로 출국할 수 없으면 직권 연장이 가능해?", expect: "immigration-act-emergency-extension-special" },
  { q: "외국인이 한국에서 나갈 때 출국심사와 유효한 여권 확인이 필요해?", expect: "immigration-act-departure-inspection" },
  { q: "범죄수사나 세금 체납 때문에 외국인 출국정지가 될 수 있어?", expect: "immigration-act-departure-suspension" },
  { q: "입국 후 외국인등록은 언제까지 해야 해?", expect: "immigration-act-alien-registration" },
  { q: "여권 갱신하면 외국인등록사항 변경신고 해야 해?", expect: "immigration-act-registration-change-report" },
  { q: "이사했는데 체류지 변경신고 기한은?", expect: "immigration-act-address-change-report" },
  { q: "출국할 때 외국인등록증을 반납해야 해?", expect: "immigration-act-arc-return-duty" },
  { q: "외국인등록 때 지문이나 얼굴 생체정보 제공을 거부하면 연장이 안 될 수 있어?", expect: "immigration-act-biometric-information-duty" },
  { q: "무허가취업이나 허위서류가 강제퇴거 사유가 될 수 있어?", expect: "immigration-act-deportation-grounds" },
  { q: "출입국에서 보호명령서 없이 긴급보호하면 48시간 안에 명령서를 받아야 해?", expect: "immigration-act-detention-order" },
  { q: "강제퇴거명령서를 받으면 이의신청은 7일 안에 해야 해?", expect: "immigration-act-deportation-objection" },
  { q: "강제퇴거명령 후 보호소에 얼마나 보호될 수 있어?", expect: "immigration-act-deportation-detention" },
  { q: "보호소에서 보호 일시해제를 신청하면 보증금이나 정기보고 조건이 붙을 수 있어?", expect: "immigration-act-detention-temporary-release" },
  { q: "출국권고를 받고도 안 나가면 출국명령이나 강제퇴거로 갈 수 있어?", expect: "immigration-act-departure-recommendation-order" },
  { q: "거짓으로 비자 연장허가를 받으면 체류허가가 취소되고 7일 전 출석통지를 받아야 해?", expect: "immigration-act-permit-cancellation-change" },
  { q: "재입국허가 기간 안에 못 들어가면 어떻게 해?", expect: "immigration-act-reentry-permit" },
];

const LEGAL_BASIS_ORDER_QUERIES = [
  { q: "출입국에서 보호명령서 없이 긴급보호하면 48시간 안에 명령서를 받아야 해?", mode: "appeal", expectFirst: "immigration-act-detention-order" },
  { q: "강제퇴거명령서를 받으면 이의신청은 7일 안에 해야 해?", mode: "appeal", expectFirst: "immigration-act-deportation-objection" },
  { q: "강제퇴거명령 후 보호소에 얼마나 보호될 수 있어?", mode: "appeal", expectFirst: "immigration-act-deportation-detention" },
  { q: "보호소에서 보호 일시해제를 신청하면 보증금이나 정기보고 조건이 붙을 수 있어?", mode: "appeal", expectFirst: "immigration-act-detention-temporary-release" },
  { q: "출국권고를 받고도 안 나가면 출국명령이나 강제퇴거로 갈 수 있어?", mode: "appeal", expectFirst: "immigration-act-departure-recommendation-order" },
  { q: "거짓으로 비자 연장허가를 받으면 체류허가가 취소되고 7일 전 출석통지를 받아야 해?", mode: "visa", expectFirst: "immigration-act-permit-cancellation-change" },
];

async function main() {
  console.log("=".repeat(80));
  console.log("KAXI - Vector Search smoke test");
  console.log("=".repeat(80));

  await ingestStaticKnowledgeDocsForPgvector();
  await embedMissingKnowledgeChunksForPgvector();
  const pgStats = await getPgvectorStats();
  if (pgStats.approvedDocuments <= 0 || pgStats.approvedEmbeddedChunks <= 0) {
    throw new Error(`pgvector knowledge index is empty: ${JSON.stringify(pgStats)}`);
  }

  initVectorStore();
  const stats = getStoreStats();
  console.log(`Docs: ${stats.docCount}/${getKnowledgeDocsWithMetadata().length}`);
  console.log(`Method: ${stats.method}`);
  console.log(`pgvector: docs=${pgStats.approvedDocuments}, chunks=${pgStats.approvedEmbeddedChunks}/${pgStats.totalChunks}, dim=${pgStats.embeddingDim}`);
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

  const recallAt3 = pass / TEST_QUERIES.length;
  console.log(`\nResult: ${pass}/${TEST_QUERIES.length} expected docs found`);
  console.log(`Recall@3: ${recallAt3.toFixed(3)}`);
  let orderPass = 0;
  for (const test of LEGAL_BASIS_ORDER_QUERIES) {
    const results = await hybridSearch(test.q, { topK: 6 });
    const docs = withImmigrationLegalBasisDocs(
      test.q,
      results.map((result) => result.doc),
      { mode: test.mode, maxDocs: 8 }
    );
    const first = docs[0]?.id || "(none)";
    const ok = first === test.expectFirst;
    if (ok) orderPass++;

    console.log(`\n[${ok ? "PASS" : "WARN"}] legal basis first: ${test.q}`);
    console.log(`Expected first: ${test.expectFirst}`);
    console.log(`Actual first: ${first}`);
  }

  const legalOrderRecall = orderPass / LEGAL_BASIS_ORDER_QUERIES.length;
  console.log(`\nLegal basis order: ${orderPass}/${LEGAL_BASIS_ORDER_QUERIES.length} first-doc checks passed`);
  console.log(`Legal basis first-doc accuracy: ${legalOrderRecall.toFixed(3)}`);
  if (recallAt3 < 0.85 || legalOrderRecall < 0.85) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
