// Transformer 기반 다국어 Sentence Embedder
// @xenova/transformers + multilingual-e5-small (100+ 언어 지원, 384차원)
// TF-IDF 방식보다 의미적 유사도 파악에 훨씬 우수
// 폴백: 모델 로드 실패시 기존 vectorizer.ts 사용

import type { FeatureExtractionPipeline } from "@xenova/transformers";
import { vectorize as tfidfVectorize, type Vectorizer as TFIDFVectorizer } from "./vectorizer";
import * as path from "path";

const MODEL_NAME = "Xenova/multilingual-e5-small";
const EMBED_DIM = 384;

export type EmbeddingVector = Float32Array;

let extractorPromise: Promise<FeatureExtractionPipeline | null> | null = null;
let loadFailed = false;

type ModelCacheEnv = Partial<Record<"MODEL_CACHE_DIR" | "VERCEL" | "VERCEL_ENV", string | undefined>>;

export function resolveModelCacheDir(env: ModelCacheEnv = process.env): string {
  const configured = env.MODEL_CACHE_DIR?.trim();
  if (configured) return configured;

  if (env.VERCEL === "1" || env.VERCEL_ENV) {
    return path.join("/tmp", "kaxi-model-cache");
  }

  return path.join(process.cwd(), "data", "model-cache");
}

// 모델 lazy 로드 (싱글톤)
export async function getEmbedder(): Promise<FeatureExtractionPipeline | null> {
  if (loadFailed) return null;
  if (!extractorPromise) {
    extractorPromise = (async () => {
      try {
        const { pipeline, env } = await import("@xenova/transformers");
        env.cacheDir = resolveModelCacheDir();
        env.allowRemoteModels = process.env.TRANSFORMERS_ALLOW_REMOTE !== "false";
        env.allowLocalModels = process.env.TRANSFORMERS_ALLOW_LOCAL === "true";

        console.log(`[TransformerEmbedder] Loading model: ${MODEL_NAME}`);
        const t0 = Date.now();
        const extractor = await pipeline("feature-extraction", MODEL_NAME, {
          quantized: true,
        });
        console.log(`[TransformerEmbedder] Loaded in ${((Date.now() - t0) / 1000).toFixed(2)}s`);
        return extractor;
      } catch (e) {
        console.error("[TransformerEmbedder] Load failed, falling back to TF-IDF:", e);
        loadFailed = true;
        return null;
      }
    })();
  }
  return extractorPromise;
}

// 단일 텍스트 임베딩
export async function embedText(
  text: string,
  tfidfFallback?: { vectorizer: TFIDFVectorizer }
): Promise<{ vector: EmbeddingVector; method: "transformer" | "tfidf" }> {
  const extractor = await getEmbedder();

  if (extractor) {
    try {
      // E5 모델은 query/doc 접두사를 권장하나, short text에서는 생략해도 무방
      const output = await extractor(text, {
        pooling: "mean",
        normalize: true,
      });
      return {
        vector: new Float32Array(output.data as Float32Array),
        method: "transformer",
      };
    } catch (e) {
      console.error("[TransformerEmbedder] embedText error:", e);
    }
  }

  // TF-IDF 폴백
  if (tfidfFallback) {
    const v = tfidfVectorize(text, tfidfFallback.vectorizer);
    return {
      vector: new Float32Array(v),
      method: "tfidf",
    };
  }

  throw new Error("No embedding method available");
}

// 배치 임베딩 (문서 컬렉션)
export async function embedBatch(
  texts: string[],
  tfidfFallback?: { vectorizer: TFIDFVectorizer }
): Promise<{ vectors: EmbeddingVector[]; method: "transformer" | "tfidf" }> {
  const extractor = await getEmbedder();

  if (extractor) {
    try {
      const vectors: EmbeddingVector[] = [];
      // 배치 처리 (한번에 너무 많이 호출시 메모리 부담)
      const batchSize = 4;
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        for (const text of batch) {
          const output = await extractor(text, {
            pooling: "mean",
            normalize: true,
          });
          vectors.push(new Float32Array(output.data as Float32Array));
        }
      }
      return { vectors, method: "transformer" };
    } catch (e) {
      console.error("[TransformerEmbedder] embedBatch error:", e);
    }
  }

  // TF-IDF 폴백
  if (tfidfFallback) {
    const vectors = texts.map((t) => new Float32Array(tfidfVectorize(t, tfidfFallback.vectorizer)));
    return { vectors, method: "tfidf" };
  }

  throw new Error("No embedding method available");
}

// 두 임베딩의 코사인 유사도 (이미 정규화되어 내적)
export function cosineSim(a: EmbeddingVector, b: EmbeddingVector): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

export function getEmbedDim(): number {
  return EMBED_DIM;
}

export function isTransformerAvailable(): boolean {
  if (process.env.TRANSFORMERS_ALLOW_REMOTE === "false" && process.env.TRANSFORMERS_ALLOW_LOCAL !== "true") {
    return false;
  }
  return !loadFailed;
}

// 메모리 절약을 위해 모델 해제 (필요시)
export async function disposeEmbedder(): Promise<void> {
  if (extractorPromise) {
    try {
      const extractor = await extractorPromise;
      if ("dispose" in Object(extractor)) {
        await (extractor as FeatureExtractionPipeline & { dispose: () => Promise<void> }).dispose();
      }
    } catch (e) {
      console.error("[TransformerEmbedder] dispose error:", e);
    }
    extractorPromise = null;
  }
}
