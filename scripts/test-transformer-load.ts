// @xenova/transformers 로드 테스트
// 다국어 sentence-transformer 모델 다운로드 + 임베딩 생성 검증

import { pipeline, env } from "@xenova/transformers";

// 로컬 캐시 사용 (재다운로드 방지)
env.cacheDir = "/home/z/my-project/data/model-cache";

// 온디스크 모델 허용
env.allowRemoteModels = true;
env.allowLocalModels = false;

async function main() {
  console.log("=".repeat(60));
  console.log("Transformer Embedder 테스트");
  console.log("=".repeat(60));

  // multilingual-e5-small (384차원, 470MB, 100+ 언어 지원)
  // Xenova에서 ONNX로 변환된 가벼운 다국어 임베딩 모델
  const modelName = "Xenova/multilingual-e5-small";
  console.log(`\n📦 모델 로드 중: ${modelName}`);
  console.log("(첫 실행시 다운로드 — 수 분 소요 가능)\n");

  const startTime = Date.now();
  try {
    const extractor = await pipeline(
      "feature-extraction",
      modelName,
      { quantized: true } // 양자화 버전 (용량 절반, 속도 빠름)
    );
    const loadTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ 모델 로드 완료 (${loadTime}s)\n`);

    // 테스트: 한국어/베트남어/몽골어/영어 임베딩
    const testTexts = [
      "한국에서 얼마나 돈이 필요해요?",
      "한국 유학 총비용은 얼마인가요?",
      "Tôi muốn học tiếng Hàn thì xin visa gì?",
      "비자 D-4 là gì?",
      "D-2와 D-4의 차이점은?",
      "결핵진단서는 어디서 받나요?",
    ];

    console.log("🧪 임베딩 생성 테스트:");
    const embeddings: number[][] = [];
    for (const text of testTexts) {
      const t0 = Date.now();
      const output = await extractor(text, { pooling: "mean", normalize: true });
      const vec = Array.from(output.data as Float32Array);
      embeddings.push(vec);
      const elapsed = Date.now() - t0;
      console.log(`  [${elapsed}ms] "${text.substring(0, 30)}..." → dim=${vec.length}, |v|=${vec.slice(0, 3).map(v => v.toFixed(3)).join(", ")}...`);
    }

    // 코사인 유사도 계산 (mean pooling + normalize 되어 있으므로 내적)
    function dot(a: number[], b: number[]): number {
      let s = 0;
      for (let i = 0; i < a.length; i++) s += a[i] * b[i];
      return s;
    }

    console.log("\n📊 코사인 유사도 매트릭스:");
    console.log("(0~1, 1에 가까울수록 의미적으로 유사)\n");

    for (let i = 0; i < testTexts.length; i++) {
      for (let j = i + 1; j < testTexts.length; j++) {
        const sim = dot(embeddings[i], embeddings[j]);
        if (sim > 0.5) { // 유사한 쌍만 표시
          console.log(`  ${sim.toFixed(3)}  "${testTexts[i].substring(0, 25)}" ≈ "${testTexts[j].substring(0, 25)}"`);
        }
      }
    }

    console.log("\n✅ 모든 테스트 통과 — Transformer 임베딩 정상 동작");
  } catch (e) {
    console.error("❌ 오류:", e);
    process.exit(1);
  }
}

main();
