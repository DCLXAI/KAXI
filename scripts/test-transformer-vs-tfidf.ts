// Transformer vs TF-IDF 검색 품질 비교
// 실제 API를 호출하여 searchMeta 추출 후 비교

const API_URL = "http://localhost:3000/api/ai/chat";

interface SearchMeta {
  id: string;
  title: string;
  score: number;
  vectorScore: number;
  keywordScore: number;
  matchedKeywords: string[];
  method: string;
}

interface ApiResponse {
  answer: string;
  source: string;
  retrievedDocs: { id: string; title: string }[];
  searchMeta: SearchMeta[];
  storeStats: {
    method: string;
    transformerAvailable: boolean;
    transformerCoverage: number;
    docCount: number;
  };
}

// 고품질 검색을 기대하는 테스트 케이스
const TESTS = [
  // 1. 의미적 질문 (키워드 매칭 어려움)
  { q: "한국에서 얼마나 돈이 필요해요?", lang: "ko", expect: "cost-breakdown" },
  { q: "비자 거절당했는데 어떡해요?", lang: "ko", expect: "visa-guarantee-warning" },
  { q: "브로커가 너무 비싸게 요구해요", lang: "ko", expect: "broker-redflags" },
  { q: "어학당 끝나고 대학교 가려면 뭐 해야해요", lang: "ko", expect: "d-4-to-d-2-transfer" },
  { q: "허위 잔고증명 쓰면 어떻게 되나요", lang: "ko", expect: "fake-documents-warning" },
  { q: "I want to study Korean language, what visa?", lang: "en", expect: "d4-overview" },
  { q: "Tôi muốn học tiếng Hàn thì xin visa gì?", lang: "vi", expect: "d4-overview" },
  { q: "Солонгос хэл сурахыг хүсч байна, ямар виз вэ?", lang: "mn", expect: "d4-overview" },
  // 2. 직접 키워드 질문
  { q: "D-2 비자 서류", lang: "ko", expect: "visa-documents" },
  { q: "결핵진단서 필요?", lang: "ko", expect: "tuberculosis-test" },
  { q: "TOPIK 몇급 필요해요?", lang: "ko", expect: "topik-requirement" },
  { q: "표준입학허가서 뭐예요?", lang: "ko", expect: "standard-admission" },
];

async function callApi(question: string, lang: string): Promise<ApiResponse> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, lang, history: [] }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return (await res.json()) as ApiResponse;
}

async function main() {
  console.log("=".repeat(70));
  console.log("Transformer (multilingual-e5-small) vs TF-IDF 검색 품질 비교");
  console.log("=".repeat(70));

  // 첫 호출로 모델 로드 + 스토어 초기화
  console.log("\n🔧 워밍업: 첫 API 호출로 모델 로드...");
  const warmup = await callApi("워밍업", "ko");
  console.log(`   Store method: ${warmup.storeStats.method}`);
  console.log(`   Transformer available: ${warmup.storeStats.transformerAvailable}`);
  console.log(`   Transformer coverage: ${warmup.storeStats.transformerCoverage}/${warmup.storeStats.docCount}`);

  console.log("\n" + "=".repeat(70));
  console.log("테스트 결과");
  console.log("=".repeat(70));

  let pass = 0;
  let total = TESTS.length;
  let transformerUsed = 0;

  for (const test of TESTS) {
    console.log(`\n🔍 [${test.lang}] ${test.q}`);
    console.log(`   기대 문서: ${test.expect}`);

    const t0 = Date.now();
    const res = await callApi(test.q, test.lang);
    const elapsed = Date.now() - t0;

    const top = res.searchMeta[0];
    if (!top) {
      console.log(`   ❌ 검색 결과 없음 (${elapsed}ms)`);
      continue;
    }

    const isPass = top.id === test.expect;
    if (isPass) pass++;
    if (top.method === "transformer") transformerUsed++;

    console.log(
      `   ${isPass ? "✅" : "❌"} Top: ${top.id} (score: ${top.score}, vec: ${top.vectorScore}, kw: ${top.keywordScore}, method: ${top.method}) [${elapsed}ms]`
    );
    if (res.searchMeta.length > 1) {
      console.log(
        `   📋 Others: ${res.searchMeta
          .slice(1)
          .map((m) => `${m.id}(${m.score})`)
          .join(", ")}`
      );
    }
    // 답변 미리보기
    console.log(`   💬 ${res.answer.substring(0, 100).replace(/\n/g, " ")}...`);
  }

  console.log("\n" + "=".repeat(70));
  console.log("최종 요약");
  console.log("=".repeat(70));
  console.log(`   정확도: ${pass}/${total} (${Math.round((pass / total) * 100)}%)`);
  console.log(`   Transformer 사용: ${transformerUsed}/${total}`);
  console.log(`   Store method: ${warmup.storeStats.method}`);

  if (pass === total) {
    console.log("\n🎉 모든 테스트 통과 — Transformer 기반 의미 검색 정상 동작");
  } else if (pass >= total - 2) {
    console.log("\n✅ 대부분 통과 — 일부 케이스는 추가 튜닝 필요");
  } else {
    console.log("\n⚠️ 정확도 개선 필요");
  }
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
