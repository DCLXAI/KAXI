import { strict as assert } from "assert";
import {
  buildDirectLexicalResponseFromRows,
  DIRECT_HYBRID_RUNTIME_PATH,
  DIRECT_LEXICAL_PROVENANCE,
  DIRECT_LEXICAL_RUNTIME_PATH,
  runDirectRagFallback,
  runDirectLexicalFallback,
  searchServingRagDocuments,
  shouldUseDirectLexicalFallback,
  type DirectLexicalFallbackInput,
} from "../src/lib/chat/direct-lexical-fallback";
import { applyChatResponseGuardrail } from "../src/lib/chat/response-guardrail";
import { inferChatCategory } from "../src/lib/chat/category";
import {
  n8nQuestionPlan,
  n8nRuntimeTimeoutMs,
  ragRuntimePrimary,
  requestN8nRuntime,
  shouldRetryN8nNoContext,
} from "../src/app/api/typebot-rag/route";
import {
  CANONICAL_QUERY_EMBEDDING_DIMENSIONS,
  CANONICAL_QUERY_EMBEDDING_MODEL,
  createRagQueryEmbedding,
  createRagQueryEmbeddingWithLocalFallback,
  getRagEmbeddingStrategy,
  isOpenAiQueryEmbedding,
  RAG_QUERY_EMBEDDING_DIMENSIONS,
} from "../src/lib/chat/query-embedding";
import {
  mediateRagQuestion,
  planDeterministicRagQuestion,
  parseRuntimeQuestionMediation,
  parseQuestionMediationOutput,
  questionMediationMetadata,
  questionMediationRuntimePayload,
} from "../src/lib/chat/question-mediator";
import { retrievalRunHasNoContext } from "../src/lib/chat/persistence";
import { groundedRagAnswerTimeoutMs } from "../src/lib/chat/grounded-rag-answer";
import { LlmNotConfiguredError } from "../src/lib/ai/llm-gateway";

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
const hybridV3Migration = await Bun.file(new URL(
  "../prisma/postgres/migrations/20260714090000_rag_provider_independent_hybrid/migration.sql",
  import.meta.url,
)).text();
assert.match(hybridV3Migration, /match_rag_documents_hybrid_v3/i);
assert.match(hybridV3Migration, /avg\(seed_rows\.embedding\)/i);
assert.match(hybridV3Migration, /'lexical-centroid'/i);
assert.match(hybridV3Migration, /'hybrid-seeded'/i);
assert.match(hybridV3Migration, /v_output_mode = 'vector-only'/i);
assert.match(hybridV3Migration, /LIMIT 20/i);

const input: DirectLexicalFallbackInput = {
  question: "D-4 비자 연장 조건과 준비 시기를 알려주세요.",
  category: "visa",
  locale: "ko",
  tenantId: "default",
  requestId: "c0802045-3332-4491-b33f-4d38d3fdac2a",
  fallbackReason: "n8n_http_402",
};

assert.equal(ragRuntimePrimary({} as NodeJS.ProcessEnv), "direct");
assert.equal(ragRuntimePrimary({ KAXI_RAG_RUNTIME_PRIMARY: "n8n" } as NodeJS.ProcessEnv), "n8n");
assert.equal(ragRuntimePrimary({ KAXI_RAG_RUNTIME_PRIMARY: "invalid" } as NodeJS.ProcessEnv), "direct");
assert.equal(groundedRagAnswerTimeoutMs({} as NodeJS.ProcessEnv), 7_500);
assert.equal(groundedRagAnswerTimeoutMs({ RAG_GROUNDED_ANSWER_TIMEOUT_MS: "1000" } as NodeJS.ProcessEnv), 3_000);
assert.equal(groundedRagAnswerTimeoutMs({ RAG_GROUNDED_ANSWER_TIMEOUT_MS: "20000" } as NodeJS.ProcessEnv), 12_000);

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
assert.equal(response.needsHuman, false, "a grounded visa answer must not force handoff by category alone");
assert.equal(response.riskLevel, "low");

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

