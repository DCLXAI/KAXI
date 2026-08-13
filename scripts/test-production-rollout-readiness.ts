import assert from "node:assert/strict";
import { evaluateProductionRolloutReadiness, type ProductionRolloutReadinessInput } from "../src/application/ops/production-rollout-readiness";

const ready: ProductionRolloutReadinessInput = {
  phase: "all",
  approvedTicket: true,
  rollbackOwner: true,
  cleanReleaseCheckout: true,
  sourceCommit: true,
  productionDatabase: true,
  railwayDeploymentAccess: true,
  vercelProjectLinked: true,
  aiProviderCredential: true,
  productionBaseUrl: true,
  latencyBudgets: true,
  alertChannel: true,
  alertRecipientsAcknowledged: true,
  canaryStartUtc: true,
};

const all = evaluateProductionRolloutReadiness(ready);
assert.equal(all.ready, true);
assert.equal(all.checks.length, 19);
assert.deepEqual(all.missing, []);

const deploy = evaluateProductionRolloutReadiness({
  ...ready,
  phase: "deploy",
  productionBaseUrl: false,
  latencyBudgets: false,
  alertChannel: false,
  alertRecipientsAcknowledged: false,
  canaryStartUtc: false,
});
assert.equal(deploy.ready, true, "observation-only inputs must not block deploy preflight");

const observe = evaluateProductionRolloutReadiness({
  ...ready,
  phase: "observe",
  railwayDeploymentAccess: false,
  vercelProjectLinked: false,
  alertRecipientsAcknowledged: false,
  canaryStartUtc: false,
});
assert.equal(observe.ready, false);
assert.deepEqual(observe.missing, [
  "observe:alert_recipients_acknowledged",
  "observe:canary_start_utc",
]);

console.log("PASS production rollout readiness: deploy/observe scopes and fail-closed requirements verified");
