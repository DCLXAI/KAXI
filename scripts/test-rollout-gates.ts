import assert from "node:assert/strict";
import { evaluateLatencyGate } from "../src/application/ops/latency-gate";
import { alertRehearsalErrors } from "../src/application/ops/alert-rehearsal";
import type { OpsAlertDiagnostics, OpsAlertResult } from "../src/lib/ops/alerts";

const samples = Array.from({ length: 20 }, (_, index) => ({ firstProgressMs: 100 + index, completeMs: 900 + index * 5 }));
assert.deepEqual(evaluateLatencyGate({
  samples,
  baselineCompleteP95Ms: 1_000,
  coldFirstProgressBudgetMs: 500,
}).errors, []);
assert.deepEqual(evaluateLatencyGate({
  samples: samples.slice(0, 19).map((sample, index) => index === 0 ? { ...sample, firstProgressMs: 600 } : { ...sample, completeMs: 1_200 }),
  baselineCompleteP95Ms: 1_000,
  coldFirstProgressBudgetMs: 500,
}).errors, [
  "insufficient_latency_samples",
  "first_progress_p95_exceeded",
  "complete_p95_regressed",
  "cold_first_progress_exceeded",
]);

const diagnostics: OpsAlertDiagnostics = {
  configuredChannels: ["slack", "email"],
  requiredChannels: ["slack", "email"],
  missingRequiredChannels: [],
  webhookConfigured: false,
  slackConfigured: true,
  emailConfigured: true,
  emailRecipientCount: 1,
  required: true,
  ready: true,
};
const delivered: OpsAlertResult = {
  attempted: true,
  sent: true,
  allSent: true,
  partial: false,
  channels: [
    { channel: "slack" as const, attempted: true, sent: true, status: 200 },
    { channel: "email" as const, attempted: true, sent: true, status: 200 },
  ],
};
assert.deepEqual(alertRehearsalErrors(diagnostics, delivered), []);
assert.deepEqual(alertRehearsalErrors(diagnostics, {
  ...delivered,
  allSent: false,
  partial: true,
  channels: delivered.channels.map((item) => item.channel === "email" ? { ...item, sent: false, status: 500 } : item),
}), ["required_channel_not_delivered:email", "configured_channel_delivery_failed"]);
console.log("PASS rollout gates: latency regression and required multi-channel alert delivery fail closed");
