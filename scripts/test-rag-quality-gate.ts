import { strict as assert } from "assert";
import { readFileSync } from "fs";
import { evaluateRagQualityRun } from "../src/lib/ops/rag-system-health";

// The rag.quality_evaluation check held /api/ops/health at `degraded` every day
// for weeks. Not because answer quality regressed — the last full suite passed
// 70/70 — but because the run was older than the 7-day window and carried a
// different provenance than production, and there is no scheduled runner that
// could ever refresh it. A permanently red health signal is why a real
// n8n/Typebot outage arrived looking like one more identical daily alert.
//
// So the check now separates two different facts: quality was measured and
// regressed (production is serving worse answers — required), versus quality
// has not been measured lately (an operational gap — warning). This pins that
// split, including the case where both are true at once.

const EXPECTED = {
  workflowId: "bHHyeC1DCUSvi7Px",
  workflowVersionId: "kaxi-rag-runtime@2026-07-14.railway-mcp-v2",
  modelVersion: "retrieval/hybrid-rrf-v3@2026-07-14",
  promptVersion: "kaxi-grounded-extractive@2026-07-13.p0-v1",
};

const PASSING_METRICS = {
  passRate: 1,
  minimumGroupPassRate: 1,
  expectedDocumentRecall: 1,
  citationValidityRate: 1,
  strictCategoryAccuracy: 1,
  localeSourceAccuracy: 1,
  highRiskRecall: 1,
  noContextAccuracy: 1,
};

const NOW = Date.parse("2026-07-29T18:00:00Z");
const FRESH = "2026-07-29T12:00:00Z";

function run(overrides: Record<string, unknown>) {
  return evaluateRagQualityRun(
    {
      id: "run",
      status: "passed",
      case_count: 70,
      passed_count: 70,
      metrics: PASSING_METRICS,
      workflow_id: EXPECTED.workflowId,
      workflow_version_id: EXPECTED.workflowVersionId,
      model_version: EXPECTED.modelVersion,
      prompt_version: EXPECTED.promptVersion,
      completed_at: FRESH,
      ...overrides,
    } as never,
    EXPECTED,
    NOW,
  );
}

const healthy = run({});
assert.equal(healthy.ok, true, "a fresh, matching, passing run must satisfy the gate");

// The production situation as of 2026-07-29: measured quality passed, but the
// run is 15 days old and was stamped by a different pipeline.
const stale = run({
  workflow_id: "kaxi-direct-hybrid",
  workflow_version_id: "kaxi-direct-hybrid@2026-07-14.p8-v12",
  completed_at: "2026-07-14T15:13:00Z",
});
assert.equal(stale.ok, false, "a stale run must not report the gate as satisfied");
assert.equal(
  stale.unverified,
  true,
  "staleness and provenance drift mean quality is unmeasured, not proven bad — it must not hold health at degraded"
);
assert.match(stale.detail, /rag:evaluation:full/, "the detail must say how to restore the signal");

const never = evaluateRagQualityRun(null, EXPECTED, NOW);
assert.equal(never.ok, false, "no run at all must not satisfy the gate");
assert.equal(never.unverified, true, "no run at all is unmeasured, not a production failure");

// A measured regression is the case that must still page.
const regressed = run({ passed_count: 40, metrics: { ...PASSING_METRICS, passRate: 0.5 } });
assert.equal(regressed.ok, false, "a failing metric must not satisfy the gate");
assert.equal(
  regressed.unverified,
  false,
  "a measured quality regression must stay a required failure"
);

// Both at once must be treated as a regression: a real failure hidden behind a
// stale timestamp is exactly what this split must not let through.
const regressedAndStale = run({
  passed_count: 40,
  metrics: { ...PASSING_METRICS, passRate: 0.5 },
  workflow_id: "kaxi-direct-hybrid",
  completed_at: "2026-07-14T15:13:00Z",
});
assert.equal(
  regressedAndStale.unverified,
  false,
  "a failing metric must stay required even when the run is also stale"
);

const tooFewCases = run({ case_count: 12 });
assert.equal(tooFewCases.ok, false, "a partial suite must not satisfy the full-suite gate");
assert.equal(tooFewCases.unverified, false, "an undersized suite is a measurement defect, not staleness");

console.log("PASS rag quality gate: measured regressions page, unmeasured quality warns");

// The readiness probe used to select the 1536-dimension vectors for every
// knowledge chunk and serving row purely to ask Boolean(embedding), shipping
// megabytes of Supabase egress on an unauthenticated endpoint that the deploy
// gate polls every 30 seconds. Measured against production: 5.1s -> 2.3s median.
// Keep the vectors out of the projection status path.
{
  const projection = readFileSync("src/lib/knowledge/serving-projection.ts", "utf8");
  const loadProjectionData = projection.slice(
    projection.indexOf("async function loadProjectionData"),
    projection.indexOf("export async function getRagServingProjectionStatus"),
  );
  assert.doesNotMatch(
    loadProjectionData,
    /"[^"]*,embedding[,"]/,
    "loadProjectionData must not select embedding vectors — presence comes from loadRowsWithValue"
  );
  assert.match(
    loadProjectionData,
    /loadRowsWithValue/,
    "loadProjectionData must derive vector presence without transferring vectors"
  );
}

console.log("PASS readiness projection keeps embedding vectors off the probe path");
