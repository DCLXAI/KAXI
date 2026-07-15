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
// EscalationCase: mirrors assertOpen() in src/lib/cases/repository.ts, the
// pipeline's own definition of "closed" — CLOSED/STOPPED reject further writes.
// APPROVED/REJECTED still allow partner follow-up, so they stay in scope.
const ESCALATION_TERMINAL_STATUSES = new Set<EscalationStatus>([
  EscalationStatus.CLOSED,
  EscalationStatus.STOPPED,
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

export type SlaQueueCounts = { breached: number; approaching: number; alerted: number };

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
  const counts: SlaQueueCounts = { breached: 0, approaching: 0, alerted: 0 };
  const supabase = serviceClient();
  const result = await supabase
    .from("handoff_tasks")
    .select("id,risk_level,status,handoff_metadata")
    .not("status", "in", "(resolved,closed,duplicate)")
    .limit(500);
  if (result.error) throw result.error;

  for (const row of result.data || []) {
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
        const update = await supabase
          .from("handoff_tasks")
          .update({ handoff_metadata: { ...metadata, sla: { ...sla, breachAlertedAt: now.toISOString() } } })
          .eq("id", row.id);
        if (update.error) throw update.error;
        counts.alerted++;
      }
    }
  }
  return counts;
}

async function scanPartnerRequestQueue(now: Date): Promise<SlaQueueCounts> {
  const counts: SlaQueueCounts = { breached: 0, approaching: 0, alerted: 0 };
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
        const item: SlaWatchdogItem = {
          queue: "partner_request",
          id: row.id,
          tier: row.slaTier || "custom",
          dueAt,
          riskLevel: null,
          state: "breached",
        };
        await alertBreach(item, now);
        // Guard the stamp on the DB row still being unstamped so a concurrent
        // run cannot double-alert the same request.
        const updated = await db.partnerRequest.updateMany({
          where: { id: row.id, slaBreachAlertedAt: null },
          data: { slaBreachAlertedAt: now },
        });
        if (updated.count > 0) counts.alerted++;
      }
    }
  }
  return counts;
}

async function scanEscalationCaseQueue(now: Date): Promise<SlaQueueCounts> {
  const counts: SlaQueueCounts = { breached: 0, approaching: 0, alerted: 0 };
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
        const item: SlaWatchdogItem = {
          queue: "escalation_case",
          id: row.id,
          tier: row.slaTier || "custom",
          dueAt,
          riskLevel: row.riskLevel ? row.riskLevel.toLowerCase() : null,
          state: "breached",
        };
        await alertBreach(item, now);
        const updated = await db.escalationCase.updateMany({
          where: { id: row.id, slaBreachAlertedAt: null },
          data: { slaBreachAlertedAt: now },
        });
        if (updated.count > 0) counts.alerted++;
      }
    }
  }
  return counts;
}

export async function runSlaWatchdog(trigger: string): Promise<{
  trigger: string;
  checkedAt: string;
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
  // from being scanned and, where breached, alerted.
  for (const [name, scan] of scans) {
    try {
      queues[name] = await scan();
    } catch (error) {
      console.warn(`[sla-watchdog] ${name} queue scan failed:`, error instanceof Error ? error.message : error);
      queues[name] = { breached: 0, approaching: 0, alerted: 0 };
    }
  }

  return { trigger, checkedAt: now.toISOString(), queues };
}
