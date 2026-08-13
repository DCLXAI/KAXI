import assert from "node:assert/strict";
import { canaryGateErrors, type CanaryEvidence } from "../src/application/ops/canary-gate";

const healthy: CanaryEvidence = {
  windowHours: 24,
  observedWrites: 50,
  criticalOpsEvents: 0,
  crossTenantEvents: 0,
  duplicateOpenHandoffs: 0,
  terminalQueueFailures: 0,
  traceCoverage: 0.96,
  traceEligibleUnits: 50,
  tracePiiViolations: 0,
  legacyDefaultRows: 0,
  unsafeTenantColumns: 0,
  truncated: false,
};
const thresholds = { minimumHours: 24, minimumWrites: 20, minimumTraceUnits: 20, minimumTraceCoverage: 0.95 };
assert.deepEqual(canaryGateErrors(healthy, thresholds), []);
assert.deepEqual(canaryGateErrors({
  ...healthy,
  windowHours: 23.9,
  criticalOpsEvents: 1,
  duplicateOpenHandoffs: 1,
  terminalQueueFailures: 1,
  traceCoverage: 0.94,
  tracePiiViolations: 1,
  legacyDefaultRows: 1,
  truncated: true,
}, thresholds), [
  "observation_window_too_short",
  "trace_coverage_below_target",
  "trace_pii_detected",
  "legacy_default_tenant_rows_detected",
  "critical_ops_event_detected",
  "duplicate_open_handoff_detected",
  "terminal_queue_failure_detected",
  "evidence_truncated",
]);
console.log("PASS canary gate: duration, sample floors and every zero-tolerance incident class fail closed");
