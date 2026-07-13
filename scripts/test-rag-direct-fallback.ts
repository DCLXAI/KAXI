import { strict as assert } from "assert";
import {
  buildDirectLexicalResponseFromRows,
  DIRECT_HYBRID_RUNTIME_PATH,
  DIRECT_LEXICAL_PROVENANCE,
  DIRECT_LEXICAL_RUNTIME_PATH,
  runDirectRagFallback,
  runDirectLexicalFallback,
  shouldUseDirectLexicalFallback,
  type DirectLexicalFallbackInput,
} from "../src/lib/chat/direct-lexical-fallback";
import { applyChatResponseGuardrail } from "../src/lib/chat/response-guardrail";
import { requestN8nRuntime } from "../src/app/api/typebot-rag/route";
import {
  createRagQueryEmbedding,
  RAG_QUERY_EMBEDDING_DIMENSIONS,
} from "../src/lib/chat/query-embedding";

const lexicalV2Migration = await Bun.file(new URL(
  "../prisma/postgres/migrations/20260713153000_rag_lexical_search_v2/migration.sql",
  import.meta.url,
)).text();
assert.match(lexicalV2Migration, /CREATE EXTENSION IF NOT EXISTS pg_trgm/i);
assert.match(lexicalV2Migration, /CREATE EXTENSION IF NOT EXISTS unaccent/i);
assert.match(lexicalV2Migration, /CREATE TABLE IF NOT EXISTS public\.rag_query_aliases/i);
assert.match(lexicalV2Migration, /setweight\(to_tsvector[\s\S]*'A'\)/i);
assert.match(lexicalV2Migration, /source_authority_score/i);
assert.match(lexicalV2Migration, /freshness_score/i);
assert.doesNotMatch(lexicalV2Migration, /serving\.embedding IS NOT NULL/i);
assert.doesNotMatch(lexicalV2Migration, /max\(keyword_raw\.keyword_score\) OVER/i);
const hybridV2Migration = await Bun.file(new URL(
  "../prisma/postgres/migrations/20260713163000_rag_hybrid_rrf_v2/migration.sql",
  import.meta.url,
)).text();
assert.match(hybridV2Migration, /match_rag_documents_lexical\(20,/i);
assert.match(hybridV2Migration, /LIMIT 20/i);
assert.match(hybridV2Migration, /v_rrf_k double precision := 60/i);
assert.match(hybridV2Migration, /query_embedding IS NOT NULL/i);
assert.match(hybridV2Migration, /'lexical-only'/i);

const input: DirectLexicalFallbackInput = {
  question: "D-4 비자 연장 조건과 준비 시기를 알려주세요.",
  category: "visa",
  locale: "ko",
  tenantId: "default",
  requestId: "c0802045-3332-4491-b33f-4d38d3fdac2a",
  fallbackReason: "n8n_http_402",
};

const validRow = {
  id: 10,
  content: [
    "## D-4 어학연수 비자 연장 안내",
    "D-4 어학연수 체류기간 연장은 현재 체류기간이 끝나기 전에 신청해야 합니다.",
    "신청 시 여권, 외국인등록증, 재학증명서와 체류지 증빙 등 관할 기관이 요구하는 서류를 준비합니다.",
  ].join("\n"),
  metadata: {
    doc_id: "VISA-D4-EXTENSION",
    title: "D-4 어학연수 비자 연장 안내",
    source: "Hi Korea",
    source_url: "https://www.hikorea.go.kr/visa/d4-extension",
    last_checked_at: "2026-07-10T00:00:00.000Z",
    checked_by: "kaxi-legal-review",
    language: "ko",
    category: "visa",
    hybrid_score: 1.85,
    keyword_score: 0.72,
  },
  similarity: 0,
};

const response = buildDirectLexicalResponseFromRows([validRow], input);
assert.equal(response.runtimePath, DIRECT_LEXICAL_RUNTIME_PATH);
assert.equal(response.workflowId, DIRECT_LEXICAL_PROVENANCE.workflowId);
assert.equal(response.executionId, `direct-${input.requestId}`);
assert.match(response.answer, /D-4/);
assert.match(response.answer, /https:\/\/www\.hikorea\.go\.kr/);
assert.equal(Array.isArray(response.sources), true);
assert.equal((response.sources as unknown[]).length, 1);

const searchMeta = response.searchMeta as Record<string, unknown>;
assert.equal(searchMeta.runtimePath, DIRECT_LEXICAL_RUNTIME_PATH);
assert.equal(searchMeta.fallbackReason, "n8n_http_402");
assert.equal(searchMeta.categoryMode, "strict");
assert.equal(searchMeta.locale, "ko");
assert.equal(searchMeta.retrievedCount, 1);
assert.equal(searchMeta.noContext, false);
assert.equal(typeof searchMeta.tokenCoverage, "number");

const guarded = applyChatResponseGuardrail(response, input.question, input.locale);
assert.equal(guarded.runtimePath, DIRECT_LEXICAL_RUNTIME_PATH);
assert.notEqual((guarded.searchMeta as Record<string, unknown>).noContextReason, "out_of_domain");

const invalidCitation = {
  ...validRow,
  id: 11,
  metadata: { ...validRow.metadata, source_url: "http://untrusted.example.test/source" },
};
const citationRejected = buildDirectLexicalResponseFromRows([invalidCitation], input);
assert.equal((citationRejected.searchMeta as Record<string, unknown>).noContext, true);
assert.equal((citationRejected.searchMeta as Record<string, unknown>).noContextReason, "citation_validation_failed");
assert.deepEqual(citationRejected.sources, []);

const wrongLocale = {
  ...validRow,
  id: 12,
  content: "## D-4 visa extension\nApply before your current period of stay expires.",
  metadata: { ...validRow.metadata, language: "en", title: "D-4 visa extension" },
};
const localeRejected = buildDirectLexicalResponseFromRows([wrongLocale], input);
assert.equal((localeRejected.searchMeta as Record<string, unknown>).noContext, true);
assert.equal((localeRejected.searchMeta as Record<string, unknown>).noContextReason, "locale_validation_failed");

const wrongCategory = {
  ...validRow,
  id: 13,
  metadata: { ...validRow.metadata, category: "cost" },
};
const categoryRejected = buildDirectLexicalResponseFromRows([wrongCategory], input);
assert.equal((categoryRejected.searchMeta as Record<string, unknown>).noContext, true);
assert.equal((categoryRejected.searchMeta as Record<string, unknown>).noContextReason, "category_validation_failed");

let capturedFilter: Record<string, unknown> | undefined;
const rpcResponse = await runDirectLexicalFallback(input, {
  rpc: async ({ matchCount, filter }) => {
    assert.equal(matchCount, 12);
    capturedFilter = filter;
    return { data: [validRow] };
  },
});
assert.equal(rpcResponse.runtimePath, DIRECT_LEXICAL_RUNTIME_PATH);
assert.equal(capturedFilter?.category_mode, "strict");
assert.equal(capturedFilter?.category, "visa");
assert.equal(capturedFilter?.locale, "ko");
assert.match(String(capturedFilter?.query_text), /D4/);
assert.match(String(capturedFilter?.query_text), /D-4/);

await assert.rejects(
  () => runDirectLexicalFallback(input, {
    rpc: async () => ({ data: null, error: { message: "database unavailable" } }),
  }),
  /DIRECT_LEXICAL_RPC_FAILED: database unavailable/,
);

const missingEmbeddingProvider = await createRagQueryEmbedding("D-4 visa", {
  env: {} as NodeJS.ProcessEnv,
});
assert.equal(missingEmbeddingProvider.status, "not_configured");
assert.equal(missingEmbeddingProvider.vector, null);

const embeddingVector = Array.from({ length: RAG_QUERY_EMBEDDING_DIMENSIONS }, (_, index) => index === 0 ? 1 : 0);
const readyEmbedding = await createRagQueryEmbedding("D-4 visa", {
  env: {
    OPENAI_EMBEDDING_API_KEY: "embedding-test-key",
  } as NodeJS.ProcessEnv,
  fetchImpl: (async (_url, init) => {
    assert.match(new Headers(init?.headers).get("authorization") || "", /^Bearer /);
    return new Response(JSON.stringify({ data: [{ embedding: embeddingVector }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch,
});
assert.equal(readyEmbedding.status, "ready");
assert.equal(readyEmbedding.vector?.length, RAG_QUERY_EMBEDDING_DIMENSIONS);

let hybridVectorSupplied = false;
const hybridResponse = await runDirectRagFallback(input, {
  createEmbedding: async () => readyEmbedding,
  rpc: async ({ queryEmbedding, matchCount, filter }) => {
    hybridVectorSupplied = Boolean(queryEmbedding?.startsWith("[1.00000000,"));
    assert.equal(matchCount, 6);
    assert.equal(filter.category_mode, "strict");
    return {
      data: [{
        ...validRow,
        metadata: {
          ...validRow.metadata,
          retrieval_type: "hybrid-rrf-v2",
          lexical_score: 1.85,
          vector_score: 0.91,
          rrf_score: 0.032,
          lexical_rank: 1,
          vector_rank: 1,
          lexical_candidate_count: 20,
          vector_candidate_count: 20,
        },
      }],
    };
  },
});
assert.equal(hybridVectorSupplied, true);
assert.equal(hybridResponse.runtimePath, DIRECT_HYBRID_RUNTIME_PATH);
assert.equal((hybridResponse.searchMeta as Record<string, unknown>).retrievalMode, "hybrid");
assert.equal((hybridResponse.searchMeta as Record<string, unknown>).vectorCandidateCount, 20);

let lexicalOnlyVector: string | null | undefined;
const lexicalOnlyResponse = await runDirectRagFallback(input, {
  createEmbedding: async () => missingEmbeddingProvider,
  rpc: async ({ queryEmbedding }) => {
    lexicalOnlyVector = queryEmbedding;
    return { data: [validRow] };
  },
});
assert.equal(lexicalOnlyVector, null);
assert.equal(lexicalOnlyResponse.runtimePath, DIRECT_LEXICAL_RUNTIME_PATH);
assert.equal((lexicalOnlyResponse.searchMeta as Record<string, unknown>).retrievalMode, "lexical-only");
assert.equal(
  (lexicalOnlyResponse.searchMeta as Record<string, unknown>).embeddingFailureReason,
  "embedding_provider_not_configured",
);

for (const status of [400, 401, 402, 404, 429, 500, 503]) {
  assert.equal(shouldUseDirectLexicalFallback({ status }), true, `HTTP ${status} should use direct fallback`);
}
assert.equal(shouldUseDirectLexicalFallback({ status: 200 }), false);
assert.equal(shouldUseDirectLexicalFallback({ transportError: new Error("timeout") }), true);
assert.equal(shouldUseDirectLexicalFallback({ emptyResponse: true }), true);
assert.equal(shouldUseDirectLexicalFallback({ invalidResponse: true }), true);
assert.equal(shouldUseDirectLexicalFallback({ configurationError: true }), true);

const originalFetch = globalThis.fetch;
const originalWebhookUrl = process.env.N8N_TYPEBOT_RAG_WEBHOOK_URL;
const originalSigningSecret = process.env.N8N_WEBHOOK_SIGNING_SECRET;
process.env.N8N_TYPEBOT_RAG_WEBHOOK_URL = "https://n8n.example.test/webhook/kaxi";
process.env.N8N_WEBHOOK_SIGNING_SECRET = "direct-fallback-test-signing-secret-that-is-long-enough";
const n8nRequest = { question: input.question, requestId: input.requestId };
try {
  for (const status of [402, 429, 500, 503]) {
    globalThis.fetch = (async () => new Response(JSON.stringify({ error: "unavailable" }), {
      status,
      headers: { "content-type": "application/json" },
    })) as unknown as typeof fetch;
    const attempt = await requestN8nRuntime(n8nRequest);
    assert.equal(attempt.ok, false);
    if (!attempt.ok) assert.equal(attempt.fallbackReason, `n8n_http_${status}`);
  }

  globalThis.fetch = (async () => new Response("", { status: 200 })) as unknown as typeof fetch;
  const empty = await requestN8nRuntime(n8nRequest);
  assert.equal(empty.ok, false);
  if (!empty.ok) assert.equal(empty.fallbackReason, "n8n_empty_response");

  globalThis.fetch = (async () => new Response("not-json", { status: 200 })) as unknown as typeof fetch;
  const invalidJson = await requestN8nRuntime(n8nRequest);
  assert.equal(invalidJson.ok, false);
  if (!invalidJson.ok) assert.equal(invalidJson.fallbackReason, "n8n_invalid_json");

  globalThis.fetch = (async () => {
    throw new DOMException("timed out", "TimeoutError");
  }) as unknown as typeof fetch;
  const timedOut = await requestN8nRuntime(n8nRequest);
  assert.equal(timedOut.ok, false);
  if (!timedOut.ok) assert.equal(timedOut.fallbackReason, "n8n_timeout");

  globalThis.fetch = (async () => new Response(JSON.stringify({
    answer: "grounded n8n answer",
    searchMeta: { type: "lexical" },
  }), {
    status: 200,
    headers: { "content-type": "application/json" },
  })) as unknown as typeof fetch;
  const healthy = await requestN8nRuntime(n8nRequest);
  assert.equal(healthy.ok, true);
  if (healthy.ok) {
    assert.equal(healthy.payload.answer, "grounded n8n answer");
    assert.equal(healthy.payload.runtimePath, "n8n-workflow");
    assert.equal((healthy.payload.searchMeta as Record<string, unknown>).runtimePath, "n8n-workflow");
  }
} finally {
  globalThis.fetch = originalFetch;
  if (originalWebhookUrl === undefined) delete process.env.N8N_TYPEBOT_RAG_WEBHOOK_URL;
  else process.env.N8N_TYPEBOT_RAG_WEBHOOK_URL = originalWebhookUrl;
  if (originalSigningSecret === undefined) delete process.env.N8N_WEBHOOK_SIGNING_SECRET;
  else process.env.N8N_WEBHOOK_SIGNING_SECRET = originalSigningSecret;
}

console.log("Direct lexical RAG fallback checks passed.");
