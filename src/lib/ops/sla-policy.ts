// Single source of truth for SLA tiers across all three consult queues
// (handoff_tasks, PartnerRequest, EscalationCase) so the policy cannot drift.
// Extracted verbatim from the handoff assign path — behavior must not change.
export type SlaTier = "urgent-2h" | "standard-24h" | "custom";

// The default sla.policyVersion the handoff queue has always written. Shared by
// the other queues now; the handoff-era name is kept because renaming it would
// change what the handoff queue records.
export const SLA_POLICY_VERSION = "kaxi-handoff-v1";

const URGENT_MINUTES = 120;
const STANDARD_MINUTES = 1440;
const MIN_SLA_MINUTES = 15;
const MAX_SLA_MINUTES = 10_080;

export function slaDefaultMinutes(
  input: { riskLevel?: string | null; leadStage?: string | null },
): number {
  // Callers pass different casings for the same concept: handoff_tasks stores a
  // lowercase "high" column, while EscalationCase.riskLevel is the Prisma enum
  // ("HIGH"). Normalize here so no caller can silently fall through to the
  // standard tier — a mis-tiered high-risk case is invisible until the SLA is
  // already blown.
  const risk = input.riskLevel?.trim().toLowerCase();
  const stage = input.leadStage?.trim().toLowerCase();
  return risk === "high" || stage === "urgent" ? URGENT_MINUTES : STANDARD_MINUTES;
}

export function slaTierForMinutes(minutes: number): SlaTier {
  if (minutes === URGENT_MINUTES) return "urgent-2h";
  if (minutes === STANDARD_MINUTES) return "standard-24h";
  return "custom";
}

// Inverse of slaTierForMinutes for callers (the SLA watchdog) that only have
// the persisted tier string to work with — PartnerRequest/EscalationCase store
// slaTier but not the source minutes. Unknown/custom tiers fall back to the
// standard window rather than guessing; slaDefaultMinutes never produces a
// "custom" tier today, so this only matters for defensive/future-proofing.
export function slaMinutesForTier(tier: string | null | undefined): number {
  return tier === "urgent-2h" ? URGENT_MINUTES : STANDARD_MINUTES;
}

// Validate-and-throw, mirroring the existing handoff guard exactly.
export function assertSlaMinutes(minutes: number): void {
  if (minutes < MIN_SLA_MINUTES || minutes > MAX_SLA_MINUTES) {
    throw new Error("HANDOFF_SLA_INVALID");
  }
}

export function slaDueAt(from: Date, minutes: number): Date {
  return new Date(from.getTime() + minutes * 60_000);
}
