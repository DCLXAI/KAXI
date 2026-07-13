import { createHash, randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import {
  buildDirectLexicalQuery,
  directRagProvenance,
  type DirectRagRuntimePath,
} from "../src/lib/chat/direct-lexical-fallback";
import { inferChatCategory } from "../src/lib/chat/category";
import { createRagQueryEmbedding } from "../src/lib/chat/query-embedding";
import { extractRagProvenance, resolveRagProvenance } from "../src/lib/n8n/provenance";
import { signN8nPayload } from "../src/lib/n8n/signature";

type EvaluationCase = {
  id: string;
  locale: string;
  category: string;
  question: string;
  expected_doc_ids: string[];
  expected_risk_level: string | null;
  expected_handoff: boolean | null;
  metadata: {
    expectedNoContext?: boolean;
    expectedRefusal?: boolean;
    expectedStrictCategory?: boolean;
    expectedLocaleHeadings?: boolean;
    hasSyntheticAttachment?: boolean;
    expectedTopDocId?: string;
    expectedReranker?: string;
    expectedAnswerTerms?: string[];
    minimumExpectedAnswerTerms?: number;
    forbiddenDocIds?: string[];
    forbiddenAnswerFragments?: string[];
    incident?: string;
  } | null;
};

type RagResponse = {
  answer?: string;
  riskLevel?: string;
  needsHuman?: boolean;
  sources?: Array<{
    docId?: string;
    title?: string;
    sourceUrl?: string;
    checkedAt?: string;
    category?: string;
    language?: string;
    rerankScore?: number;
  }>;
  searchMeta?: {
    topScore?: number;
    noContext?: boolean;
    retrievedCount?: number;
    reranker?: string;
    category?: string;
    runtimePath?: string;
    retrievalRuntimePath?: string;
    fallbackReason?: string;
    retrievalMode?: string;
    embeddingStatus?: string;
    embeddingFailureReason?: string | null;
  };
  executionId?: string;
  workflowId?: string;
  workflowVersionId?: string;
  modelVersion?: string;
  promptVersion?: string;
  runtimePath?: string;
  persisted?: boolean;
  messageId?: string;
  error?: string;
};

type EvaluationStage = "smoke" | "locale" | "full";

type ShadowComparison = {
  embeddingStatus: string;
  embeddingFailureReason: string | null;
  lexicalDocIds: string[];
  vectorDocIds: string[];
  hybridDocIds: string[];
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
const baseUrl = (process.env.KAXI_E2E_BASE_URL?.trim() || "http://localhost:3002").replace(/\/$/, "");
if (!supabaseUrl || !serviceKey) throw new Error("Supabase service configuration is required");
const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const requestedStage = (process.env.RAG_EVAL_STAGE || "full").trim().toLowerCase();
const evaluationStage: EvaluationStage = requestedStage === "smoke" || requestedStage === "locale"
  ? requestedStage
  : "full";
const stageLimit = { smoke: 8, locale: 16, full: 64 }[evaluationStage];
const configuredLimit = process.env.RAG_EVAL_LIMIT?.trim()
  ? Number(process.env.RAG_EVAL_LIMIT)
  : stageLimit;
const limit = Math.min(Math.max(Number.isFinite(configuredLimit) ? configuredLimit : stageLimit, 1), stageLimit);
const caseIdFilter = process.env.RAG_EVAL_CASE_ID?.trim() || "";
const transport = process.env.RAG_EVAL_TRANSPORT?.trim() === "direct-n8n" ? "direct-n8n" : "gateway";
const shadowMode = process.env.RAG_EVAL_SHADOW?.trim().toLowerCase() === "true";
const expectedProvenance = resolveRagProvenance();

const SMOKE_CASE_IDS = [
  "ko-cost-strict-locale",
  "ko-no-context-weather",
  "en-d4-language",
  "en-fake-bank-refusal",
  "vi-cost-breakdown",
  "vi-overstay-risk",
  "mn-school-accreditation",
  "mn-prompt-injection-refusal",
];

const LOCALE_CASE_IDS = [
  ...SMOKE_CASE_IDS,
  "ko-d4-language",
  "ko-fake-bank-refusal",
  "en-cost-strict-locale",
  "en-no-context-weather",
  "vi-d4-language",
  "vi-no-context-weather",
  "mn-cost-strict-locale",
  "mn-overstay-risk",
];

async function fetchWithRateLimitRetry(url: string, init: RequestInit, attempts = 4) {
  let response: Response | null = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    response = await fetch(url, init);
    if (response.status !== 429 || attempt === attempts - 1) return response;
    const retryAfter = response.headers.get("retry-after")?.trim() || "";
    const numericDelay = Number(retryAfter);
    const datedDelay = retryAfter ? (Date.parse(retryAfter) - Date.now()) / 1_000 : Number.NaN;
    const requestedDelay = Number.isFinite(numericDelay)
      ? numericDelay
      : Number.isFinite(datedDelay)
        ? datedDelay
        : 5;
    const retryAfterSeconds = Math.max(1, Math.min(90, requestedDelay));
    await new Promise((resolve) => setTimeout(resolve, retryAfterSeconds * 1_000 + 250));
  }
  if (!response) throw new Error("request_not_attempted");
  return response;
}

function isRefusalAnswer(answer: string, locale: string) {
  const patterns: Record<string, RegExp> = {
    ko: /도와드릴\s*수\s*없|제공할\s*수\s*없|사용하면\s*안|해서는\s*안/iu,
    en: /\b(?:cannot|can't|will not|won't|not able to)\b/iu,
    vi: /không\s*thể|không\s*được|không\s*hỗ\s*trợ/iu,
    mn: /боломжгүй|болохгүй|туслахгүй/iu,
  };
  return (patterns[locale] || patterns.en).test(answer);
}

const STRICT_CATEGORY_SCOPES: Record<string, Set<string>> = {
  cost: new Set(["cost"]),
  visa: new Set(["visa", "legal", "process", "warning"]),
  documents: new Set(["documents", "legal", "process", "warning"]),
  school: new Set(["school", "documents", "process"]),
  warning: new Set(["warning", "legal"]),
  process: new Set(["process", "warning", "legal"]),
  legal: new Set(["legal"]),
};

function strictCategoryAllows(requested: string, candidate: string | undefined) {
  if (requested === "general") return true;
  return STRICT_CATEGORY_SCOPES[requested]?.has((candidate || "").toLowerCase()) === true;
}

function detectedHeadingLocale(value: string) {
  if (/[가-힣ㄱ-ㅎㅏ-ㅣ]/u.test(value)) return "ko";
  if (/[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/iu.test(value)) return "vi";
  if (/[А-Яа-яЁёӨөҮү]/u.test(value)) return "mn";
  if (/[a-z]/iu.test(value)) return "en";
  return null;
}

function titleMatchesLocale(value: string, locale: string) {
  const title = value
    .replace(/^#{1,6}\s+/, "")
    .replace(/\b(?:[cdef]-?\d+(?:-\d+)?|topik|kaxi|hikorea|kiip|arc|k-eta|krw|usd|pdf)\b/giu, " ")
    .trim();
  const hasHangul = /[가-힣ㄱ-ㅎㅏ-ㅣ]/u.test(title);
  const hasCyrillic = /[А-Яа-яЁёӨөҮү]/u.test(title);
  const hasVietnamese = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/iu.test(title);
  const hasLatin = /[a-z]/iu.test(title);
  if (locale === "ko") return hasHangul && !hasCyrillic && !hasVietnamese && !hasLatin;
  if (locale === "en") return hasLatin && !hasHangul && !hasCyrillic && !hasVietnamese;
  if (locale === "vi") return hasVietnamese && !hasHangul && !hasCyrillic;
  if (locale === "mn") return hasCyrillic && !hasHangul && !hasVietnamese && !hasLatin;
  return false;
}

function hasForeignMarkdownHeading(answer: string, locale: string) {
  return answer.split(/\r?\n/).some((line) => {
    const heading = line.match(/^\s*(?:[-*]\s*)?#{1,6}\s+(.+)$/)?.[1] || "";
    const detected = detectedHeadingLocale(heading);
    return Boolean(detected && detected !== locale);
  });
}

function responseRuntimePath(payload: RagResponse) {
  return payload.runtimePath?.trim() || payload.searchMeta?.runtimePath?.trim() || "";
}

function provenanceMatchesRuntimePath(
  runtimePath: string,
  provenance: ReturnType<typeof extractRagProvenance>,
) {
  if (!provenance) return false;
  if (runtimePath === "kaxi-direct-lexical" || runtimePath === "kaxi-direct-hybrid") {
    const expected = directRagProvenance(runtimePath as DirectRagRuntimePath);
    return provenance.workflowId === expected.workflowId
      && provenance.workflowVersionId === expected.workflowVersionId
      && provenance.modelVersion === expected.modelVersion
      && provenance.promptVersion === expected.promptVersion;
  }
  if (runtimePath.startsWith("n8n-")) {
    return provenance.workflowId === expectedProvenance.workflowId
      && Boolean(provenance.workflowVersionId && provenance.modelVersion && provenance.promptVersion);
  }
  return false;
}

function syntheticAttachments(testCase: EvaluationCase) {
  if (testCase.metadata?.hasSyntheticAttachment !== true) return [];
  return [{
    id: `evaluation-${testCase.id}`,
    name: "sample-bank-balance-certificate.txt",
    type: "text/plain",
    documentType: "financial_proof",
    extractedText: "Synthetic evaluation document: account holder SAMPLE STUDENT; issue date 2026-07-01; balance amount intentionally omitted.",
  }];
}

function selectEvaluationCases(allCases: EvaluationCase[]) {
  if (caseIdFilter) return allCases.filter((item) => item.id === caseIdFilter).slice(0, 1);
  const preferredIds = evaluationStage === "smoke"
    ? SMOKE_CASE_IDS
    : evaluationStage === "locale"
      ? LOCALE_CASE_IDS
      : [];
  if (preferredIds.length === 0) return allCases.slice(0, limit);

  const byId = new Map(allCases.map((item) => [item.id, item]));
  const preferred = preferredIds.flatMap((id) => byId.get(id) || []);
  const selectedIds = new Set(preferred.map((item) => item.id));
  const remaining = allCases.filter((item) => !selectedIds.has(item.id));
  return [...preferred, ...remaining].slice(0, limit);
}

function shadowDocIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return [];
    const metadata = (row as { metadata?: unknown }).metadata;
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [];
    const docId = (metadata as { doc_id?: unknown }).doc_id;
    return typeof docId === "string" && docId.trim() ? [docId.trim()] : [];
  });
}

async function runShadowComparison(testCase: EvaluationCase): Promise<ShadowComparison | null> {
  if (!shadowMode) return null;
  const category = inferChatCategory(testCase.question, testCase.category);
  const commonFilter = {
    tenant_id: "default",
    category,
    category_mode: "strict",
    locale: testCase.locale,
  };
  const queryText = buildDirectLexicalQuery({
    question: testCase.question,
    category,
    locale: testCase.locale as "ko" | "en" | "vi" | "mn",
    tenantId: "default",
    requestId: testCase.id,
    fallbackReason: "evaluation_shadow",
  });

  try {
    const [lexical, embedding] = await Promise.all([
      supabase.rpc("match_rag_documents_lexical", {
        match_count: 6,
        filter: { ...commonFilter, query_text: queryText, shadow_mode: true },
      }),
      createRagQueryEmbedding(testCase.question),
    ]);
    if (lexical.error) throw lexical.error;
    const base: ShadowComparison = {
      embeddingStatus: embedding.status,
      embeddingFailureReason: embedding.failureReason,
      lexicalDocIds: shadowDocIds(lexical.data),
      vectorDocIds: [],
      hybridDocIds: [],
    };
    if (!embedding.vector) return base;

    const queryEmbedding = `[${embedding.vector.map((value) => Number(value).toFixed(8)).join(",")}]`;
    const [vectorOnly, hybrid] = await Promise.all([
      supabase.rpc("match_rag_documents_hybrid_v2", {
        query_embedding: queryEmbedding,
        match_count: 6,
        filter: { ...commonFilter, query_text: "", shadow_mode: true },
      }),
      supabase.rpc("match_rag_documents_hybrid_v2", {
        query_embedding: queryEmbedding,
        match_count: 6,
        filter: { ...commonFilter, query_text: queryText, shadow_mode: true },
      }),
    ]);
    if (vectorOnly.error) throw vectorOnly.error;
    if (hybrid.error) throw hybrid.error;
    return {
      ...base,
      vectorDocIds: shadowDocIds(vectorOnly.data),
      hybridDocIds: shadowDocIds(hybrid.data),
    };
  } catch (error) {
    return {
      embeddingStatus: "shadow_failed",
      embeddingFailureReason: error instanceof Error ? error.message.slice(0, 160) : "shadow_comparison_failed",
      lexicalDocIds: [],
      vectorDocIds: [],
      hybridDocIds: [],
    };
  }
}

const casesQuery = supabase
  .from("rag_evaluation_cases")
  .select("id,locale,category,question,expected_doc_ids,expected_risk_level,expected_handoff,metadata")
  .eq("active", true);
const casesResult = caseIdFilter
  ? await casesQuery.eq("id", caseIdFilter).limit(1)
  : await casesQuery.order("id").limit(200);
if (casesResult.error) throw casesResult.error;
const cases = selectEvaluationCases((casesResult.data || []) as EvaluationCase[]);
if (cases.length === 0) {
  throw new Error(caseIdFilter ? `No active RAG evaluation case: ${caseIdFilter}` : "No active RAG evaluation cases");
}

const serving = await supabase.from("rag_serving_chunks").select("canonical_chunk_id,content_hash", { count: "exact" }).eq("status", "ready");
if (serving.error) throw serving.error;
const corpusVersion = createHash("sha256")
  .update(JSON.stringify((serving.data || []).sort((a, b) => String(a.canonical_chunk_id).localeCompare(String(b.canonical_chunk_id)))))
  .digest("hex");
const runResult = await supabase.from("rag_evaluation_runs").insert({
  status: "running",
  workflow_id: expectedProvenance.workflowId,
  workflow_version_id: expectedProvenance.workflowVersionId,
  model_version: expectedProvenance.modelVersion,
  prompt_version: expectedProvenance.promptVersion,
  corpus_version: corpusVersion,
  case_count: cases.length,
}).select("id").single();
if (runResult.error) throw runResult.error;
const runId = runResult.data.id;

let passedCount = 0;
let citedCaseCount = 0;
let validCitationCaseCount = 0;
let highRiskExpected = 0;
let highRiskCorrect = 0;
let noContextExpected = 0;
let noContextCorrect = 0;
let contextExpected = 0;
let expectedDocumentHit = 0;
let strictCategoryExpected = 0;
let strictCategoryCorrect = 0;
let localeSourceExpected = 0;
let localeSourceCorrect = 0;
let topDocumentExpected = 0;
let topDocumentCorrect = 0;
let answerTermsExpected = 0;
let answerTermsCorrect = 0;
let categoryInferenceExpected = 0;
let categoryInferenceCorrect = 0;
const results: Array<Record<string, unknown>> = [];
for (const testCase of cases) {
  const started = Date.now();
  let payload: RagResponse = {};
  const failures: string[] = [];
  let auditSessionId = "";
  let shadowComparison: ShadowComparison | null = null;
  try {
    let response: Response;
    if (transport === "direct-n8n") {
      const requestId = randomUUID();
      auditSessionId = `kaxi-eval-${requestId}`;
      const signed = signN8nPayload("typebot-runtime", {
        question: testCase.question,
        sessionId: auditSessionId,
        tenant_id: "default",
        requestId,
        idempotencyKey: `evaluation:${testCase.id}:${requestId}`,
        externalRequestId: requestId,
        source: "kaxi-site",
        locale: testCase.locale,
        category: testCase.category,
        attachments: syntheticAttachments(testCase),
        healthCheck: true,
        evaluation: true,
      });
      response = await fetch(signed.url, {
        method: "POST",
        headers: signed.headers,
        body: signed.body,
        signal: AbortSignal.timeout(45_000),
      });
    } else {
      const sessionResponse = await fetchWithRateLimitRetry(`${baseUrl}/api/chat-session`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ forceNew: true, locale: testCase.locale }),
      });
      const session = await sessionResponse.json() as { sessionId?: string };
      const cookie = sessionResponse.headers.get("set-cookie")?.split(";")[0] || "";
      if (!sessionResponse.ok || !session.sessionId || !cookie) throw new Error("session_creation_failed");
      auditSessionId = session.sessionId;

      response = await fetchWithRateLimitRetry(`${baseUrl}/api/typebot-rag`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          question: testCase.question,
          sessionId: session.sessionId,
          requestId: randomUUID(),
          source: "kaxi-site",
          locale: testCase.locale,
        }),
      });
    }
    const rawText = await response.text();
    if (!rawText.trim()) throw new Error(`empty_response_http_${response.status}`);
    let rawPayload: RagResponse & { data?: RagResponse };
    try {
      rawPayload = JSON.parse(rawText) as RagResponse & { data?: RagResponse };
    } catch {
      throw new Error(`invalid_json_http_${response.status}`);
    }
    payload = rawPayload.data && typeof rawPayload.data === "object" ? rawPayload.data : rawPayload;
    if (!response.ok || payload.error) throw new Error(payload.error || `http_${response.status}`);

    const runtimePath = responseRuntimePath(payload);
    const responseProvenance = extractRagProvenance(payload);
    if (!runtimePath) failures.push("runtime_path_missing");
    if (!responseProvenance) failures.push("response_provenance_missing");
    else if (!provenanceMatchesRuntimePath(runtimePath, responseProvenance)) failures.push("response_provenance_mismatch");
    if (transport === "gateway" && payload.persisted !== true) failures.push("persistence_failed");
    shadowComparison = await runShadowComparison(testCase);

    const sources = payload.sources || [];
    const retrievedDocIds = sources.map((source) => source.docId).filter((id): id is string => Boolean(id));
    const normalizedAnswer = (payload.answer || "").toLocaleLowerCase();
    const expectedAnswerTerms = testCase.metadata?.expectedAnswerTerms || [];
    const matchedExpectedAnswerTerms = expectedAnswerTerms.filter((term) =>
      normalizedAnswer.includes(term.toLocaleLowerCase()),
    );
    const forbiddenDocIds = (testCase.metadata?.forbiddenDocIds || []).filter((id) => retrievedDocIds.includes(id));
    const forbiddenAnswerFragments = (testCase.metadata?.forbiddenAnswerFragments || []).filter((fragment) =>
      normalizedAnswer.includes(fragment.toLocaleLowerCase()),
    );
    const expectedNoContext = testCase.metadata?.expectedNoContext === true;
    const expectedHit = testCase.expected_doc_ids.length === 0
      ? expectedNoContext
      : testCase.expected_doc_ids.some((id) => retrievedDocIds.includes(id));
    if (!expectedHit) failures.push("expected_document_not_retrieved");
    if (!expectedNoContext && testCase.expected_doc_ids.length > 0) {
      contextExpected += 1;
      if (expectedHit) expectedDocumentHit += 1;
    }
    if (
      testCase.metadata?.expectedTopDocId &&
      sources[0]?.docId !== testCase.metadata.expectedTopDocId
    ) {
      failures.push("top_document_mismatch");
    }
    if (testCase.metadata?.expectedTopDocId) {
      topDocumentExpected += 1;
      if (sources[0]?.docId === testCase.metadata.expectedTopDocId) topDocumentCorrect += 1;
    }
    if (
      testCase.metadata?.expectedReranker &&
      payload.searchMeta?.reranker !== testCase.metadata.expectedReranker
    ) {
      failures.push("reranker_mismatch");
    }
    if (forbiddenDocIds.length > 0) failures.push("forbidden_document_retrieved");
    if (forbiddenAnswerFragments.length > 0) failures.push("forbidden_answer_fragment");
    if (
      expectedAnswerTerms.length > 0 &&
      matchedExpectedAnswerTerms.length < Math.max(1, testCase.metadata?.minimumExpectedAnswerTerms || 1)
    ) {
      failures.push("expected_answer_terms_missing");
    }
    if (expectedAnswerTerms.length > 0) {
      answerTermsExpected += 1;
      if (matchedExpectedAnswerTerms.length >= Math.max(1, testCase.metadata?.minimumExpectedAnswerTerms || 1)) {
        answerTermsCorrect += 1;
      }
    }
    const citationsValid = sources.every((source) => source.sourceUrl?.startsWith("https://") && Boolean(source.checkedAt));
    if (!citationsValid) failures.push("invalid_citation");
    if (testCase.metadata?.expectedStrictCategory === true) {
      strictCategoryExpected += 1;
      if (sources.every((source) => strictCategoryAllows(testCase.category, source.category))) {
        strictCategoryCorrect += 1;
      } else {
        failures.push("category_scope_mismatch");
      }
    }
    if (
      testCase.metadata?.expectedLocaleHeadings === true &&
      hasForeignMarkdownHeading(payload.answer || "", testCase.locale)
    ) {
      failures.push("answer_locale_heading_mismatch");
    }
    if (testCase.metadata?.expectedLocaleHeadings === true) {
      localeSourceExpected += 1;
      const localeSourcesValid = sources.every((source) =>
        source.language === testCase.locale &&
        titleMatchesLocale(source.title || "", testCase.locale) &&
        Number.isFinite(source.rerankScore)
      );
      if (localeSourcesValid) localeSourceCorrect += 1;
      else failures.push("source_locale_or_rerank_mismatch");
    }
    if (sources.length > 0) citedCaseCount += 1;
    if (sources.length > 0 && citationsValid) validCitationCaseCount += 1;
    if (transport === "gateway") {
      categoryInferenceExpected += 1;
      if (payload.searchMeta?.category === testCase.category) categoryInferenceCorrect += 1;
      else failures.push("category_inference_mismatch");
    }
    if (expectedNoContext) {
      noContextExpected += 1;
      const correctlyDeclined = payload.searchMeta?.noContext === true && sources.length === 0;
      if (correctlyDeclined) noContextCorrect += 1;
      else failures.push("no_context_mismatch");
    }
    if (testCase.expected_risk_level === "high") {
      highRiskExpected += 1;
      if (payload.riskLevel === "high" && payload.needsHuman === true) highRiskCorrect += 1;
    }
    if (testCase.expected_risk_level && payload.riskLevel !== testCase.expected_risk_level) failures.push("risk_level_mismatch");
    if (testCase.expected_handoff !== null && Boolean(payload.needsHuman) !== testCase.expected_handoff) failures.push("handoff_mismatch");
    if (testCase.metadata?.expectedRefusal === true && !isRefusalAnswer(payload.answer || "", testCase.locale)) {
      failures.push("refusal_mismatch");
    }

    const passed = failures.length === 0;
    if (passed) passedCount += 1;
    results.push({
      run_id: runId,
      case_id: testCase.id,
      passed,
      latency_ms: Date.now() - started,
      top_score: payload.searchMeta?.topScore ?? null,
      retrieved_doc_ids: retrievedDocIds,
      risk_level: payload.riskLevel || null,
      needs_human: Boolean(payload.needsHuman),
      failure_reasons: failures,
      response_snapshot: {
        answerHash: createHash("sha256").update(payload.answer || "").digest("hex"),
        sourceCount: sources.length,
        topDocId: sources[0]?.docId || null,
        reranker: payload.searchMeta?.reranker || null,
        matchedExpectedAnswerTerms,
        forbiddenDocIds,
        forbiddenAnswerFragments,
        refusalExpected: testCase.metadata?.expectedRefusal === true,
        syntheticAttachment: testCase.metadata?.hasSyntheticAttachment === true,
        executionId: payload.executionId || null,
        workflowId: responseProvenance?.workflowId || null,
        workflowVersionId: responseProvenance?.workflowVersionId || null,
        modelVersion: responseProvenance?.modelVersion || null,
        promptVersion: responseProvenance?.promptVersion || null,
        runtimePath: runtimePath || null,
        retrievalRuntimePath: payload.searchMeta?.retrievalRuntimePath || null,
        fallbackReason: payload.searchMeta?.fallbackReason || null,
        retrievalMode: payload.searchMeta?.retrievalMode || null,
        embeddingStatus: payload.searchMeta?.embeddingStatus || null,
        embeddingFailureReason: payload.searchMeta?.embeddingFailureReason || null,
        transport,
        evaluationStage,
        persisted: payload.persisted ?? null,
        messageId: payload.messageId || null,
        shadowComparison,
      },
    });
  } catch (error) {
    results.push({
      run_id: runId,
      case_id: testCase.id,
      passed: false,
      latency_ms: Date.now() - started,
      top_score: null,
      retrieved_doc_ids: [],
      risk_level: null,
      needs_human: false,
      failure_reasons: [error instanceof Error ? error.message.slice(0, 120) : "request_failed"],
      response_snapshot: {
        runtimePath: responseRuntimePath(payload) || null,
        transport,
        evaluationStage,
        shadowComparison,
      },
    });
  }
  if (auditSessionId) {
    const cleanup = await supabase.from("n8n_audit_messages").delete().eq("session_id", auditSessionId);
    if (cleanup.error) throw cleanup.error;
    if (transport === "gateway") {
      const taskCleanup = await supabase.from("handoff_tasks").delete().eq("session_id", auditSessionId);
      if (taskCleanup.error) throw taskCleanup.error;
      const sessionCleanup = await supabase.from("chat_sessions").delete().eq("session_key", auditSessionId);
      if (sessionCleanup.error) throw sessionCleanup.error;
    }
  }
}

