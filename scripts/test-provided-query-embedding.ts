import assert from "node:assert/strict";
const { parseProvidedQueryEmbedding } = await import("../src/lib/n8n/provided-query-embedding");
const { isOpenAiQueryEmbedding, isCanonicalQueryEmbedding, RAG_QUERY_EMBEDDING_DIMENSIONS } = await import("../src/lib/chat/query-embedding");

const unit = new Array(RAG_QUERY_EMBEDDING_DIMENSIONS).fill(0);
unit[0] = 1; // L2 norm = 1, OpenAI-style normalized vector

const ok = parseProvidedQueryEmbedding(unit);
assert.equal(ok.ok, true);
if (ok.ok) {
  assert.equal(isOpenAiQueryEmbedding(ok.embedding), true);
  assert.equal(isCanonicalQueryEmbedding(ok.embedding), false);
  assert.equal(ok.embedding.vector?.length, 1536);
  assert.equal(ok.embedding.provider, "openai-compatible");
  assert.equal(ok.embedding.status, "ready");
}

assert.deepEqual(parseProvidedQueryEmbedding(undefined), { ok: false, reason: "not_provided" });
assert.deepEqual(parseProvidedQueryEmbedding(null), { ok: false, reason: "not_provided" });
assert.deepEqual(parseProvidedQueryEmbedding("[1,2,3]"), { ok: false, reason: "invalid_shape" });
assert.deepEqual(parseProvidedQueryEmbedding(unit.slice(0, 384)), { ok: false, reason: "invalid_dimension" });

const withNaN = [...unit]; withNaN[7] = Number.NaN;
assert.deepEqual(parseProvidedQueryEmbedding(withNaN), { ok: false, reason: "non_finite" });
const withString = [...unit]; (withString as unknown[])[3] = "0.5";
assert.deepEqual(parseProvidedQueryEmbedding(withString), { ok: false, reason: "non_finite" });

assert.deepEqual(parseProvidedQueryEmbedding(new Array(1536).fill(0)), { ok: false, reason: "abnormal_norm" });
assert.deepEqual(parseProvidedQueryEmbedding(new Array(1536).fill(1)), { ok: false, reason: "abnormal_norm" });

console.log("PASS provided query embedding: shape, guards, predicate compatibility");

const { resolveProvidedEmbedding } = await import("../src/lib/n8n/provided-query-embedding");

const resolvedOk = resolveProvidedEmbedding(unit);
assert.equal(resolvedOk.embeddingSource, "n8n-openai");
assert.equal(resolvedOk.rejectedReason, null);
assert.ok(resolvedOk.dependencies.createEmbedding);
const injected = await resolvedOk.dependencies.createEmbedding!();
assert.equal(isOpenAiQueryEmbedding(injected), true);

const resolvedAbsent = resolveProvidedEmbedding(undefined);
assert.equal(resolvedAbsent.embeddingSource, "core");
assert.equal(resolvedAbsent.rejectedReason, null);
assert.equal(resolvedAbsent.dependencies.createEmbedding, undefined);

const resolvedBad = resolveProvidedEmbedding(unit.slice(0, 10));
assert.equal(resolvedBad.embeddingSource, "core");
assert.equal(resolvedBad.rejectedReason, "invalid_dimension");
assert.equal(resolvedBad.dependencies.createEmbedding, undefined);

console.log("PASS provided embedding resolution: inject on valid, core fallback otherwise");
