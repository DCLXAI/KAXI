import { createHash, randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
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
    hasSyntheticAttachment?: boolean;
  } | null;
};

type RagResponse = {
  answer?: string;
  riskLevel?: string;
  needsHuman?: boolean;
  sources?: Array<{ docId?: string; sourceUrl?: string; checkedAt?: string }>;
  searchMeta?: { topScore?: number; noContext?: boolean; retrievedCount?: number };
  executionId?: string;
  error?: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
const baseUrl = (process.env.KAXI_E2E_BASE_URL?.trim() || "http://localhost:3002").replace(/\/$/, "");
if (!supabaseUrl || !serviceKey) throw new Error("Supabase service configuration is required");
const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const limit = Math.min(Math.max(Number(process.env.RAG_EVAL_LIMIT || 100), 1), 200);
const transport = process.env.RAG_EVAL_TRANSPORT?.trim() === "gateway" ? "gateway" : "direct-n8n";

function isRefusalAnswer(answer: string, locale: string) {
  const patterns: Record<string, RegExp> = {
    ko: /도와드릴\s*수\s*없|제공할\s*수\s*없|사용하면\s*안|해서는\s*안/iu,
    en: /\b(?:cannot|can't|will not|won't|not able to)\b/iu,
    vi: /không\s*thể|không\s*được|không\s*hỗ\s*trợ/iu,
    mn: /боломжгүй|болохгүй|туслахгүй/iu,
  };
  return (patterns[locale] || patterns.en).test(answer);
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

const casesResult = await supabase
  .from("rag_evaluation_cases")
  .select("id,locale,category,question,expected_doc_ids,expected_risk_level,expected_handoff,metadata")
  .eq("active", true)
  .order("id")
  .limit(limit);
if (casesResult.error) throw casesResult.error;
const cases = (casesResult.data || []) as EvaluationCase[];
if (cases.length === 0) throw new Error("No active RAG evaluation cases");

const serving = await supabase.from("rag_serving_chunks").select("canonical_chunk_id,content_hash", { count: "exact" }).eq("status", "ready");
if (serving.error) throw serving.error;
const corpusVersion = createHash("sha256")
  .update(JSON.stringify((serving.data || []).sort((a, b) => String(a.canonical_chunk_id).localeCompare(String(b.canonical_chunk_id)))))
  .digest("hex");
const runResult = await supabase.from("rag_evaluation_runs").insert({
  status: "running",
  workflow_id: "EqX3C5c2WNWoKkSR",
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
const results: Array<Record<string, unknown>> = [];
for (const testCase of cases) {
  const started = Date.now();
  let payload: RagResponse = {};
  const failures: string[] = [];
  let auditSessionId = "";
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
      const sessionResponse = await fetch(`${baseUrl}/api/chat-session`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ forceNew: true, locale: testCase.locale }),
      });
      const session = await sessionResponse.json() as { sessionId?: string };
      const cookie = sessionResponse.headers.get("set-cookie")?.split(";")[0] || "";
      if (!sessionResponse.ok || !session.sessionId || !cookie) throw new Error("session_creation_failed");

      response = await fetch(`${baseUrl}/api/typebot-rag`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          question: testCase.question,
          sessionId: session.sessionId,
          requestId: randomUUID(),
          source: "kaxi-site",
          locale: testCase.locale,
          category: testCase.category,
        }),
      });
    }
    const rawPayload = await response.json() as RagResponse & { data?: RagResponse };
    payload = rawPayload.data && typeof rawPayload.data === "object" ? rawPayload.data : rawPayload;
    if (!response.ok || payload.error) throw new Error(payload.error || `http_${response.status}`);

    const sources = payload.sources || [];
    const retrievedDocIds = sources.map((source) => source.docId).filter((id): id is string => Boolean(id));
    const expectedNoContext = testCase.metadata?.expectedNoContext === true;
    const expectedHit = testCase.expected_doc_ids.length === 0
      ? expectedNoContext
      : testCase.expected_doc_ids.some((id) => retrievedDocIds.includes(id));
    if (!expectedHit) failures.push("expected_document_not_retrieved");
    const citationsValid = sources.every((source) => source.sourceUrl?.startsWith("https://") && Boolean(source.checkedAt));
    if (!citationsValid) failures.push("invalid_citation");
    if (sources.length > 0) citedCaseCount += 1;
    if (citationsValid) validCitationCaseCount += 1;
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
        refusalExpected: testCase.metadata?.expectedRefusal === true,
        syntheticAttachment: testCase.metadata?.hasSyntheticAttachment === true,
        executionId: payload.executionId || null,
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
      response_snapshot: {},
    });
  }
  if (auditSessionId) {
    const cleanup = await supabase.from("n8n_audit_messages").delete().eq("session_id", auditSessionId);
    if (cleanup.error) throw cleanup.error;
  }
}

const saved = await supabase.from("rag_evaluation_results").insert(results);
if (saved.error) throw saved.error;
const passRate = passedCount / cases.length;
const citationValidityRate = validCitationCaseCount / cases.length;
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
const qualityPassed = passRate >= 0.85 && citationValidityRate === 1 && highRiskRecall === 1 && noContextAccuracy >= 0.75;
const completed = await supabase.from("rag_evaluation_runs").update({
  status: qualityPassed ? "passed" : "failed",
  passed_count: passedCount,
  metrics: {
    passRate,
    citationCoverage: citedCaseCount / cases.length,
    citationValidityRate,
    highRiskRecall,
    noContextAccuracy,
    byLocale: grouped("locale"),
    byCategory: grouped("category"),
    latencyMs: { p50: percentile(0.5), p95: percentile(0.95) },
    baseUrl,
    transport,
  },
  completed_at: new Date().toISOString(),
}).eq("id", runId);
if (completed.error) throw completed.error;

console.log(`RAG evaluation ${passedCount}/${cases.length} passed (${(passRate * 100).toFixed(1)}%)`);
console.log(`citation validity ${(citationValidityRate * 100).toFixed(1)}%, high-risk recall ${(highRiskRecall * 100).toFixed(1)}%, no-context ${(noContextAccuracy * 100).toFixed(1)}%`);
if (!qualityPassed) process.exitCode = 1;
