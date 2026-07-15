// Unit test: admin-settable PartnerRequest status transition allow-map.
// Run: bun run scripts/test-partner-request-transitions.ts
import assert from "node:assert";
import { canTransitionPartnerRequestStatus } from "../src/lib/partners/status-transitions";
import { slaDefaultMinutes, slaTierForMinutes } from "../src/lib/ops/sla-policy";

// Allowed transitions
assert.strictEqual(
  canTransitionPartnerRequestStatus("pending", "contacted"),
  true,
  "pending -> contacted must be allowed"
);
assert.strictEqual(
  canTransitionPartnerRequestStatus("pending", "closed"),
  true,
  "pending -> closed must be allowed"
);
assert.strictEqual(
  canTransitionPartnerRequestStatus("contacted", "closed"),
  true,
  "contacted -> closed must be allowed"
);
assert.strictEqual(
  canTransitionPartnerRequestStatus("matched", "closed"),
  true,
  "matched -> closed must be allowed"
);
assert.strictEqual(
  canTransitionPartnerRequestStatus("accepted", "closed"),
  true,
  "accepted -> closed must be allowed"
);

// Disallowed transitions
assert.strictEqual(
  canTransitionPartnerRequestStatus("pending", "accepted"),
  false,
  "pending -> accepted must be rejected (admin cannot set accepted directly)"
);
assert.strictEqual(
  canTransitionPartnerRequestStatus("closed", "contacted"),
  false,
  "closed -> contacted must be rejected (closed is terminal)"
);
assert.strictEqual(
  canTransitionPartnerRequestStatus("closed", "pending"),
  false,
  "closed -> pending must be rejected"
);

// Same-state transitions are always rejected
assert.strictEqual(
  canTransitionPartnerRequestStatus("pending", "pending"),
  false,
  "pending -> pending must be rejected"
);
assert.strictEqual(
  canTransitionPartnerRequestStatus("closed", "closed"),
  false,
  "closed -> closed must be rejected"
);

// Unknown states are always rejected
assert.strictEqual(
  canTransitionPartnerRequestStatus("bogus", "closed"),
  false,
  "unknown source state must be rejected"
);
assert.strictEqual(
  canTransitionPartnerRequestStatus("pending", "bogus"),
  false,
  "unknown target state must be rejected"
);

// PartnerRequest (see prisma/postgres/schema.prisma) carries no risk/urgency
// column, so slaDefaultMinutes always falls through to the standard tier for
// this queue -- assignPartnerRequest must resolve to this exact tier.
assert.strictEqual(
  slaTierForMinutes(slaDefaultMinutes({ riskLevel: null, leadStage: null })),
  "standard-24h",
  "PartnerRequest has no risk field, so assignment must resolve to the standard-24h tier"
);

console.log("PASS: canTransitionPartnerRequestStatus allow-map is correct");
