import {
  RAG_QUERY_EMBEDDING_DIMENSIONS,
  RAG_QUERY_EMBEDDING_MODEL,
  type QueryEmbeddingResult,
} from "@/lib/chat/query-embedding";

export type ProvidedEmbeddingParse =
  | { ok: true; embedding: QueryEmbeddingResult }
  | {
    ok: false;
    reason: "not_provided" | "invalid_shape" | "invalid_dimension" | "non_finite" | "abnormal_norm";
  };

// An n8n-supplied query vector is untrusted DATA. It is accepted only when it
// is exactly the shape the core's own OpenAI embedder would have produced
// (isOpenAiQueryEmbedding-compatible); anything else falls back to the core
// embedding with the rejection reason recorded. Norm bounds: OpenAI
// text-embedding-3-small returns unit-normalized vectors; [0.5, 2.0] allows
// float drift while rejecting zero/garbage vectors.
export function parseProvidedQueryEmbedding(value: unknown): ProvidedEmbeddingParse {
  if (value === undefined || value === null) return { ok: false, reason: "not_provided" };
  if (!Array.isArray(value)) return { ok: false, reason: "invalid_shape" };
  if (value.length !== RAG_QUERY_EMBEDDING_DIMENSIONS) return { ok: false, reason: "invalid_dimension" };
  const vector: number[] = new Array(value.length);
  let sumSquares = 0;
  for (let index = 0; index < value.length; index++) {
    const item = value[index];
    if (typeof item !== "number" || !Number.isFinite(item)) return { ok: false, reason: "non_finite" };
    vector[index] = item;
    sumSquares += item * item;
  }
  const norm = Math.sqrt(sumSquares);
  if (norm < 0.5 || norm > 2.0) return { ok: false, reason: "abnormal_norm" };
  return {
    ok: true,
    embedding: {
      vector,
      status: "ready",
      provider: "openai-compatible",
      model: RAG_QUERY_EMBEDDING_MODEL,
      dimensions: RAG_QUERY_EMBEDDING_DIMENSIONS,
      failureReason: null,
      latencyMs: 0,
    },
  };
}
