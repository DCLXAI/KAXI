// 사전 임베딩 캐싱 스크립트
// 현재 운영 검색 대상 KnowledgeDoc에 대해 Transformer 임베딩을 미리 생성하여 캐시 파일에 저장
// 이후 런타임에서는 캐시에서 즉시 로드 (수 초 절약)
// 실행: bun run /home/z/my-project/scripts/precompute-embeddings.ts

import { getKnowledgeDocsWithMetadata } from "../src/lib/data/knowledge";
import { initTransformerStore, getStoreStats } from "../src/lib/embeddings/vector-store";

async function main() {
  console.log("=".repeat(60));
  console.log("사전 임베딩 캐싱 스크립트");
  console.log("=".repeat(60));

  const docs = getKnowledgeDocsWithMetadata();
  console.log(`\n📚 Active knowledge docs: ${docs.length}개`);
  console.log(docs.map((d) => `   - ${d.id}: ${d.title.ko}`).join("\n"));

  console.log("\n🔧 Transformer 모델 로드 + 문서 임베딩 시작...");
  console.log("(첫 실행시 모델 다운로드 + 모든 문서 임베딩 — 1~3분 소요)\n");

  const t0 = Date.now();
  await initTransformerStore();
  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);

  const stats = getStoreStats();
  console.log(`\n✅ 완료 (${elapsed}s)`);
  console.log("\n📊 Vector Store 상태:");
  console.log(`   - Method: ${stats.method}`);
  console.log(`   - Doc count: ${stats.docCount}`);
  console.log(`   - Transformer available: ${stats.transformerAvailable}`);
  console.log(`   - Transformer coverage: ${stats.transformerCoverage}/${stats.docCount}`);
  console.log(`   - Transformer dim: ${stats.transformerDim}`);
  console.log(`   - TF-IDF dim: ${stats.tfidfDim}`);

  if (stats.transformerCoverage === stats.docCount) {
    console.log("\n🎉 모든 문서가 Transformer 임베딩으로 커버됨 — 캐시 파일에 저장됨");
    console.log("   런타임에서는 캐시에서 즉시 로드 (수 초 절약)");
  } else {
    console.log("\n⚠️ 일부 문서가 Transformer 임베딩 누락 — TF-IDF 폴백 사용");
  }
}

main().catch((e) => {
  console.error("❌ 오류:", e);
  process.exit(1);
});