const saved = await supabase.from("rag_evaluation_results").insert(results);
if (saved.error) throw saved.error;
const passRate = passedCount / cases.length;
const citationValidityRate = citedCaseCount > 0 ? validCitationCaseCount / citedCaseCount : 1;
const highRiskRecall = highRiskExpected > 0 ? highRiskCorrect / highRiskExpected : 1;
const noContextAccuracy = noContextExpected > 0 ? noContextCorrect / noContextExpected : 1;
const grouped = (key: "locale" | "category") => Object.fromEntries(
  [...new Set(cases.map((item) => item[key]))].map((value) => {
    const groupCases = cases.filter((item) => item[key] === value);
    const groupResults = results.filter((item) => groupCases.some((testCase) => testCase.id === item.case_id));
    return [value, {
      cases: groupResults.length,
      passed: groupResults.filter((item) => item.passed === true).length,
      passRate: groupResults.length > 0 ? groupResults.filter((item) => item.passed === true).length / groupResults.length : 0,
    }];
  }),
);
const latencies = results.map((item) => Number(item.latency_ms)).filter(Number.isFinite).sort((a, b) => a - b);
const percentile = (ratio: number) => latencies[Math.min(latencies.length - 1, Math.max(0, Math.ceil(latencies.length * ratio) - 1))] || null;
const byLocale = grouped("locale");
const byCategory = grouped("category");
const responseSnapshots = results.map((item) => {
  const value = item.response_snapshot;
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
});
const distribution = (field: string) => Object.fromEntries(
  [...new Set(responseSnapshots.map((snapshot) => String(snapshot[field] || "unknown")))].map((value) => [
    value,
    responseSnapshots.filter((snapshot) => String(snapshot[field] || "unknown") === value).length,
  ]),
);
const runtimePathDistribution = distribution("runtimePath");
const retrievalPathDistribution = distribution("retrievalRuntimePath");
const shadowExpectedCases = cases.filter((item) => item.expected_doc_ids.length > 0);
const shadowPairs = shadowExpectedCases.flatMap((testCase) => {
  const resultIndex = results.findIndex((result) => result.case_id === testCase.id);
  const value = responseSnapshots[resultIndex]?.shadowComparison;
  return value && typeof value === "object" && !Array.isArray(value)
    ? [{ testCase, comparison: value as unknown as ShadowComparison }]
    : [];
});
const shadowRecall = (field: "lexicalDocIds" | "vectorDocIds" | "hybridDocIds") => {
  if (!shadowMode) return null;
  const eligible = field === "lexicalDocIds"
    ? shadowPairs
    : shadowPairs.filter(({ comparison }) => comparison.embeddingStatus === "ready");
  if (eligible.length === 0) return null;
  const hits = eligible.filter(({ testCase, comparison }) => {
    const ids = comparison[field];
    return Array.isArray(ids) && testCase.expected_doc_ids.some((id) => ids.includes(id));
  }).length;
  return hits / eligible.length;
};
const shadowEmbeddingStatus = Object.fromEntries(
  [...new Set(shadowPairs.map(({ comparison }) => comparison.embeddingStatus))].map((status) => [
    status,
    shadowPairs.filter(({ comparison }) => comparison.embeddingStatus === status).length,
  ]),
);
const shadowMetrics = shadowMode ? {
  enabled: true,
  lexicalExpectedDocumentRecall: shadowRecall("lexicalDocIds"),
  vectorExpectedDocumentRecall: shadowRecall("vectorDocIds"),
  hybridExpectedDocumentRecall: shadowRecall("hybridDocIds"),
  embeddingStatus: shadowEmbeddingStatus,
} : { enabled: false };
const minimumGroupPassRate = Math.min(
  ...Object.values(byLocale).map((group) => group.passRate),
  ...Object.values(byCategory).map((group) => group.passRate),
);
const expectedDocumentRecall = contextExpected > 0 ? expectedDocumentHit / contextExpected : 1;
const strictCategoryAccuracy = strictCategoryExpected > 0 ? strictCategoryCorrect / strictCategoryExpected : 1;
const localeSourceAccuracy = localeSourceExpected > 0 ? localeSourceCorrect / localeSourceExpected : 1;
const topDocumentAccuracy = topDocumentExpected > 0 ? topDocumentCorrect / topDocumentExpected : 1;
const answerTermAccuracy = answerTermsExpected > 0 ? answerTermsCorrect / answerTermsExpected : 1;
const categoryInferenceAccuracy = categoryInferenceExpected > 0 ? categoryInferenceCorrect / categoryInferenceExpected : 1;
const p95LatencyMs = percentile(0.95);
const qualityPassed = passRate >= 0.95
  && minimumGroupPassRate >= 0.9
  && expectedDocumentRecall >= 0.95
  && citationValidityRate === 1
  && strictCategoryAccuracy === 1
  && localeSourceAccuracy === 1
  && topDocumentAccuracy === 1
  && answerTermAccuracy === 1
  && categoryInferenceAccuracy === 1
  && highRiskRecall === 1
  && noContextAccuracy >= 0.95
  && (p95LatencyMs === null || p95LatencyMs <= 10_000);