const sharedOpenAiKeyEmbedding = await createRagQueryEmbedding("D-10 documents", {
  env: {
    OPENAI_API_KEY: "test-openai-key",
    KAXI_QUERY_EMBEDDINGS_USE_OPENAI_KEY: "true",
  } as NodeJS.ProcessEnv,
  fetchImpl: (async (_url, init) => {
    assert.equal(
      new Headers(init?.headers).get("authorization"),
      "Bearer test-openai-key",
      "the shared OpenAI key should be accepted for embeddings",
    );
    return new Response(JSON.stringify({
      data: [{ embedding: Array.from({ length: RAG_QUERY_EMBEDDING_DIMENSIONS }, () => 0.001) }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch,
});
assert.equal(sharedOpenAiKeyEmbedding.status, "ready");
assert.equal(isOpenAiQueryEmbedding(sharedOpenAiKeyEmbedding), true);
const insufficientQuotaEmbedding = await createRagQueryEmbedding("D-10 documents", {
  env: { OPENAI_EMBEDDING_API_KEY: "embedding-test-key" } as NodeJS.ProcessEnv,
  fetchImpl: (async () => new Response(JSON.stringify({
    error: { type: "insufficient_quota", code: "insufficient_quota" },
  }), { status: 429, headers: { "content-type": "application/json" } })) as unknown as typeof fetch,
});
assert.equal(insufficientQuotaEmbedding.status, "failed");
assert.equal(insufficientQuotaEmbedding.failureReason, "embedding_provider_insufficient_quota");
assert.equal(getRagEmbeddingStrategy({} as NodeJS.ProcessEnv), "openai-primary");
assert.equal(
  getRagEmbeddingStrategy({ KAXI_RAG_EMBEDDING_STRATEGY: "e5-primary" } as NodeJS.ProcessEnv),
  "e5-primary",
);
const openAiOnlyMissing = await createRagQueryEmbeddingWithLocalFallback("D-10 documents", {
  env: { KAXI_RAG_EMBEDDING_STRATEGY: "openai-only" } as NodeJS.ProcessEnv,
});
assert.equal(openAiOnlyMissing.status, "not_configured");
assert.equal(openAiOnlyMissing.strategy, "openai-only");
assert.equal(openAiOnlyMissing.provider, "none");

assert.equal(
  shouldRetryN8nNoContext({ searchMeta: { noContext: true, runtimePath: "n8n-workflow" } }),
  true,
  "n8n no-context responses should be checked against the canonical Supabase corpus",
);
assert.equal(
  shouldRetryN8nNoContext({ searchMeta: { noContext: false, runtimePath: "n8n-workflow" } }),
  false,
  "grounded n8n responses should not incur a redundant canonical retry",
);

const originalN8nRuntimeTimeout = process.env.N8N_RAG_TIMEOUT_MS;
try {
  delete process.env.N8N_RAG_TIMEOUT_MS;
  assert.equal(n8nRuntimeTimeoutMs(), 35_000, "n8n must have enough time for one cold-start retry");
  process.env.N8N_RAG_TIMEOUT_MS = "500";
  assert.equal(n8nRuntimeTimeoutMs(), 1_000);
  process.env.N8N_RAG_TIMEOUT_MS = "90000";
  assert.equal(n8nRuntimeTimeoutMs(), 45_000);
} finally {
  if (originalN8nRuntimeTimeout === undefined) delete process.env.N8N_RAG_TIMEOUT_MS;
  else process.env.N8N_RAG_TIMEOUT_MS = originalN8nRuntimeTimeout;
}

const parsedMediation = parseQuestionMediationOutput(`The routing result is:
\`\`\`json
{
  "action": "retrieve",
  "category": "documents",
  "searchQuery": "D-10 구직 체류자격 변경 신청 기본 서류",
  "answerFocus": "D-10 변경 신청에 필요한 기본 서류",
  "responseMode": "checklist",
  "clarificationQuestion": "",
  "intents": ["required_documents", "status_change"],
  "visaCodes": ["d10", "D-10"],
  "needsHumanReview": true,
  "confidence": 0.94
}
\`\`\``, "ko");
assert.equal(parsedMediation?.action, "retrieve");
assert.equal(parsedMediation?.category, "documents");
assert.equal(parsedMediation?.responseMode, "checklist");
assert.deepEqual(parsedMediation?.visaCodes, ["D-10"]);

const tolerantMediation = parseQuestionMediationOutput(JSON.stringify({
  result: {
    action: "search",
    category: "unknown-category",
    searchQuery: "D-10 체류자격 변경 제출 서류",
    responseMode: "list",
    intents: ["required_documents", "unknown_intent"],
    visaCodes: ["D10"],
    needsHumanReview: "true",
    confidence: "0.91",
  },
}), "ko", "documents");
assert.equal(tolerantMediation?.action, "retrieve");
assert.equal(tolerantMediation?.category, "documents");
assert.equal(tolerantMediation?.answerFocus, "D-10 체류자격 변경 제출 서류");
assert.equal(tolerantMediation?.responseMode, "checklist");
assert.equal(tolerantMediation?.needsHumanReview, true);
assert.equal(tolerantMediation?.confidence, 0.91);

let fastPathGeneratorCalls = 0;
const deterministicD4 = await mediateRagQuestion({
  question: "D-4 비자 신청에 필요한 기본 서류가 무엇인가요?",
  locale: "ko",
  deterministicCategory: "documents",
}, {
  generate: async () => {
    fastPathGeneratorCalls += 1;
    throw new Error("clear questions must not call the mediation LLM");
  },
});
assert.equal(deterministicD4.status, "deterministic");
assert.equal(deterministicD4.action, "retrieve");
assert.equal(deterministicD4.category, "documents");
assert.equal(deterministicD4.responseMode, "checklist");
assert.equal(deterministicD4.needsHumanReview, false);
assert.deepEqual(deterministicD4.visaCodes, ["D-4"]);
assert.equal(deterministicD4.attempts, 0);
assert.equal(fastPathGeneratorCalls, 0);
assert.equal(
  parseRuntimeQuestionMediation(
    questionMediationRuntimePayload(deterministicD4),
    { question: deterministicD4.searchQuery, locale: "ko", category: "documents" },
  )?.status,
  "deterministic",
);

const deterministicVague = planDeterministicRagQuestion({
  question: "도와줘",
  locale: "ko",
  deterministicCategory: "general",
});
assert.equal(deterministicVague?.status, "deterministic");
assert.equal(deterministicVague?.action, "clarify");

const deterministicHighImpact = planDeterministicRagQuestion({
  question: "My stay expired and I am still in Korea. What should I do?",
  locale: "en",
  deterministicCategory: "visa",
});
assert.equal(deterministicHighImpact?.action, "retrieve");
assert.equal(deterministicHighImpact?.needsHumanReview, true);

let ambiguousGeneratorCalls = 0;
const ambiguousCost = await mediateRagQuestion({
  question: "비자 신청 비용을 알려주세요.",
  locale: "ko",
  deterministicCategory: "cost",
}, {
  generate: async () => {
    ambiguousGeneratorCalls += 1;
    return {
      text: JSON.stringify({
        action: "clarify",
        category: "cost",
        searchQuery: "",
        answerFocus: "",
        responseMode: "clarification",
        clarificationQuestion: "어떤 체류자격의 신청 비용을 확인할까요?",
        intents: ["cost"],
        visaCodes: [],
        needsHumanReview: false,
        confidence: 0.9,
      }),
      backend: "kimi",
      model: "kimi-question-router-test",
      durationMs: 5,
      inputChars: 40,
      outputChars: 100,
    };
  },
});
assert.equal(ambiguousGeneratorCalls, 1);
assert.equal(ambiguousCost.status, "llm");
assert.equal(ambiguousCost.action, "clarify");

let contextualRouterPrompt = "";
const contextualCost = await mediateRagQuestion({
  question: "그럼 비용은?",
  locale: "ko",
  deterministicCategory: "cost",
  conversationHistory: [{
    question: "D-4 비자 연장은 언제 신청해야 하나요?",
    answer: "현재 체류기간이 끝나기 전에 신청해야 합니다.",
  }],
}, {
  generate: async (options) => {
    contextualRouterPrompt = options.messages.map((message) => message.content).join("\n");
    return {
      text: JSON.stringify({
        action: "retrieve",
        category: "cost",
        searchQuery: "D-4 비자 연장 수수료 비용",
        answerFocus: "D-4 비자 연장 비용",
        responseMode: "estimate",
        clarificationQuestion: "",
        intents: ["cost"],
        visaCodes: ["D-4"],
        needsHumanReview: false,
        confidence: 0.94,
      }),
      backend: "kimi",
      model: "kimi-question-router-test",
      durationMs: 6,
      inputChars: 120,
      outputChars: 180,
    };
  },
});
assert.equal(contextualCost.action, "retrieve");
assert.equal(contextualCost.searchQuery, "D-4 비자 연장 수수료 비용");
assert.deepEqual(contextualCost.visaCodes, ["D-4"]);
assert.equal(contextualCost.contextTurns, 1);
assert.equal(contextualCost.contextResolved, true);
assert.match(contextualRouterPrompt, /D-4 비자 연장은 언제 신청해야 하나요/);
assert.equal(questionMediationMetadata(contextualCost).mediationContextResolved, true);

const contextualProviderFallback = await mediateRagQuestion({
  question: "그럼 필요한 서류는 무엇인가요?",
  locale: "ko",
  deterministicCategory: "documents",
  conversationHistory: [{
    question: "D-4 비자로 어학당에 다니고 있는데 체류기간 연장을 준비하고 있어요.",
    answer: "체류기간이 끝나기 전에 연장을 준비하세요.",
  }],
}, {
  forceLlm: true,
  generate: async () => {
    throw new LlmNotConfiguredError("kimi", "Kimi is not configured");
  },
});
assert.equal(contextualProviderFallback.status, "fallback");
assert.equal(contextualProviderFallback.action, "retrieve");
assert.equal(contextualProviderFallback.contextResolved, true);
assert.deepEqual(contextualProviderFallback.visaCodes, ["D-4"]);
assert.equal(
  contextualProviderFallback.needsHumanReview,
  false,
  "an unavailable routing LLM must not turn a grounded ordinary follow-up into a handoff",
);

const explicitCodeOverridesHistory = await mediateRagQuestion({
  question: "그럼 D-10 비용은?",
  locale: "ko",
  deterministicCategory: "cost",
  conversationHistory: [{
    question: "D-4 비자 연장은 언제 신청해야 하나요?",
    answer: "현재 체류기간이 끝나기 전에 신청해야 합니다.",
  }],
}, {
  generate: async () => ({
    text: JSON.stringify({
      action: "retrieve",
      category: "cost",
      searchQuery: "D-10 신청 수수료 비용",
      answerFocus: "D-10 신청 비용",
      responseMode: "estimate",
      clarificationQuestion: "",
      intents: ["cost"],
      visaCodes: ["D-4", "D-10"],
      needsHumanReview: false,
      confidence: 0.94,
    }),
    backend: "kimi",
    model: "kimi-question-router-test",
    durationMs: 6,
    inputChars: 120,
    outputChars: 180,
  }),
});
assert.deepEqual(explicitCodeOverridesHistory.visaCodes, ["D-10"]);

const routingEvaluationCases = await Bun.file(new URL(
  "../quality/multilingual-eval-cases.json",
  import.meta.url,
)).json() as Array<{
  id: string;
  lang: "ko" | "en" | "vi" | "mn";
  category: "visa" | "documents" | "school" | "cost" | "general";
  question: string;
}>;
const fastPathRows = routingEvaluationCases.map((testCase) => ({
  ...testCase,
  plan: planDeterministicRagQuestion({
    question: testCase.question,
    locale: testCase.lang,
    deterministicCategory: inferChatCategory(testCase.question, testCase.category),
  }),
}));
const fastPathCoverage = fastPathRows.filter((row) => row.plan).length / fastPathRows.length;
assert(
  fastPathCoverage >= 0.9,
  `deterministic routing coverage must stay at or above 90%, received ${fastPathCoverage}`,
);
for (const locale of ["ko", "en", "vi", "mn"] as const) {
  const localeRows = fastPathRows.filter((row) => row.lang === locale);
  const localeCoverage = localeRows.filter((row) => row.plan).length / localeRows.length;
  assert(
    localeCoverage >= 0.85,
    `${locale} deterministic routing coverage must stay at or above 85%, received ${localeCoverage}`,
  );
}

const mediatedD10 = await mediateRagQuestion({
  question: "D-10으로 변경할 때 기본 서류가 뭐예요?",
  locale: "ko",
  deterministicCategory: "documents",
}, {
  forceLlm: true,
  generate: async (options) => {
    assert.equal(options.feature, "structured");
    assert.equal(options.temperature, 0);
    assert.equal(options.jsonSchema?.name, "kaxi_question_mediation");
    return {
      text: JSON.stringify({
        action: "retrieve",
        category: "documents",
        searchQuery: "D-10 구직 체류자격 변경 신청 기본 서류",
        answerFocus: "D-10 변경 신청의 기본 제출 서류",
        responseMode: "checklist",
        clarificationQuestion: "",
        intents: ["required_documents", "status_change"],
        visaCodes: ["D-10"],
        needsHumanReview: false,
        confidence: 0.96,
      }),
      backend: "kimi",
      model: "kimi-question-router-test",
      durationMs: 7,
      inputChars: 100,
      outputChars: 200,
    };
  },
});
assert.equal(mediatedD10.status, "llm");
assert.equal(mediatedD10.action, "retrieve");
assert.equal(mediatedD10.category, "documents");
assert.equal(mediatedD10.searchQuery, "D-10 구직 체류자격 변경 신청 기본 서류");
assert.equal(mediatedD10.model, "kimi-question-router-test");
assert.equal(mediatedD10.attempts, 1);
assert.deepEqual(mediatedD10.visaCodes, ["D-10"]);
assert.equal(questionMediationMetadata(mediatedD10).mediationResponseMode, "checklist");
const runtimePlan = n8nQuestionPlan(
  "D-10 구직 비자로 변경할 때 기본 제출 서류가 무엇인가요?",
  mediatedD10,
);
assert.equal(runtimePlan.question, "D-10 구직 비자로 변경할 때 기본 제출 서류가 무엇인가요?");
assert.equal(runtimePlan.retrievalQuery, mediatedD10.searchQuery);
assert.notEqual(runtimePlan.question, runtimePlan.retrievalQuery);
const restoredRuntimePlan = parseRuntimeQuestionMediation(
  questionMediationRuntimePayload(mediatedD10),
  {
    question: runtimePlan.question,
    locale: "ko",
    category: "documents",
  },
);
assert.equal(restoredRuntimePlan?.answerFocus, mediatedD10.answerFocus);
assert.deepEqual(restoredRuntimePlan?.intents, mediatedD10.intents);
assert.deepEqual(restoredRuntimePlan?.visaCodes, ["D-10"]);
const sanitizedRuntimePlan = parseRuntimeQuestionMediation(
  {
    ...questionMediationRuntimePayload(mediatedD10),
    category: "cost",
    visaCodes: ["D-2"],
  },
  {
    question: "한국 대학 유학 비자 신청 비용이 얼마예요?",
    locale: "ko",
    category: "cost",
  },
);
assert.deepEqual(sanitizedRuntimePlan?.visaCodes, []);

const mediatedCost = await mediateRagQuestion({
  question: "한국 대학 유학 비자 신청 비용이 얼마예요?",
  locale: "ko",
  deterministicCategory: "cost",
}, {
  forceLlm: true,
  generate: async () => ({
    text: JSON.stringify({
      action: "retrieve",
      category: "cost",
      searchQuery: "한국 대학 유학 비자 신청 비용",
      answerFocus: "유학 비자 신청 수수료",
      responseMode: "estimate",
      clarificationQuestion: "",
      intents: ["cost"],
      visaCodes: ["D-2"],
      needsHumanReview: false,
      confidence: 0.9,
    }),
    backend: "kimi",
    model: "kimi-question-router-test",
    durationMs: 5,
    inputChars: 80,
    outputChars: 160,
  }),
});
assert.deepEqual(mediatedCost.visaCodes, [], "the mediator must not invent visa-code retrieval constraints");

const clarifiedQuestion = await mediateRagQuestion({
  question: "어떤 질문",
  locale: "ko",
  deterministicCategory: "general",
}, {
  forceLlm: true,
  generate: async () => ({
    text: JSON.stringify({
      action: "clarify",
      category: "general",
      searchQuery: "",
      answerFocus: "",
      responseMode: "clarification",
      clarificationQuestion: "현재 비자와 자격, 서류, 비용 중 어떤 내용을 확인할까요?",
      intents: ["general_information"],
      visaCodes: [],
      needsHumanReview: false,
      confidence: 0.88,
    }),
    backend: "kimi",
    model: "kimi-question-router-test",
    durationMs: 5,
    inputChars: 50,
    outputChars: 120,
  }),
});
assert.equal(clarifiedQuestion.action, "clarify");

const safetyRoutedQuestion = await mediateRagQuestion({
  question: "Can I submit a fake bank statement for my visa application?",
  locale: "en",
  deterministicCategory: "documents",
}, {
  forceLlm: true,
  generate: async () => ({
    text: JSON.stringify({
      action: "clarify",
      category: "general",
      searchQuery: "",
      answerFocus: "",
      responseMode: "clarification",
      clarificationQuestion: "Which document do you mean?",
      intents: ["general_information"],
      visaCodes: [],
      needsHumanReview: false,
      confidence: 0.8,
    }),
    backend: "kimi",
    model: "kimi-question-router-test",
    durationMs: 5,
    inputChars: 80,
    outputChars: 120,
  }),
});
assert.equal(safetyRoutedQuestion.action, "retrieve");
assert.equal(safetyRoutedQuestion.category, "documents");
assert.equal(safetyRoutedQuestion.searchQuery, "Can I submit a fake bank statement for my visa application?");
assert.equal(safetyRoutedQuestion.needsHumanReview, true);

const safetyCategoryCorrectedQuestion = await mediateRagQuestion({
  question: "Can I use a fake bank statement for the student visa?",
  locale: "en",
  deterministicCategory: "documents",
}, {
  forceLlm: true,
  generate: async () => ({
    text: JSON.stringify({
      action: "retrieve",
      category: "visa",
      searchQuery: "fake bank statement student visa",
      answerFocus: "whether a fake bank statement may be used",
      responseMode: "concise_answer",
      clarificationQuestion: "",
      intents: ["general_information"],
      visaCodes: [],
      needsHumanReview: false,
      confidence: 0.8,
    }),
    backend: "kimi",
    model: "kimi-question-router-test",
    durationMs: 5,
    inputChars: 80,
    outputChars: 160,
  }),
});
assert.equal(safetyCategoryCorrectedQuestion.action, "retrieve");
assert.equal(safetyCategoryCorrectedQuestion.category, "documents");
assert.equal(safetyCategoryCorrectedQuestion.searchQuery, "fake bank statement student visa");
assert.equal(safetyCategoryCorrectedQuestion.needsHumanReview, true);

const guardedClarification = applyChatResponseGuardrail({
  answer: clarifiedQuestion.clarificationQuestion,
  nextStep: "D-10 전환 서류처럼 입력해 주세요.",
  sources: [],
  searchMeta: {
    answerMode: "clarification",
    noContext: false,
    retrievedCount: 0,
  },
}, "어떤 질문", "ko");
assert.equal(guardedClarification.answer, clarifiedQuestion.clarificationQuestion);
assert.equal((guardedClarification.searchMeta as Record<string, unknown>).noContext, false);
assert.equal(retrievalRunHasNoContext({ answerMode: "clarification", noContext: false }, 0), false);
assert.equal(retrievalRunHasNoContext({ retrievalMode: "not-run" }, 0), false);
assert.equal(retrievalRunHasNoContext({ answerMode: "no-context", noContext: true }, 0), true);

const invalidMediationFallback = await mediateRagQuestion({
  question: "어떤 질문",
  locale: "ko",
  deterministicCategory: "general",
}, {
  forceLlm: true,
  generate: async () => ({
    text: "not-json",
    backend: "kimi",
    model: "kimi-question-router-test",
    durationMs: 4,
    inputChars: 50,
    outputChars: 8,
  }),
});
assert.equal(invalidMediationFallback.status, "fallback");
assert.equal(invalidMediationFallback.action, "clarify");
assert.equal(invalidMediationFallback.failureReason, "invalid_generation");
assert.equal(invalidMediationFallback.attempts, 2);

let mediationAttempts = 0;
const retriedMediation = await mediateRagQuestion({
  question: "D-4 연장은 언제 신청해야 하나요?",
  locale: "ko",
  deterministicCategory: "visa",
}, {
  forceLlm: true,
  generate: async () => {
    mediationAttempts += 1;
    return {
      text: mediationAttempts === 1 ? "지금부터 답변하겠습니다." : JSON.stringify({
        action: "retrieve",
        category: "visa",
        searchQuery: "D-4 체류기간 연장 신청 시기",
        answerFocus: "D-4 연장 신청 가능 시기",
        responseMode: "concise_answer",
        clarificationQuestion: "",
        intents: ["deadline_or_timing"],
        visaCodes: ["D-4"],
        needsHumanReview: false,
        confidence: 0.9,
      }),
      backend: "kimi",
      model: "kimi-question-router-test",
      durationMs: 6,
      inputChars: 80,
      outputChars: 160,
    };
  },
});
assert.equal(retriedMediation.status, "llm");
assert.equal(retriedMediation.attempts, 2);
assert.equal(retriedMediation.durationMs, 12);
assert.equal(retriedMediation.searchQuery, "D-4 체류기간 연장 신청 시기");

let mediatedFilter: Record<string, unknown> | undefined;
const mediatedRetrieval = await runDirectLexicalFallback({
  ...input,
  question: "그거 바꿀 때 뭐 내요?",
  retrievalQuery: mediatedD10.searchQuery,
  category: mediatedD10.category,
  mediation: mediatedD10,
}, {
  rpc: async ({ filter }) => {
    mediatedFilter = filter;
    return { data: [{
      ...validRow,
      metadata: {
        ...validRow.metadata,
        category: "documents",
        doc_id: "VISA-D10-CHANGE-DOCUMENTS",
        title: "D-10 구직 체류자격 변경 서류",
      },
      content: "D-10 구직 체류자격 변경 신청에는 통합신청서, 여권, 외국인등록증과 구직활동계획서가 필요합니다.",
    }] };
  },
});
assert.match(String(mediatedFilter?.query_text), /D-10 구직 체류자격 변경 신청 기본 서류/);
assert.equal((mediatedRetrieval.searchMeta as Record<string, unknown>).mediationStatus, "llm");
assert.equal((mediatedRetrieval.searchMeta as Record<string, unknown>).mediationModel, "kimi-question-router-test");
assert.deepEqual((mediatedRetrieval.searchMeta as Record<string, unknown>).mediationVisaCodes, ["D-10"]);

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
    assert.equal(matchCount, 12);
    assert.equal(filter.category_mode, "strict");
    return {
      data: [{
        ...validRow,
        metadata: {
          ...validRow.metadata,
          retrieval_type: "hybrid-rrf-v3",
          retrieval_mode: "hybrid-provider",
          score_version: "rrf-k60-provider-v3",
          embedding_source: "provider-query",
          vector_search_available: true,
          stored_vector_search: false,
          vector_seed_count: 0,
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
assert.equal((hybridResponse.searchMeta as Record<string, unknown>).retrievalMode, "hybrid-provider");
assert.equal((hybridResponse.searchMeta as Record<string, unknown>).vectorStrategy, "provider-query");
assert.equal((hybridResponse.searchMeta as Record<string, unknown>).vectorCandidateCount, 20);

const sharedServingSearch = await searchServingRagDocuments({
  ...input,
  requireOpenAiEmbedding: true,
  maxDocuments: 6,
}, {
  createEmbedding: async (question) => {
    assert.equal(question, input.question);
    return readyEmbedding;
  },
  rpc: async ({ queryEmbedding }) => {
    assert.equal(Boolean(queryEmbedding), true);
    return { data: [{
      ...validRow,
      metadata: {
        ...validRow.metadata,
        retrieval_type: "hybrid-rrf-v3",
        retrieval_mode: "hybrid-provider",
        score_version: "rrf-k60-provider-v3",
        embedding_source: "provider-query",
        vector_search_available: true,
        vector_score: 0.91,
        keyword_score: 0.72,
      },
    }] };
  },
});
assert.equal(sharedServingSearch.documents.length, 1);
assert.equal(sharedServingSearch.documents[0]?.id, "VISA-D4-EXTENSION");
assert.equal(sharedServingSearch.runtimePath, DIRECT_HYBRID_RUNTIME_PATH);
assert.equal(sharedServingSearch.searchMeta.embeddingModel, "text-embedding-3-small");
assert.equal(sharedServingSearch.searchMeta.embeddingDimensions, RAG_QUERY_EMBEDDING_DIMENSIONS);

await assert.rejects(
  () => searchServingRagDocuments({
    ...input,
    requireOpenAiEmbedding: true,
  }, {
    createEmbedding: async () => missingEmbeddingProvider,
    rpc: async () => {
      throw new Error("RPC must not run without the OpenAI embedding");
    },
  }),
  /OPENAI_QUERY_EMBEDDING_REQUIRED/,
);

const canonicalEmbedding = {
  vector: Array.from({ length: CANONICAL_QUERY_EMBEDDING_DIMENSIONS }, (_, index) => index === 0 ? 1 : 0),
  status: "ready" as const,
  provider: "local-transformer" as const,
  model: CANONICAL_QUERY_EMBEDDING_MODEL,
  dimensions: CANONICAL_QUERY_EMBEDDING_DIMENSIONS,
  failureReason: null,
  latencyMs: 12,
};
let canonicalSearchCalled = false;
const canonicalHybridResponse = await runDirectRagFallback(input, {
  createEmbedding: async () => canonicalEmbedding,
  canonicalSearch: async ({ queryEmbedding, matchCount, locale }) => {
    canonicalSearchCalled = true;
    assert.equal(queryEmbedding.length, CANONICAL_QUERY_EMBEDDING_DIMENSIONS);
    assert.equal(matchCount, 24);
    assert.equal(locale, "ko");
    return {
      data: [{
        ...validRow,
        metadata: {
          ...validRow.metadata,
          retrieval_type: "hybrid-canonical-e5",
          retrieval_mode: "hybrid-canonical",
          score_version: "canonical-score-fusion-v1",
          embedding_source: "canonical-query",
          vector_search_available: true,
          stored_vector_search: true,
          vector_score: 0.88,
          keyword_score: 0.4,
          vector_candidate_count: 24,
        },
      }],
    };
  },
  rpc: async () => {
    throw new Error("1536d serving RPC must not receive a 384d canonical embedding");
  },
});
assert.equal(canonicalSearchCalled, true);
assert.equal(canonicalHybridResponse.runtimePath, DIRECT_HYBRID_RUNTIME_PATH);
assert.equal((canonicalHybridResponse.searchMeta as Record<string, unknown>).retrievalMode, "hybrid-canonical");
assert.equal((canonicalHybridResponse.searchMeta as Record<string, unknown>).embeddingProvider, "local-transformer");
assert.equal((canonicalHybridResponse.searchMeta as Record<string, unknown>).embeddingDimensions, 384);
assert.equal((canonicalHybridResponse.searchMeta as Record<string, unknown>).vectorStrategy, "canonical-query");

let seededVectorAllowed = false;
const seededHybridResponse = await runDirectRagFallback({
  ...input,
  question: "한국 유학 체류기간 연장 준비 시기를 알려주세요.",
  allowStoredVectorExpansion: true,
}, {
  createEmbedding: async () => missingEmbeddingProvider,
  rpc: async ({ queryEmbedding, filter }) => {
    assert.equal(queryEmbedding, null);
    seededVectorAllowed = filter.allow_seeded_vector === true;
    return {
      data: [{
        ...validRow,
        metadata: {
          ...validRow.metadata,
          retrieval_type: "hybrid-rrf-v3",
          retrieval_mode: "hybrid-seeded",
          score_version: "rrf-k60-seeded-v3",
          embedding_source: "lexical-centroid",
          vector_search_available: true,
          stored_vector_search: true,
          vector_seed_count: 3,
          lexical_score: 1.85,
          vector_score: 0.86,
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
assert.equal(seededVectorAllowed, true);
assert.equal(seededHybridResponse.runtimePath, DIRECT_HYBRID_RUNTIME_PATH);
assert.equal((seededHybridResponse.searchMeta as Record<string, unknown>).retrievalMode, "hybrid-seeded");
assert.equal((seededHybridResponse.searchMeta as Record<string, unknown>).storedVectorSearch, true);
assert.equal((seededHybridResponse.searchMeta as Record<string, unknown>).vectorSeedCount, 3);

let exactVisaSeededVectorAllowed = true;
const exactVisaLexicalResponse = await runDirectRagFallback({
  ...input,
  allowStoredVectorExpansion: true,
}, {
  createEmbedding: async () => missingEmbeddingProvider,
  rpc: async ({ queryEmbedding, filter }) => {
    assert.equal(queryEmbedding, null);
    exactVisaSeededVectorAllowed = filter.allow_seeded_vector === true;
    return { data: [validRow] };
  },
});
assert.equal(exactVisaSeededVectorAllowed, false);
assert.equal(exactVisaLexicalResponse.runtimePath, DIRECT_LEXICAL_RUNTIME_PATH);

const failedEmbeddingProvider = {
  ...missingEmbeddingProvider,
  status: "failed" as const,
  provider: "openai-compatible" as const,
  failureReason: "embedding_provider_http_503",
};
const providerFailureResponse = await runDirectRagFallback({
  ...input,
  allowStoredVectorExpansion: true,
}, {
  createEmbedding: async () => failedEmbeddingProvider,
  rpc: async ({ filter }) => {
    assert.equal(filter.allow_seeded_vector, false);
    return { data: [validRow] };
  },
});
assert.equal(providerFailureResponse.runtimePath, DIRECT_LEXICAL_RUNTIME_PATH);
assert.equal(
  (providerFailureResponse.searchMeta as Record<string, unknown>).embeddingFailureReason,
  "embedding_provider_http_503",
);

const originalEmbeddingStrategy = process.env.KAXI_RAG_EMBEDDING_STRATEGY;
try {
  process.env.KAXI_RAG_EMBEDDING_STRATEGY = "openai-only";
  await assert.rejects(
    () => runDirectRagFallback(input, {
      createEmbedding: async () => failedEmbeddingProvider,
      rpc: async () => {
        throw new Error("openai-only mode must not invoke lexical retrieval");
      },
    }),
    /OPENAI_QUERY_EMBEDDING_REQUIRED/,
  );
} finally {
  if (originalEmbeddingStrategy === undefined) delete process.env.KAXI_RAG_EMBEDDING_STRATEGY;
  else process.env.KAXI_RAG_EMBEDDING_STRATEGY = originalEmbeddingStrategy;
}

let lexicalOnlyVector: string | null | undefined;
const lexicalOnlyResponse = await runDirectRagFallback(input, {
  createEmbedding: async () => missingEmbeddingProvider,
  rpc: async ({ queryEmbedding, filter }) => {
    lexicalOnlyVector = queryEmbedding;
    assert.equal(filter.allow_seeded_vector, false);
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

const wrongD10DocumentInput: DirectLexicalFallbackInput = {
  ...input,
  question: "D-10 구직 비자로 전환할 때 기본적으로 어떤 서류가 필요한가요?",
  category: "documents",
};
const genericD2D4DocumentRow = {
  ...validRow,
  id: 21,
  content: [
    "## D-2·D-4 유학 비자 서류 안내",
    "D-2와 D-4 신청자는 여권, 입학허가서, 재정증빙과 학교가 요구하는 서류를 준비합니다.",
  ].join("\n"),
  metadata: {
    ...validRow.metadata,
    doc_id: "VISA-D2-D4-DOCUMENTS",
    title: "D-2·D-4 유학 비자 서류 안내",
    category: "documents",
  },
};
const d10Mismatch = buildDirectLexicalResponseFromRows([genericD2D4DocumentRow], wrongD10DocumentInput);
assert.equal((d10Mismatch.searchMeta as Record<string, unknown>).noContext, true);
assert.equal((d10Mismatch.searchMeta as Record<string, unknown>).noContextReason, "visa_code_mismatch");
assert.doesNotMatch(d10Mismatch.answer, /D-2와 D-4 신청자는/);

const refusalInput: DirectLexicalFallbackInput = {
  ...input,
  question: "비자 거절 후 언제 다시 신청할 수 있나요?",
};
const unrelatedUniversityRow = {
  ...validRow,
  id: 22,
  content: [
    "## 교육국제화역량 인증대학 안내",
    "인증대학은 국제학생 선발과 관리 역량을 평가받은 대학입니다.",
  ].join("\n"),
  metadata: {
    ...validRow.metadata,
    doc_id: "CERTIFIED-UNIVERSITY-LIST",
    title: "교육국제화역량 인증대학 안내",
  },
};
const refusalMismatch = buildDirectLexicalResponseFromRows([unrelatedUniversityRow], refusalInput);
assert.equal((refusalMismatch.searchMeta as Record<string, unknown>).noContext, true);
assert.equal((refusalMismatch.searchMeta as Record<string, unknown>).noContextReason, "question_intent_mismatch");
assert.doesNotMatch(refusalMismatch.answer, /인증대학은/);

const d10DocumentRow = {
  ...validRow,
  id: 23,
  content: [
    "## D-10 구직 체류자격 변경 서류",
    "D-10 구직 체류자격으로 변경을 신청할 때에는 통합신청서, 여권, 외국인등록증과 구직활동계획서를 제출합니다.",
    "개별 상황에 따라 체류지 증빙과 추가 자료를 요청받을 수 있습니다.",
  ].join("\n"),
  metadata: {
    ...validRow.metadata,
    doc_id: "VISA-D10-CHANGE-DOCUMENTS",
    title: "D-10 구직 체류자격 변경 서류",
    category: "documents",
  },
};

const mixedD10Input: DirectLexicalFallbackInput = {
  ...wrongD10DocumentInput,
  question: "D-10 구직 체류자격으로 변경할 때 핵심 요건과 서류를 공식 출처 기준으로 알려주세요.",
  category: "visa",
  mediation: {
    ...mediatedD10,
    category: "visa",
    intents: ["eligibility", "required_documents", "status_change"],
    answerFocus: "D-10 변경 신청의 핵심 요건과 제출 서류",
  },
};
const d10EligibilityRow = {
  ...validRow,
  id: 24,
  content: [
    "## D-10 구직 체류자격 변경 요건",
    "D-10 구직 체류자격 변경 대상은 국내 대학 졸업자 등 구직 활동 자격 요건을 충족하고 구직활동계획을 제출할 수 있는 사람입니다.",
    "신청인의 현재 체류자격과 학력에 따라 추가 조건이 적용될 수 있습니다.",
  ].join("\n"),
  metadata: {
    ...validRow.metadata,
    doc_id: "VISA-D10-CHANGE-ELIGIBILITY",
    title: "D-10 구직 체류자격 변경 요건",
    category: "visa",
  },
};
const mixedD10Response = buildDirectLexicalResponseFromRows(
  [d10EligibilityRow, d10DocumentRow],
  mixedD10Input,
);
const mixedD10SearchMeta = mixedD10Response.searchMeta as Record<string, unknown>;
assert.equal(mixedD10SearchMeta.noContext, false);
assert.equal(mixedD10SearchMeta.categoryMode, "strict");
assert.equal(mixedD10SearchMeta.categoryScopeMode, "intent-aware-strict");
assert.deepEqual(mixedD10SearchMeta.allowedCategories, ["visa", "legal", "process", "warning", "documents"]);
assert.deepEqual(mixedD10SearchMeta.retrievalCategoryScopes, ["visa", "documents"]);
assert.match(mixedD10Response.answer, /D-10/);

const partialMultiIntentInput: DirectLexicalFallbackInput = {
  ...input,
  question: "D-4 비자 연장은 언제 신청해야 하고 필요한 서류와 비용은 얼마인가요?",
  category: "visa",
  mediation: {
    ...deterministicD4,
    category: "visa",
    searchQuery: "D-4 체류기간 연장 신청 시기 필요 서류 비용",
    answerFocus: "D-4 연장 신청 시기, 필요 서류와 비용",
    responseMode: "concise_answer",
    intents: ["deadline_or_timing", "required_documents", "cost"],
  },
};
const partialMultiIntentResponse = buildDirectLexicalResponseFromRows(
  [validRow],
  partialMultiIntentInput,
);
const partialMultiIntentMeta = partialMultiIntentResponse.searchMeta as Record<string, unknown>;
assert.equal(partialMultiIntentMeta.noContext, false);
assert.equal(partialMultiIntentMeta.partialContext, true);
assert.deepEqual(partialMultiIntentMeta.coveredIntents, ["required_documents", "deadline_or_timing"]);
assert.deepEqual(partialMultiIntentMeta.missingIntents, ["cost"]);
assert.equal(partialMultiIntentMeta.answerMode, "extractive-partial-fallback");
assert.match(partialMultiIntentResponse.answer, /비용.*확인하지 못했어요/);
assert.equal(partialMultiIntentResponse.needsHuman, false);

let partialGenerationCalls = 0;
const generatedPartialMultiIntent = await runDirectRagFallback(partialMultiIntentInput, {
  createEmbedding: async () => missingEmbeddingProvider,
  rpc: async () => ({ data: [validRow] }),
  generateAnswer: async (request) => {
    partialGenerationCalls += 1;
    assert.deepEqual(request.coveredIntents, ["required_documents", "deadline_or_timing"]);
    assert.deepEqual(request.missingIntents, ["cost"]);
    return {
      status: "answered",
      answer: "D-4 연장은 체류기간이 끝나기 전에 신청하고, 여권·외국인등록증·재학증명서 등을 준비해야 합니다. [1] 승인 문서에서는 비용을 확인할 수 없습니다.",
      nextStep: "관할 출입국기관에서 최신 수수료를 확인해 주세요.",
      usedSourceIndexes: [1],
      backend: "kimi",
      model: "grounded-test-model",
      durationMs: 10,
      attempts: 1 as const,
      retryReason: null,
    };
  },
});
assert.equal(partialGenerationCalls, 1, "grounded evidence must always pass through answer synthesis");
assert.equal(
  (generatedPartialMultiIntent.searchMeta as Record<string, unknown>).answerMode,
  "grounded-llm-partial",
);
assert.equal(generatedPartialMultiIntent.needsHuman, false);
assert.match(generatedPartialMultiIntent.answer, /비용을 확인할 수 없습니다/);

const explicitHumanReview = buildDirectLexicalResponseFromRows([validRow], {
  ...input,
  question: "D-4 비자 연장 서류를 알려주고 상담원 연결해 주세요.",
  category: "documents",
});
assert.equal(explicitHumanReview.needsHuman, true);
assert.equal(explicitHumanReview.riskLevel, "medium");

const lexicalCategoryCalls: string[] = [];
const scopedLexicalD10 = await runDirectLexicalFallback(mixedD10Input, {
  rpc: async ({ filter }) => {
    const category = String(filter.category);
    lexicalCategoryCalls.push(category);
    return { data: category === "documents" ? [d10DocumentRow] : [d10EligibilityRow] };
  },
});
assert.deepEqual(lexicalCategoryCalls, ["visa", "documents"]);
assert.equal((scopedLexicalD10.searchMeta as Record<string, unknown>).noContext, false);

const failedCanonicalEmbedding = {
  vector: null,
  status: "failed" as const,
  provider: "local-transformer" as const,
  model: CANONICAL_QUERY_EMBEDDING_MODEL,
  dimensions: null,
  failureReason: "canonical_embedding_unavailable",
  latencyMs: 8_000,
};
const hybridCategoryCalls: string[] = [];
let scopedGenerationTitles: string[] = [];
const scopedHybridD10 = await runDirectRagFallback(mixedD10Input, {
  createEmbedding: async () => failedCanonicalEmbedding,
  rpc: async ({ filter }) => {
    const category = String(filter.category);
    hybridCategoryCalls.push(category);
    return { data: category === "documents" ? [d10DocumentRow] : [d10EligibilityRow] };
  },
  generateAnswer: async (request) => {
    scopedGenerationTitles = request.documents.map((document) => document.title);
    return {
      status: "answered",
      answer: "D-10 변경 요건과 제출 서류를 공식 문서에서 확인했습니다. [1]",
      nextStep: "현재 체류자격과 졸업 여부를 확인해 주세요.",
      usedSourceIndexes: [1],
      backend: "kimi",
      model: "grounded-test-model",
      durationMs: 12,
      attempts: 1 as const,
      retryReason: null,
    };
  },
});
assert.deepEqual(hybridCategoryCalls, ["visa", "documents"]);
assert.equal(scopedGenerationTitles.some((title) => /요건/.test(title)), true);
assert.equal(scopedGenerationTitles.some((title) => /서류/.test(title)), true);
assert.equal((scopedHybridD10.searchMeta as Record<string, unknown>).noContext, false);
assert.equal(
  (scopedHybridD10.searchMeta as Record<string, unknown>).embeddingFailureReason,
  "canonical_embedding_unavailable",
);

const extractiveD10 = buildDirectLexicalResponseFromRows(
  [d10DocumentRow],
  wrongD10DocumentInput,
);
assert.match(extractiveD10.answer, /통합신청서, 여권, 외국인등록증과 구직활동계획서/);
assert.doesNotMatch(extractiveD10.answer, /- D-10 구직 체류자격 변경 서류\s*(?:\n|$)/);

const internalEditorialRow = {
  ...validRow,
  id: 29,
  content: [
    "## D-4 체류기간 연장 안내",
    "따라서 KAXI는 단순히 서류만 답하지 말고 상담 전환을 안내해야 합니다.",
    "D-4 체류기간 연장 신청에는 여권, 외국인등록증, 재학증명서와 체류지 증빙이 필요합니다.",
  ].join("\n"),
};
const editorialFiltered = buildDirectLexicalResponseFromRows([internalEditorialRow], {
  ...input,
  question: "D-4 체류기간 연장에 필요한 서류를 알려주세요.",
  category: "documents",
});
assert.doesNotMatch(editorialFiltered.answer, /KAXI는/);
assert.match(editorialFiltered.answer, /여권, 외국인등록증, 재학증명서/);
let groundedRequestDocumentTitle = "";
const groundedD10 = await runDirectRagFallback(wrongD10DocumentInput, {
  createEmbedding: async () => missingEmbeddingProvider,
  rpc: async () => ({ data: [d10DocumentRow] }),
  generateAnswer: async (request) => {
    groundedRequestDocumentTitle = request.documents[0]?.title || "";
    return {
      status: "answered",
      answer: "D-10 변경 신청의 기본 서류는 통합신청서, 여권, 외국인등록증, 구직활동계획서입니다. [1]",
      nextStep: "관할 출입국기관의 최신 체크리스트에서 추가 서류를 확인해 주세요.",
      usedSourceIndexes: [1],
      backend: "kimi",
      model: "grounded-test-model",
      durationMs: 12,
      attempts: 1 as const,
      retryReason: null,
    };
  },
});
assert.match(groundedRequestDocumentTitle, /D-10/);
assert.match(groundedD10.answer, /^D-10 변경 신청의 기본 서류/);
assert.match(groundedD10.answer, /https:\/\/www\.hikorea\.go\.kr/);
assert.equal((groundedD10.searchMeta as Record<string, unknown>).answerMode, "grounded-llm");
assert.equal((groundedD10.searchMeta as Record<string, unknown>).noContext, false);
assert.equal(groundedD10.modelVersion, "grounded-test-model");

const generatedNoContext = await runDirectRagFallback(wrongD10DocumentInput, {
  createEmbedding: async () => missingEmbeddingProvider,
  rpc: async () => ({ data: [d10DocumentRow] }),
  generateAnswer: async () => ({
    status: "no_context",
    nextStep: "현재 학력과 변경하려는 시점을 알려주세요.",
    backend: "kimi",
    model: "grounded-test-model",
    durationMs: 9,
    attempts: 1 as const,
    retryReason: null,
  }),
});
assert.equal(
  (generatedNoContext.searchMeta as Record<string, unknown>).answerMode,
  "extractive-model-no-context-fallback",
);
assert.equal((generatedNoContext.searchMeta as Record<string, unknown>).noContext, false);
assert.equal(
  (generatedNoContext.searchMeta as Record<string, unknown>).modelNoContextOverrideReason,
  "exact_operational_evidence",
);
assert.equal(
  (generatedNoContext.sources as Array<{ docId?: string }>)[0]?.docId,
  "VISA-D10-CHANGE-DOCUMENTS",
);

const genericDocumentInput: DirectLexicalFallbackInput = {
  ...input,
  question: "학교 추천서 제출 형식을 알려주세요.",
  category: "documents",
};
const genericDocumentRow = {
  ...validRow,
  content: "# 학교 추천서 제출 형식\n학교 추천서는 학교가 지정한 양식에 맞춰 제출합니다.",
  metadata: {
    ...validRow.metadata,
    doc_id: "school-recommendation-format",
    title: "학교 추천서 제출 형식",
    category: "documents",
  },
};
const genericGeneratedNoContext = await runDirectRagFallback(genericDocumentInput, {
  createEmbedding: async () => missingEmbeddingProvider,
  rpc: async () => ({ data: [genericDocumentRow] }),
  generateAnswer: async () => ({
    status: "no_context",
    nextStep: "학교 양식을 확인해 주세요.",
    backend: "kimi",
    model: "grounded-test-model",
    durationMs: 9,
    attempts: 1 as const,
    retryReason: null,
  }),
});
assert.equal((genericGeneratedNoContext.searchMeta as Record<string, unknown>).answerMode, "no-context");
assert.equal((genericGeneratedNoContext.searchMeta as Record<string, unknown>).noContext, true);
assert.equal(
  (genericGeneratedNoContext.searchMeta as Record<string, unknown>).noContextReason,
  "grounded_generation_no_context",
);
assert.deepEqual(genericGeneratedNoContext.sources, []);

const d4LanguageInput: DirectLexicalFallbackInput = {
  ...input,
  question: "I want to study Korean language. What visa do I need?",
  locale: "en",
  category: "visa",
  mediation: {
    ...mediatedD10,
    category: "visa",
    intents: ["eligibility", "status_change"],
    visaCodes: [],
    answerFocus: "the visa required for Korean language study",
  },
};
const d4LanguageRow = {
  ...validRow,
  content: "# D-4 Visa Overview\nD-4 is for non-degree programs, including Korean language institutes.",
  metadata: {
    ...validRow.metadata,
    doc_id: "d4-overview",
    title: "D-4 Visa Overview",
    language: "en",
  },
};
const groundedD4NoContext = await runDirectRagFallback(d4LanguageInput, {
  createEmbedding: async () => missingEmbeddingProvider,
  rpc: async () => ({ data: [d4LanguageRow] }),
  generateAnswer: async () => ({
    status: "no_context",
    nextStep: "Share the intended school.",
    backend: "kimi",
    model: "grounded-test-model",
    durationMs: 9,
    attempts: 1 as const,
    retryReason: null,
  }),
});
assert.equal(
  (groundedD4NoContext.searchMeta as Record<string, unknown>).answerMode,
  "extractive-model-no-context-fallback",
);
assert.equal((groundedD4NoContext.searchMeta as Record<string, unknown>).noContext, false);
assert.equal((groundedD4NoContext.searchMeta as Record<string, unknown>).modelNoContextOverridden, true);
assert.deepEqual(
  (groundedD4NoContext.searchMeta as Record<string, unknown>).questionIntents,
  ["eligibility"],
);
assert.equal(
  (groundedD4NoContext.sources as Array<{ docId?: string }>)[0]?.docId,
  "d4-overview",
);
assert.match(groundedD4NoContext.answer, /D-4/);

const profileTestInput: DirectLexicalFallbackInput = {
  question: "제가 변경하려는 비자에 필요한 서류 알려주세요",
  locale: "ko",
  category: "documents",
  tenantId: "default",
  requestId: "profile-test",
  fallbackReason: "test",
  requireOpenAiEmbedding: false,
  conversationHistory: [],
  profile: {
    version: "session-profile-v1",
    nationality: "vn",
    currentVisa: "D-4",
    targetVisa: "D-2",
  },
};
const profileTestRow = {
  ...validRow,
  id: 40,
  content: [
    "## 체류자격 변경 서류 안내",
    "체류자격 변경을 신청할 때는 통합신청서, 여권, 외국인등록증과 관련 증빙서류를 제출합니다.",
  ].join("\n"),
  metadata: {
    ...validRow.metadata,
    doc_id: "VISA-CHANGE-DOCUMENTS",
    title: "체류자격 변경 서류 안내",
    category: "documents",
  },
};
let observedProfileBlock = "";
const profileResult = await runDirectRagFallback(profileTestInput, {
  createEmbedding: async () => missingEmbeddingProvider,
  rpc: async () => ({ data: [profileTestRow] }),
  generateAnswer: async (request) => {
    observedProfileBlock = JSON.stringify(request.profile || null);
    return { status: "unavailable", reason: "not_configured" };
  },
});
assert.equal(observedProfileBlock.includes("D-2"), true, "profile must reach the grounded generator");
assert.ok(profileResult, "extractive degradation still answers");

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
