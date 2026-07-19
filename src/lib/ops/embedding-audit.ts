import {
  isOpenAiQueryEmbedding,
  RAG_QUERY_EMBEDDING_DIMENSIONS,
  type QueryEmbeddingResult,
} from "@/lib/chat/query-embedding";

// Detection-and-repair for the accepted residual of the n8n embedding
// delegation (spec 2026-07-17-n8n-embedding-ownership-design.md): the
// ingestion contract binds the TEXT n8n embedded (content-hash gate) but
// cannot bind the VECTOR to that text without re-embedding. This audit is
// that re-embedding, sampled: a stored n8n vector far from the core's own
// embedding of the same projection text is either provider drift or a
// poisoned vector — both are repaired by overwriting with the core vector.

export function parseStoredVector(value: unknown): number[] | null {
  if (Array.isArray(value)) {
    return value.every((item) => typeof item === "number" && Number.isFinite(item))
      ? value as number[]
      : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return null;
  const parts = trimmed.slice(1, -1).split(",");
  const vector: number[] = new Array(parts.length);
  for (let index = 0; index < parts.length; index++) {
    const parsed = Number(parts[index]);
    if (!Number.isFinite(parsed)) return null;
    vector[index] = parsed;
  }
  return vector;
}

export function cosineSimilarity(a: number[], b: number[]): number | null {
  if (a.length !== b.length || a.length === 0) return null;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index++) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }
  if (normA === 0 || normB === 0) return null;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function parseAuditConfig(env: NodeJS.ProcessEnv = process.env): {
  sample: number;
  minCosine: number;
} {
  const sampleParsed = Number.parseInt(env.KAXI_EMBEDDING_AUDIT_SAMPLE || "", 10);
  const sample = Number.isFinite(sampleParsed)
    ? Math.min(Math.max(sampleParsed, 1), 20)
    : 5;
  const cosineParsed = Number.parseFloat(env.KAXI_EMBEDDING_AUDIT_MIN_COSINE || "");
  const minCosine = Number.isFinite(cosineParsed)
    ? Math.min(Math.max(cosineParsed, 0.5), 0.9999)
    : 0.98;
  return { sample, minCosine };
}

export type AuditDecision =
  | { action: "skip_embed_unavailable"; cosine: null }
  | { action: "pass"; cosine: number }
  | { action: "heal"; cosine: number | null; reason: "low_cosine" | "stored_vector_invalid" };

export function decideAuditAction(input: {
  storedEmbedding: unknown;
  reembedded: QueryEmbeddingResult;
  minCosine: number;
}): AuditDecision {
  if (!isOpenAiQueryEmbedding(input.reembedded)) {
    return { action: "skip_embed_unavailable", cosine: null };
  }
  const stored = parseStoredVector(input.storedEmbedding);
  if (!stored || stored.length !== RAG_QUERY_EMBEDDING_DIMENSIONS) {
    return { action: "heal", cosine: null, reason: "stored_vector_invalid" };
  }
  const cosine = cosineSimilarity(stored, input.reembedded.vector as number[]);
  if (cosine === null) {
    return { action: "heal", cosine: null, reason: "stored_vector_invalid" };
  }
  if (cosine < input.minCosine) {
    return { action: "heal", cosine, reason: "low_cosine" };
  }
  return { action: "pass", cosine };
}
