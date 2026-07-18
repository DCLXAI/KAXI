import assert from "node:assert/strict";
import { mock } from "bun:test";

let recorded: Array<Record<string, unknown>> = [];
let shouldThrow = false;
mock.module("@/lib/ops/events", () => ({
  recordOpsEvent: async (input: Record<string, unknown>) => {
    if (shouldThrow) throw new Error("supabase down");
    recorded.push(input);
    return { id: "evt", duplicate: false, alert: null };
  },
}));

const { reportLlmFallback } = await import("../src/lib/ops/llm-fallback-events");

await reportLlmFallback({ feature: "action", failureReason: "llm_backend_fallback", detail: "upstream 500" });
assert.equal(recorded[0].eventType, "agent.llm_fallback");
assert.equal(recorded[0].source, "ai-agent");
assert.equal(recorded[0].severity, "warning");
assert.deepEqual(
  (recorded[0].payload as Record<string, unknown>).failureReason,
  "llm_backend_fallback",
);

await reportLlmFallback({ feature: "consult", failureReason: "llm_not_configured_fallback" });
assert.equal(recorded[1].eventType, "consult.llm_fallback");
assert.equal(recorded[1].source, "ai-consult");

// telemetry failure never propagates
shouldThrow = true;
await reportLlmFallback({ feature: "action", failureReason: "llm_backend_fallback" });
shouldThrow = false;

// context is spread into the payload for latency-discrimination telemetry
// (trusted internal callers only — do not pass user-controlled keys as context)
await reportLlmFallback({
  feature: "action",
  failureReason: "llm_backend_fallback",
  detail: "timeout",
  context: { preflightMs: 4210, grounded: false, preflightTimedOut: true },
});
const withContext = recorded[recorded.length - 1].payload as Record<string, unknown>;
assert.equal(withContext.preflightMs, 4210);
assert.equal(withContext.grounded, false);
assert.equal(withContext.preflightTimedOut, true);
assert.equal(withContext.failureReason, "llm_backend_fallback");

// no context => payload shape stays byte-identical to today's (no extra keys)
await reportLlmFallback({ feature: "action", failureReason: "llm_backend_fallback", detail: "upstream 500" });
const withoutContext = recorded[recorded.length - 1].payload as Record<string, unknown>;
assert.deepEqual(Object.keys(withoutContext).sort(), ["detail", "failureReason", "feature"]);

console.log("PASS llm fallback telemetry: event mapping, best-effort on failure, context passthrough");
