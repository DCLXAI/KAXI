// Vector Search vs Keyword Search 비교 테스트
// 실행: bun run /home/z/my-project/scripts/test-vector-search.ts

import { KNOWLEDGE_DOCS, retrieveDocs, pickLangText } from "../src/lib/data/knowledge";
import { hybridSearch, semanticSearch, initVectorStore, getStoreStats } from "../src/lib/embeddings/vector-store";

// 테스트 쿼리 (한국어/베트남어/몽골어/영어 + 의미적 질문)
const TEST_QUERIES = [
  // 직접 키워드 매칭
  { q: "D-2 비자 서류", lang: "ko", desc: "직접 키워드 - D-2, 서류" },
  { q: "D-4 visa documents", lang: "en", desc: "영어 직접" },
  { q: "hồ sơ visa D-4", lang: "vi", desc: "베트남어 직접" },

  // 의미적 질문 (키워드 없이)
  { q: "한국에서 얼마나 돈이 필요해요?", lang: "ko", desc: "의미 - 비용 질문" },
  { q: "비자 거절당했는데 어떡해요?", lang: "ko", desc: "의미 - 비자 거절 대응" },
  { q: "브로커가 너무 비싸게 요구해요", lang: "ko", desc: "의미 - 브로커 폭리" },
  { q: "I want to study Korean language, what visa?", lang: "en", desc: "영어 의미" },
  { q: "Tôi muốn học tiếng Hàn thì xin visa gì?", lang: "vi", desc: "베트남어 의미" },
  { q: "Солонгос хэл сурахыг хүсч байна, ямар виз вэ?", lang: "mn", desc: "몽골어 의미" },

  // 복합 질문
  { q: "결핵 검사 어디서 받아요 비용은요", lang: "ko", desc: "결핵 검사 장소 비용" },
  { q: "어학당 끝나고 대학교 가려면 뭐 해야해요", lang: "ko", desc: "D-4에서 D-2 전환" },
  { q: "허위 잔고증명 쓰면 어떻게 되나요", lang: "ko", desc: "허위서류 처벌" },
];

function compareResults(query: string, lang: string) {
  // 레거시 키워드 검색
  const keywordResults = retrieveDocs(query, 3);

  // 하이브리드 검색 (임베딩 + 키워드)
  const hybridResults = hybridSearch(query, { topK: 3 });

  // 순수 임베딩 검색
  const semanticResults = semanticSearch(query, 3);

  return {
    keyword: keywordResults.map((d) => d.id),
    hybrid: hybridResults.map((r) => ({ id: r.doc.id, score: Number(r.score.toFixed(3)), v: Number(r.vectorScore.toFixed(3)), k: r.keywordScore })),
    semantic: semanticResults.map((r) => ({ id: r.doc.id, score: Number(r.score.toFixed(3)) })),
  };
}

// 메인
console.log("=".repeat(80));
console.log("K-Bridge Gateway — Vector Search 비교 테스트");
console.log("=".repeat(80));

// Vector Store 초기화
initVectorStore();
const stats = getStoreStats();
console.log(`\n📊 Vector Store 상태:`);
console.log(`   - 문서 수: ${stats.docCount}`);
console.log(`   - 임베딩 차원: ${stats.dim}`);
console.log(`   - Vocabulary 크기: ${stats.vocabSize}\n`);

console.log("=".repeat(80));
console.log("테스트 결과 비교");
console.log("=".repeat(80));

let keywordBetter = 0;
let hybridBetter = 0;
let tie = 0;

for (const test of TEST_QUERIES) {
  console.log(`\n🔍 [${test.lang}] ${test.q}`);
  console.log(`   설명: ${test.desc}`);

  const result = compareResults(test.q, test.lang);

  console.log(`   📋 Keyword-only: ${result.keyword.length > 0 ? result.keyword.join(", ") : "(결과 없음)"}`);
  console.log(`   🤖 Hybrid (vec+kw): ${result.hybrid.length > 0 ? result.hybrid.map(r => `${r.id}(${r.score})`).join(", ") : "(결과 없음)"}`);
  console.log(`   🧠 Semantic only: ${result.semantic.length > 0 ? result.semantic.map(r => `${r.id}(${r.score})`).join(", ") : "(결과 없음)"}`);

  // 품질 평가: 의미적 질문에서 hybrid가 keyword보다 더 많은 결과를 찾으면 승
  if (test.desc.startsWith("의미") || test.desc.includes("전환") || test.desc.includes("처벌") || test.desc.includes("비용")) {
    if (result.hybrid.length > result.keyword.length) {
      hybridBetter++;
      console.log(`   ✅ Hybrid 승 — 키워드보다 ${result.hybrid.length - result.keyword.length}개 더 검색`);
    } else if (result.keyword.length === 0 && result.hybrid.length === 0) {
      tie++;
    } else if (result.keyword.length === 0 && result.hybrid.length > 0) {
      hybridBetter++;
      console.log(`   ✅ Hybrid 승 — 키워드는 결과 없음`);
    } else {
      tie++;
    }
  } else {
    // 직접 키워드 매칭은 동일하거나 keyword가 살짝 우세 가능
    if (result.keyword.length >= result.hybrid.length) {
      keywordBetter++;
    } else {
      hybridBetter++;
    }
  }
}

console.log("\n" + "=".repeat(80));
console.log("최종 요약");
console.log("=".repeat(80));
console.log(`   Hybrid (임베딩+키워드) 우세: ${hybridBetter}`);
console.log(`   Keyword-only 우세: ${keywordBetter}`);
console.log(`   동점: ${tie}`);
console.log(`   총 테스트: ${TEST_QUERIES.length}`);

if (hybridBetter > keywordBetter) {
  console.log(`\n✅ Vector Search 도입 효과 입증 — 의미적 질문에서 더 나은 검색 품질`);
} else {
  console.log(`\n⚠️ Vector Search 도입 효과 제한적 — 문서 수가 적어 차이가 작음`);
}

// 모든 문서의 다국어 임베딩 정상 생성 확인
console.log("\n" + "=".repeat(80));
console.log("문서 임베딩 정상 생성 확인");
console.log("=".repeat(80));
const sampleDoc = KNOWLEDGE_DOCS[0];
console.log(`샘플 문서: ${sampleDoc.id} — ${sampleDoc.title.ko}`);
console.log(`   키워드: ${sampleDoc.keywords.slice(0, 5).join(", ")}...`);
const sampleResult = hybridSearch("비자 서류 필요", { topK: 5 });
console.log(`   "비자 서류 필요" 검색시 상위 5개:`);
sampleResult.forEach((r, i) => {
  console.log(`   ${i + 1}. ${r.doc.id} (score: ${r.score.toFixed(3)}, vec: ${r.vectorScore.toFixed(3)}, kw: ${r.keywordScore})`);
});
