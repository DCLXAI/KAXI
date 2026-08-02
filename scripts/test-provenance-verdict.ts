import assert from "node:assert/strict";
import { RAG_QUERY_EMBEDDING_DIMENSIONS, RAG_QUERY_EMBEDDING_MODEL } from "../src/lib/chat/query-embedding";
import {
  classifyRunProvenance,
  describeRunProvenance,
  expectedRetrievalIdentity,
} from "../src/lib/ops/provenance-verdict";
import { evaluateRagQualityRun } from "../src/lib/ops/rag-system-health";

// P0-7. Three systems produce one answer — n8n orchestrates, KARXY's direct
// hybrid retrieves, an LLM generates — and the health gate compared all three
// against the n8n workflow identity. A correct direct-hybrid run records the
// RETRIEVER's identity, so it was reported as drift.
//
// The expected values were also hardcoded and had gone stale on three of four
// fields against the live n8n contract, so the comparison could never match on
// any path. It fired every run and was muted to stop it holding health at
// degraded. That is the failure this file exists to prevent: a check that
// always fires teaches everyone to ignore it.
//
// Pure functions, so no credentials and no model.

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

const RETRIEVAL = {
  provider: "karxy-supabase",
  embeddingModel: RAG_QUERY_EMBEDDING_MODEL,
  embeddingDimensions: RAG_QUERY_EMBEDDING_DIMENSIONS,
};

// 1. The expectation is derived, not written down. A hand-typed copy is exactly
//    what went stale, so this asserts it tracks the retriever's own constants.
{
  const expected = expectedRetrievalIdentity();
  assert.equal(expected.embeddingModel, RAG_QUERY_EMBEDDING_MODEL);
  assert.equal(expected.embeddingDimensions, RAG_QUERY_EMBEDDING_DIMENSIONS);
}

// 2. The case that was firing forever: a healthy direct-hybrid run whose
//    orchestration identity nobody declared.
{
  const verdict = classifyRunProvenance({
    observedPaths: ["kaxi-direct-hybrid"],
    retrieval: RETRIEVAL,
    orchestration: { workflowId: "kaxi-direct-hybrid", workflowVersionId: "direct@2026-07-14" },
    expectedOrchestration: null,
  });
  assert.equal(verdict.retrieval.status, "match", "a run using the configured retriever must not be drift");
  assertOk(!verdict.drifted, "an undeclared orchestration expectation must not be reported as drift");
  assert.equal(verdict.orchestration.status, "unverifiable");
  assert.deepEqual(verdict.unverifiable, ["orchestration"], "the gap must stay visible, not disappear");
}

// 3. A clarification answer never searched. Counting that as "pgvector was not
//    used" is how a correct response became a failing case.
{
  const verdict = classifyRunProvenance({
    observedPaths: ["kaxi-question-mediator"],
    retrieval: null,
    orchestration: null,
    expectedOrchestration: null,
  });
  assert.equal(verdict.retrieval.status, "not_applicable");
  assertOk(!verdict.drifted, "a mediator-only run must not count as provenance drift");
  assertOk(
    !verdict.unverifiable.includes("retrieval"),
    "'did not retrieve' and 'we could not tell whether it retrieved' are different facts",
  );
}

// 4. A run that walks several paths is normal. Collapsing it into one identity
//    is what lost the information in the first place.
{
  const verdict = classifyRunProvenance({
    observedPaths: ["kaxi-direct-hybrid", "kaxi-question-mediator", "kaxi-direct-hybrid"],
    retrieval: RETRIEVAL,
    orchestration: null,
    expectedOrchestration: null,
  });
  assertOk(verdict.mixedPaths, "a multi-path run must be recorded as mixed");
  assert.deepEqual(verdict.observedPaths, ["kaxi-direct-hybrid", "kaxi-question-mediator"],
    "paths must be de-duplicated and stable, so the summary is comparable between runs");
  assert.equal(verdict.retrieval.status, "match", "one non-retrieving path among retrieving ones is not a failure");
  assertOk(describeRunProvenance(verdict).includes("2 runtime paths"), "the summary must say the run was mixed");
}

console.log("PASS provenance verdict: a correct direct-hybrid or mediator run is no longer reported as drift");

