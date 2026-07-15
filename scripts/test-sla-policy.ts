import assert from "node:assert/strict";
import {
  SLA_POLICY_VERSION,
  assertSlaMinutes,
  slaDefaultMinutes,
  slaDueAt,
  slaTierForMinutes,
} from "../src/lib/ops/sla-policy";

// Default minutes: high risk OR urgent stage -> 120; otherwise 1440.
assert.equal(slaDefaultMinutes({ riskLevel: "high" }), 120);
assert.equal(slaDefaultMinutes({ leadStage: "urgent" }), 120);
assert.equal(slaDefaultMinutes({ riskLevel: "high", leadStage: "urgent" }), 120);
assert.equal(slaDefaultMinutes({ riskLevel: "medium" }), 1440);
assert.equal(slaDefaultMinutes({}), 1440);
assert.equal(slaDefaultMinutes({ riskLevel: null, leadStage: null }), 1440);

// Risk/stage casing is normalized: EscalationCase.riskLevel is the Prisma enum
// ("HIGH") while handoff_tasks stores lowercase "high". Both must reach the
// urgent tier — a case-sensitive compare would silently mis-tier high-risk work.
assert.equal(slaDefaultMinutes({ riskLevel: "HIGH" }), 120);
assert.equal(slaDefaultMinutes({ riskLevel: "High" }), 120);
assert.equal(slaDefaultMinutes({ riskLevel: " high " }), 120);
assert.equal(slaDefaultMinutes({ leadStage: "URGENT" }), 120);
assert.equal(slaDefaultMinutes({ riskLevel: "MEDIUM" }), 1440);

// Tier is derived from the resulting minutes, including the custom case.
assert.equal(slaTierForMinutes(120), "urgent-2h");
assert.equal(slaTierForMinutes(1440), "standard-24h");
assert.equal(slaTierForMinutes(60), "custom");
assert.equal(slaTierForMinutes(10080), "custom");

// Minutes validation THROWS outside 15..10080 (it does not clamp).
assert.doesNotThrow(() => assertSlaMinutes(15));
assert.doesNotThrow(() => assertSlaMinutes(10080));
assert.throws(() => assertSlaMinutes(14), /HANDOFF_SLA_INVALID/);
assert.throws(() => assertSlaMinutes(10081), /HANDOFF_SLA_INVALID/);

// Due date is a pure offset from the given instant.
const from = new Date("2026-07-16T00:00:00.000Z");
assert.equal(slaDueAt(from, 120).toISOString(), "2026-07-16T02:00:00.000Z");
assert.equal(slaDueAt(from, 1440).toISOString(), "2026-07-17T00:00:00.000Z");
assert.equal(from.toISOString(), "2026-07-16T00:00:00.000Z", "slaDueAt must not mutate its input");

assert.equal(SLA_POLICY_VERSION, "kaxi-handoff-v1");

console.log("PASS sla policy: shared default minutes, tiers, validation, due dates");
