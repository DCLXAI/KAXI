import assert from "node:assert/strict";
const {
  parseStoredVector,
  cosineSimilarity,
  parseAuditConfig,
  decideAuditAction,
} = await import("../src/lib/ops/embedding-audit");
const { RAG_QUERY_EMBEDDING_DIMENSIONS } = await import("../src/lib/chat/query-embedding");
import type { QueryEmbeddingResult } from "../src/lib/chat/query-embedding";

function unitVector(hotIndex: number): number[] {
  const vector = new Array(RAG_QUERY_EMBEDDING_DIMENSIONS).fill(0);
  vector[hotIndex] = 1;
  return vector;
}

function readyEmbedding(vector: number[] | null): QueryEmbeddingResult {
  return {
    vector,
    status: vector ? "ready" : "failed",
    provider: "openai-compatible",
    model: "text-embedding-3-small",
    dimensions: vector ? RAG_QUERY_EMBEDDING_DIMENSIONS : null,
    failureReason: vector ? null : "embedding_provider_unavailable",
    latencyMs: 0,
  };
}

// parseStoredVector: array passthrough, pgvector text parse, junk rejection
assert.deepEqual(parseStoredVector([1, 2, 3]), [1, 2, 3]);
assert.deepEqual(parseStoredVector("[0.5,-0.25,1]"), [0.5, -0.25, 1]);
assert.equal(parseStoredVector("[0.5,abc,1]"), null);
assert.equal(parseStoredVector("not-a-vector"), null);
assert.equal(parseStoredVector(null), null);
assert.equal(parseStoredVector(undefined), null);
assert.equal(parseStoredVector({ vector: [1] }), null);
assert.equal(parseStoredVector([1, Number.NaN]), null);
console.log("PASS embedding audit: stored-vector parsing");

// cosineSimilarity: identity 1, orthogonal 0, guards
const a = unitVector(0);
const b = unitVector(1);
assert.ok(Math.abs((cosineSimilarity(a, a) ?? 0) - 1) < 1e-9);
assert.ok(Math.abs(cosineSimilarity(a, b) ?? 1) < 1e-9);
assert.equal(cosineSimilarity(a, [1, 0]), null);
assert.equal(cosineSimilarity(new Array(RAG_QUERY_EMBEDDING_DIMENSIONS).fill(0), a), null);
console.log("PASS embedding audit: cosine similarity");

// parseAuditConfig: defaults and clamps
assert.deepEqual(parseAuditConfig({} as NodeJS.ProcessEnv), { sample: 5, minCosine: 0.98 });
assert.deepEqual(
  parseAuditConfig({ KAXI_EMBEDDING_AUDIT_SAMPLE: "50", KAXI_EMBEDDING_AUDIT_MIN_COSINE: "2" } as NodeJS.ProcessEnv),
  { sample: 20, minCosine: 0.9999 },
);
assert.deepEqual(
  parseAuditConfig({ KAXI_EMBEDDING_AUDIT_SAMPLE: "0", KAXI_EMBEDDING_AUDIT_MIN_COSINE: "0.1" } as NodeJS.ProcessEnv),
  { sample: 1, minCosine: 0.5 },
);
assert.deepEqual(
  parseAuditConfig({ KAXI_EMBEDDING_AUDIT_SAMPLE: "junk", KAXI_EMBEDDING_AUDIT_MIN_COSINE: "junk" } as NodeJS.ProcessEnv),
  { sample: 5, minCosine: 0.98 },
);
console.log("PASS embedding audit: config clamps");

// decideAuditAction
const matching = decideAuditAction({ storedEmbedding: a, reembedded: readyEmbedding(a), minCosine: 0.98 });
assert.equal(matching.action, "pass");
if (matching.action === "pass") assert.ok(matching.cosine > 0.99);

const divergent = decideAuditAction({ storedEmbedding: b, reembedded: readyEmbedding(a), minCosine: 0.98 });
assert.deepEqual(divergent, { action: "heal", cosine: 0, reason: "low_cosine" });

const malformedStored = decideAuditAction({ storedEmbedding: "junk", reembedded: readyEmbedding(a), minCosine: 0.98 });
assert.deepEqual(malformedStored, { action: "heal", cosine: null, reason: "stored_vector_invalid" });

const zeroNormStored = decideAuditAction({
  storedEmbedding: new Array(RAG_QUERY_EMBEDDING_DIMENSIONS).fill(0),
  reembedded: readyEmbedding(a),
  minCosine: 0.98,
});
assert.deepEqual(zeroNormStored, { action: "heal", cosine: null, reason: "stored_vector_invalid" });

const wrongDimStored = decideAuditAction({ storedEmbedding: [1, 0], reembedded: readyEmbedding(a), minCosine: 0.98 });
assert.deepEqual(wrongDimStored, { action: "heal", cosine: null, reason: "stored_vector_invalid" });

const providerDown = decideAuditAction({ storedEmbedding: a, reembedded: readyEmbedding(null), minCosine: 0.98 });
assert.deepEqual(providerDown, { action: "skip_embed_unavailable", cosine: null });
console.log("PASS embedding audit: decision verdicts");