// 5. Real drift must still fire — the point is a quieter signal, not a silent one.
{
  const wrongModel = classifyRunProvenance({
    observedPaths: ["kaxi-direct-hybrid"],
    retrieval: { ...RETRIEVAL, embeddingModel: "text-embedding-ada-002" },
    orchestration: null,
    expectedOrchestration: null,
  });
  assertOk(wrongModel.drifted, "answers retrieved with a different embedding model must fail the gate");
  assert.equal(wrongModel.retrieval.status, "drift");
  assertOk(
    wrongModel.retrieval.status === "drift" && wrongModel.retrieval.reason.includes("embeddingModel"),
    "the reason must name the field that moved",
  );

  const wrongDimensions = classifyRunProvenance({
    observedPaths: ["kaxi-direct-hybrid"],
    retrieval: { ...RETRIEVAL, embeddingDimensions: 384 },
    orchestration: null,
    expectedOrchestration: null,
  });
  assertOk(wrongDimensions.drifted, "a fallback-dimension retrieval must fail the gate");

  // Declared orchestration expectations ARE compared — the rule is "assert what
  // was declared", not "never assert".
  const orchDrift = classifyRunProvenance({
    observedPaths: ["n8n-rag"],
    retrieval: RETRIEVAL,
    orchestration: { workflowId: "bHHyeC1DCUSvi7Px", workflowVersionId: "kaxi-rag-runtime@2026-07-14.railway-mcp-v3" },
    expectedOrchestration: { workflowId: "bHHyeC1DCUSvi7Px", workflowVersionId: "kaxi-rag-runtime@2026-07-14.railway-mcp-v2" },
  });
  assertOk(orchDrift.drifted, "a declared orchestration version that moved must fire");
  assertOk(
    orchDrift.orchestration.status === "drift" && orchDrift.orchestration.actual.includes("v3"),
    "the verdict must carry the actual value, so a failed gate is reproducible",
  );
}

console.log("PASS provenance verdict: a changed retriever or a declared-and-moved workflow still fires");

// 6. The health gate must use all of the above, and must report enough that a
//    failed run can be reproduced without opening the database.
{
  const row = {
    id: "run-1",
    status: "passed",
    case_count: 70,
    passed_count: 70,
    completed_at: new Date().toISOString(),
    workflow_id: "kaxi-direct-hybrid",
    workflow_version_id: "direct@2026-07-14",
    model_version: "retrieval/hybrid-rrf-v3+rerank-v11@2026-07-14",
    prompt_version: "kaxi-grounded-extractive@2026-07-13.p0-v1",
    metrics: {
      passRate: 1, expectedDocumentRecall: 1, citationValidityRate: 1,
      strictCategoryAccuracy: 1, localeSourceAccuracy: 1, highRiskRecall: 1,
      noContextAccuracy: 1, minimumGroupPassRate: 1,
      runtimePathDistribution: { "kaxi-direct-hybrid": 60, "kaxi-question-mediator": 10 },
      retrieval: RETRIEVAL,
    },
  };

  const snapshot = { ...process.env };
  try {
    delete process.env.N8N_RAG_WORKFLOW_ID;
    delete process.env.N8N_RAG_WORKFLOW_VERSION_ID;
    const result = evaluateRagQualityRun(row, undefined, Date.now());

    assertOk(result.ok, `a healthy direct-hybrid run must pass the gate: ${result.detail}`);
    assertOk(
      !(result.metadata.failures as string[]).includes("provenance"),
      "the run that used exactly the configured retriever must not be a provenance failure",
    );

    const provenance = result.metadata.provenance as Record<string, unknown>;
    assertOk(provenance, "the gate must report per-component provenance");
    assert.deepEqual(provenance.observedPaths, ["kaxi-direct-hybrid", "kaxi-question-mediator"]);
    assertOk(provenance.mixedPaths === true, "a mixed run must be reported as mixed rather than collapsed");
    // Completion condition: a failed gate must be reproducible from what it reports.
    const recorded = provenance.recorded as Record<string, unknown>;
    assert.equal(recorded.workflowVersionId, "direct@2026-07-14");
    assert.equal(recorded.modelVersion, "retrieval/hybrid-rrf-v3+rerank-v11@2026-07-14");
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in snapshot)) delete process.env[key];
    Object.assign(process.env, snapshot);
  }
}

console.log("PASS provenance verdict: the health gate passes a healthy run and reports enough to reproduce a failed one");