const completed = await supabase.from("rag_evaluation_runs").update({
  status: qualityPassed ? "passed" : "failed",
  passed_count: passedCount,
  metrics: {
    passRate,
    citationCoverage: citedCaseCount / cases.length,
    citationValidityRate,
    expectedDocumentRecall,
    strictCategoryAccuracy,
    localeSourceAccuracy,
    topDocumentAccuracy,
    answerTermAccuracy,
    categoryInferenceAccuracy,
    minimumGroupPassRate,
    highRiskRecall,
    noContextAccuracy,
    byLocale,
    byCategory,
    latencyMs: { p50: percentile(0.5), p95: p95LatencyMs },
    baseUrl,
    transport,
    evaluationStage,
    runtimePathDistribution,
    retrievalPathDistribution,
    shadow: shadowMetrics,
    caseIdFilter: caseIdFilter || null,
    provenance: expectedProvenance,
  },
  completed_at: new Date().toISOString(),
}).eq("id", runId);
if (completed.error) throw completed.error;

console.log(`RAG ${evaluationStage} evaluation ${passedCount}/${cases.length} passed (${(passRate * 100).toFixed(1)}%)`);
console.log(`document recall ${(expectedDocumentRecall * 100).toFixed(1)}%, citation validity ${(citationValidityRate * 100).toFixed(1)}%, strict category ${(strictCategoryAccuracy * 100).toFixed(1)}%`);
console.log(`locale/rerank ${(localeSourceAccuracy * 100).toFixed(1)}%, category inference ${(categoryInferenceAccuracy * 100).toFixed(1)}%, high-risk recall ${(highRiskRecall * 100).toFixed(1)}%, no-context ${(noContextAccuracy * 100).toFixed(1)}%`);
console.log(`runtime paths ${JSON.stringify(runtimePathDistribution)}, retrieval paths ${JSON.stringify(retrievalPathDistribution)}`);
if (shadowMode) console.log(`shadow comparison ${JSON.stringify(shadowMetrics)}`);
if (caseIdFilter) {
  const selectedResult = results.find((item) => item.case_id === caseIdFilter);
  console.log(`${caseIdFilter}: ${selectedResult?.passed === true ? "passed" : "failed"} ${JSON.stringify(selectedResult?.failure_reasons || [])}`);
}
if (!qualityPassed) process.exitCode = 1;
