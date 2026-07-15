import { createClient } from "@supabase/supabase-js";
import { EscalationStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { recordOpsEvent } from "@/lib/ops/events";
import { slaMinutesForTier } from "@/lib/ops/sla-policy";

// The SLA watchdog only reports on the three consult queues; it never mutates
// anything except the breach-alerted stamp (handoff_metadata.sla.breachAlertedAt
// / slaBreachAlertedAt) that makes re-alerting idempotent. All channel/dedupe
// logic (Slack, email) lives in recordOpsEvent — this module must stay free of it.

const APPROACHING_FRACTION = 0.25;

// Terminal statuses per queue — items in these states have left the SLA clock,
// however overdue their stored dueAt is.
const HANDOFF_TERMINAL_STATUSES = new Set(["resolved", "closed", "duplicate"]);
const PARTNER_REQUEST_TERMINAL_STATUSES = new Set(["closed"]);
// EscalationCase: CLOSED/STOPPED mirror assertOpen() in
// src/lib/cases/repository.ts, the pipeline's own definition of "closed".
// NEW/HIGH_RISK/APPROVED are the states a case can legitimately still be
// awaiting a partner's first response in, so they stay in scope. REJECTED
// and NEEDS_MORE_DOCUMENTS are added here (not in assertOpen's closed set):
// requestCaseSupplement can move a case straight from HIGH_RISK to
// NEEDS_MORE_DOCUMENTS without ever going through acceptAssignedCase (the
// only place slaFirstResponseAt gets stamped), and nothing in this codebase
// ever moves a case to REJECTED either -- both statuses mean the case has
// been bounced back out of the "awaiting first partner response" flow, so
// continuing to demand a first-response SLA on them is a guaranteed false
// alert, not a real breach.
const ESCALATION_TERMINAL_STATUSES = new Set<EscalationStatus>([
  EscalationStatus.CLOSED,
  EscalationStatus.STOPPED,
  EscalationStatus.REJECTED,
  EscalationStatus.NEEDS_MORE_DOCUMENTS,
]);

export type SlaQueue = "handoff" | "partner_request" | "escalation_case";

export type SlaWatchdogItem = {
  queue: SlaQueue;
  id: string;
  tier: string;
  dueAt: string;
  riskLevel: string | null;
  state: "breached" | "approaching";
};

// `failed` counts rows (or, for a whole-queue crash, the scan itself) that
// could not be classified/alerted/stamped. `error` is set only when the
// entire queue scan aborted. A failure must always show up here -- never as
// quietly-zeroed breached/approaching/alerted counts that read as healthy.
export type SlaQueueCounts = {
  breached: number;
  approaching: number;
  alerted: number;
  failed: number;
  error?: string;
};

function isolatedTestRuntime() {
  const runtimeDatabase = process.env.DATABASE_URL?.trim() || "";
  return Boolean(
    process.env.TEST_DATABASE_URL &&
    /^postgres(?:ql)?:\/\/(?:[^@]+@)?(?:localhost|127\.0\.0\.1|\[::1\])/i.test(runtimeDatabase),
  );
}

// Pure and exported so the classification rules are testable without a DB.
export function classifySlaItem(input: {
  dueAt: string | null;
  minutes: number;
  firstResponseAt?: string | null;
  terminal: boolean;
  now: Date;
}): "breached" | "approaching" | "healthy" | "skipped" {
  if (input.terminal) return "skipped";
  if (input.firstResponseAt) return "skipped";
  if (!input.dueAt) return "skipped";
  const due = new Date(input.dueAt).getTime();
  if (!Number.isFinite(due)) return "skipped";
  const remainingMs = due - input.now.getTime();
  if (remainingMs <= 0) return "breached";
  return remainingMs <= input.minutes * 60_000 * APPROACHING_FRACTION ? "approaching" : "healthy";
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  if (!url || !key) throw new Error("SUPABASE_OPS_NOT_CONFIGURED");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown): string | null {
  return typeof value === "string" ? value : value == null ? null : String(value);
}

function overdueLabel(dueAt: string, now: Date): string {
  const minutesOverdue = Math.max(0, Math.round((now.getTime() - new Date(dueAt).getTime()) / 60_000));
  return minutesOverdue >= 60
    ? `${Math.round((minutesOverdue / 60) * 10) / 10}h overdue`
    : `${minutesOverdue}m overdue`;
}

async function alertBreach(item: SlaWatchdogItem, now: Date): Promise<void> {
  await recordOpsEvent({
    source: "sla-watchdog",
    severity: item.riskLevel === "high" ? "error" : "warning",
    eventType: "sla.breached",
    message: `${item.queue} ${item.id} breached its ${item.tier} SLA (${overdueLabel(item.dueAt, now)})`,
    payload: {
      queue: item.queue,
      id: item.id,
      tier: item.tier,
      dueAt: item.dueAt,
      riskLevel: item.riskLevel,
    },
  });
}

async function scanHandoffQueue(now: Date): Promise<SlaQueueCounts> {
  // handoff_tasks lives in Supabase, not the Prisma test database, so it must
  // never be reached from the isolated test runtime -- there is no local
  // stand-in, and NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY in a
  // developer's environment can point at a real project. Mirrors the same
  // guard already enforced by src/lib/handoffs/admin.ts and
  // src/lib/handoffs/partner.ts for every other handoff_tasks access.
  if (isolatedTestRuntime()) throw new Error("SUPABASE_OPS_DISABLED_IN_TEST");

  const counts: SlaQueueCounts = { breached: 0, approaching: 0, alerted: 0, failed: 0 };
  const supabase = serviceClient();
  const result = await supabase
    .from("handoff_tasks")
    .select("id,risk_level,status,handoff_metadata")
    .not("status", "in", "(resolved,closed,duplicate)")
    .limit(500);
  if (result.error) throw result.error;

  for (const row of result.data || []) {
    try {
      const metadata = record(row.handoff_metadata);
      const sla = record(metadata.sla);
      const minutes = Number(sla.minutes);
      if (!Number.isFinite(minutes)) continue; // no SLA recorded yet on this task; nothing to classify

      const dueAt = text(sla.dueAt);
      const firstResponseAt = text(sla.firstResponseAt);
      const breachAlertedAt = text(sla.breachAlertedAt);
      const terminal = HANDOFF_TERMINAL_STATUSES.has(String(row.status));

      const state = classifySlaItem({ dueAt, minutes, firstResponseAt, terminal, now });
      if (state === "approaching") counts.approaching++;
      if (state === "breached") {
        counts.breached++;
        if (!breachAlertedAt && dueAt) {
          const item: SlaWatchdogItem = {
            queue: "handoff",
            id: String(row.id),
            tier: text(sla.tier) || "custom",
            dueAt,
            riskLevel: text(row.risk_level),
            state: "breached",
          };
          await alertBreach(item, now);

          // Re-read handoff_metadata immediately before the stamp write and
          // merge into THAT fresh value -- not the scan-time snapshot above
          // -- so a concurrent admin write (assign/resolve/first-response)
          // mid-scan is merged with, not clobbered by, this stamp. Skip the
          // write entirely if another run already won the race, or the task
          // stopped being eligible since the scan snapshot was taken.
          const fresh = await supabase
            .from("handoff_tasks")
            .select("status,handoff_metadata")
            .eq("id", row.id)
            .maybeSingle();
          if (fresh.error) throw fresh.error;
          if (!fresh.data) continue; // row disappeared mid-scan; nothing to stamp

          const freshMetadata = record(fresh.data.handoff_metadata);
          const freshSla = record(freshMetadata.sla);
          const freshTerminal = HANDOFF_TERMINAL_STATUSES.has(String(fresh.data.status));
          if (freshTerminal || text(freshSla.firstResponseAt) || text(freshSla.breachAlertedAt)) {
            continue;
          }

          const update = await supabase
            .from("handoff_tasks")
            .update({ handoff_metadata: { ...freshMetadata, sla: { ...freshSla, breachAlertedAt: now.toISOString() } } })
            .eq("id", row.id);
          if (update.error) throw update.error;
          counts.alerted++;
        }
      }
    } catch (itemError) {
      // One bad row must not abort the rest of the queue's scan.
      counts.failed++;
      console.warn(`[sla-watchdog] handoff ${row.id} breach handling failed:`, itemError instanceof Error ? itemError.message : itemError);
    }
  }
  return counts;
}

async function scanPartnerRequestQueue(now: Date): Promise<SlaQueueCounts> {
  const counts: SlaQueueCounts = { breached: 0, approaching: 0, alerted: 0, failed: 0 };
  const rows = await db.partnerRequest.findMany({
    where: { deletedAt: null, status: { notIn: [...PARTNER_REQUEST_TERMINAL_STATUSES] }, slaDueAt: { not: null } },
    select: {
      id: true,
      status: true,
      slaTier: true,
      slaDueAt: true,
      slaFirstResponseAt: true,
      slaBreachAlertedAt: true,
    },
    take: 500,
  });

  for (const row of rows) {
    try {
      const dueAt = row.slaDueAt ? row.slaDueAt.toISOString() : null;
      const terminal = PARTNER_REQUEST_TERMINAL_STATUSES.has(row.status);
      const state = classifySlaItem({
        dueAt,
        minutes: slaMinutesForTier(row.slaTier),
        firstResponseAt: row.slaFirstResponseAt ? row.slaFirstResponseAt.toISOString() : null,
        terminal,
        now,
      });
      if (state === "approaching") counts.approaching++;
      if (state === "breached") {
        counts.breached++;
        if (!row.slaBreachAlertedAt && dueAt) {
          // Claim the stamp BEFORE alerting: only the run whose updateMany
          // actually matches this still-unstamped row (count === 1) may
          // alert, so two concurrent scans can never both alert the same
          // breach (the guard previously only prevented double-counting,
          // not the double alert).
          const claimed = await db.partnerRequest.updateMany({
            where: { id: row.id, slaBreachAlertedAt: null },
            data: { slaBreachAlertedAt: now },
          });
          if (claimed.count === 1) {
            const item: SlaWatchdogItem = {
              queue: "partner_request",
              id: row.id,
              tier: row.slaTier || "custom",
              dueAt,
              riskLevel: null,
              state: "breached",
            };
            await alertBreach(item, now);
            counts.alerted++;
          }
        }
      }
    } catch (itemError) {
      // One bad row must not abort the rest of the queue's scan.
      counts.failed++;
      console.warn(`[sla-watchdog] partner_request ${row.id} breach handling failed:`, itemError instanceof Error ? itemError.message : itemError);
    }
  }
  return counts;
}

async function scanEscalationCaseQueue(now: Date): Promise<SlaQueueCounts> {
  const counts: SlaQueueCounts = { breached: 0, approaching: 0, alerted: 0, failed: 0 };
  const rows = await db.escalationCase.findMany({
    where: { status: { notIn: [...ESCALATION_TERMINAL_STATUSES] }, slaDueAt: { not: null } },
    select: {
      id: true,
      status: true,
      riskLevel: true,
      slaTier: true,
      slaDueAt: true,
      slaFirstResponseAt: true,
      slaBreachAlertedAt: true,
    },
    take: 500,
  });

  for (const row of rows) {
    try {
      const dueAt = row.slaDueAt ? row.slaDueAt.toISOString() : null;
      const terminal = ESCALATION_TERMINAL_STATUSES.has(row.status);
      const state = classifySlaItem({
        dueAt,
        minutes: slaMinutesForTier(row.slaTier),
        firstResponseAt: row.slaFirstResponseAt ? row.slaFirstResponseAt.toISOString() : null,
        terminal,
        now,
      });
      if (state === "approaching") counts.approaching++;
      if (state === "breached") {
        counts.breached++;
        if (!row.slaBreachAlertedAt && dueAt) {
          // Claim the stamp BEFORE alerting -- see scanPartnerRequestQueue.
          const claimed = await db.escalationCase.updateMany({
            where: { id: row.id, slaBreachAlertedAt: null },
            data: { slaBreachAlertedAt: now },
          });
          if (claimed.count === 1) {
            const item: SlaWatchdogItem = {
              queue: "escalation_case",
              id: row.id,
              tier: row.slaTier || "custom",
              dueAt,
              riskLevel: row.riskLevel ? row.riskLevel.toLowerCase() : null,
              state: "breached",
            };
            await alertBreach(item, now);
            counts.alerted++;
          }
        }
      }
    } catch (itemError) {
      // One bad row must not abort the rest of the queue's scan.
      counts.failed++;
      console.warn(`[sla-watchdog] escalation_case ${row.id} breach handling failed:`, itemError instanceof Error ? itemError.message : itemError);
    }
  }
  return counts;
}

export async function runSlaWatchdog(trigger: string): Promise<{
  trigger: string;
  checkedAt: string;
  ok: boolean;
  queues: Record<string, SlaQueueCounts>;
}> {
  const now = new Date();
  const queues: Record<string, SlaQueueCounts> = {};
  const scans: Array<[string, () => Promise<SlaQueueCounts>]> = [
    ["handoff", () => scanHandoffQueue(now)],
    ["partner_request", () => scanPartnerRequestQueue(now)],
    ["escalation_case", () => scanEscalationCaseQueue(now)],
  ];

  // Each queue is isolated: one queue's failure must not prevent the others
  // from being scanned and, where breached, alerted. A queue that crashes
  // entirely must report the crash, not zeroed counts indistinguishable from
  // a healthy, empty queue.
  for (const [name, scan] of scans) {
    try {
      queues[name] = await scan();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[sla-watchdog] ${name} queue scan failed:`, message);
      queues[name] = { breached: 0, approaching: 0, alerted: 0, failed: 1, error: message };
    }
  }

  const ok = Object.values(queues).every((counts) => counts.failed === 0);
  if (!ok) {
    const failedQueues = Object.entries(queues)
      .filter(([, counts]) => counts.failed > 0)
      .map(([name]) => name);
    await recordOpsEvent({
      source: "sla-watchdog",
      severity: "error",
      eventType: "sla.watchdog_failed",
      message: `SLA watchdog scan failed for: ${failedQueues.join(", ")}`,
      payload: { trigger, queues },
    }).catch((eventError) => {
      console.warn("[sla-watchdog] failed to record sla.watchdog_failed event:", eventError instanceof Error ? eventError.message : eventError);
    });
  }

  return { trigger, checkedAt: now.toISOString(), ok, queues };
}
