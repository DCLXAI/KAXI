import assert from "node:assert/strict";
import {
  evaluateTraceCoverage,
  type TraceCoverageSpan,
  type TraceCoverageUnit,
} from "../src/application/ops/trace-coverage";

const traceId = "a".repeat(32);
const requestId = "request-coverage-fixture";
const canonical: TraceCoverageUnit = {
  kind: "canonical",
  id: "canonical-1",
  requestId,
  traceId,
  requiredSpanGroups: [
    ["ai.request", "rag.mediation"],
    ["ai.rate_limit", "rag.rate_limit"],
    ["ai.auth", "rag.auth"],
    ["ai.provider_attempt", "rag.retrieval_generation"],
    ["ai.guardrail", "rag.guardrail"],
    ["chat.transaction"],
  ],
};
const safeAttributes = { requestId, question: "[redacted]", token: "[redacted]" };
const spans: TraceCoverageSpan[] = [
  { requestId, traceId, name: "ai.request", attributes: safeAttributes },
  { requestId, traceId, name: "ai.rate_limit", attributes: safeAttributes },
  { requestId, traceId, name: "ai.auth", attributes: safeAttributes },
  { requestId, traceId, name: "ai.provider_attempt", attributes: safeAttributes },
  { requestId, traceId, name: "ai.guardrail", attributes: safeAttributes },
  { requestId, traceId, name: "chat.transaction", attributes: safeAttributes },
];

const complete = evaluateTraceCoverage([canonical], spans);
assert.equal(complete.coverage, 1);
assert.equal(complete.piiViolationCount, 0);
assert.equal(complete.byKind.canonical.connected, 1);

const missingTransaction = evaluateTraceCoverage([canonical], spans.slice(0, -1));
assert.equal(missingTransaction.coverage, 0);
const wrongTrace = evaluateTraceCoverage([canonical], spans.map((span) => ({ ...span, traceId: "b".repeat(32) })));
assert.equal(wrongTrace.coverage, 0);
const leaked = evaluateTraceCoverage([canonical], [
  ...spans,
  { requestId, traceId, name: "diagnostic", attributes: { email: "private@example.com", nested: { answer: "raw answer" } } },
]);
assert.equal(leaked.piiViolationCount, 2);

const worker: TraceCoverageUnit = {
  kind: "worker",
  id: "worker-1",
  requestId,
  traceId,
  requiredSpanGroups: [["worker.job.*"]],
};
assert.equal(evaluateTraceCoverage([worker], [
  { requestId, traceId, name: "worker.job.rag-serving-sync", attributes: safeAttributes },
]).coverage, 1);

console.log("PASS trace coverage evaluator: stage completeness, trace identity, Worker prefix and PII rejection verified");
