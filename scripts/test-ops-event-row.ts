import assert from "node:assert/strict";
const { buildOpsEventRow } = await import("../src/lib/ops/events");

const bare = buildOpsEventRow({
  source: "sla-watchdog",
  severity: "warning",
  eventType: "sla.breached",
  message: "x",
  payload: { queue: "handoff" },
});
assert.equal(bare.workflow_id, "kaxi-app");
assert.equal(bare.workflow_version_id, "unversioned");
assert.equal(bare.model_version, "none");
assert.equal(bare.prompt_version, "none");
assert.equal(bare.execution_id, null);

const full = buildOpsEventRow({
  source: "kaxi-typebot-gateway",
  severity: "warning",
  eventType: "t",
  message: "m",
  payload: {},
  workflowId: "wf-1",
  workflowVersionId: "v1",
  modelVersion: "mv",
  promptVersion: "pv",
  executionId: "ex-1",
});
assert.equal(full.workflow_id, "wf-1");
assert.equal(full.workflow_version_id, "v1");
assert.equal(full.model_version, "mv");
assert.equal(full.prompt_version, "pv");
assert.equal(full.execution_id, "ex-1");

console.log("PASS ops event row: provenance defaults satisfy the NOT NULL columns");
