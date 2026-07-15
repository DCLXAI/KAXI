# Consult Queue Operations: SLA Watchdog, Assignment Notifications, Partner Handoff Inbox

Date: 2026-07-16
Status: Draft for operator review

## Problem

The original RAG audit found the consult queue effectively abandoned: 99 active items, 66 unassigned, 44 past 24 hours, 0 resolution feedback. Investigation shows this is **mostly an operations backlog, not missing features** — but four real code gaps make the backlog invisible and self-perpetuating.

There are **three** distinct queues, with very different maturity:

| Queue | Storage | Assign | SLA | Resolution → RAG |
| --- | --- | --- | --- | --- |
| `handoff_tasks` (AI chat escalations) | raw Supabase table, no Prisma model | manual | yes (lazy, read-time) | **complete** (`kaxi_resolve_handoff_review`) |
| `PartnerRequest` | Prisma | manual | **none** | none |
| `EscalationCase` | Prisma | manual | **none** | none |

The `handoff_tasks` assign/SLA/verdict machinery is complete and end-to-end tested (`scripts/test-handoff-review-loop.ts`); "66 unassigned" means nobody pressed the button, not that the button is missing. Working the queue is human work this spec does not attempt to automate.

## The four gaps

1. **Nobody is told an SLA broke.** `resolvedSlaStatus` (`src/lib/handoffs/admin.ts:161-166`) computes `overdue` only when an admin loads `/admin/handoffs`. No cron, and `sendOpsAlert` is never called for SLA anywhere. "44 items past 24h" can sit forever unnoticed.
2. **Assignment is silent.** `updateAdminHandoff({action:"assign"})` (`admin.ts:490-531`) records an analytics event but never calls `notifyUsers` — unlike `assignPartnerRequest` (`src/lib/partners/assignment.ts:117-132`), which does. The assignee is never told.
3. **`PartnerRequest` / `EscalationCase` have no SLA at all** (`schema.prisma:403-438`, `:1129-1165` have no due/response columns). Assigned work can be ignored indefinitely with no signal.
4. **Partners cannot see their `handoff_tasks`.** Tasks are assigned to `PARTNER_AGENT` users, but `/partner` only lists `PartnerRequest`/`EscalationCase`. Only admins can act on the queue they assigned to partners.

## Decisions (operator-chosen)

- **One SLA policy across all three queues**, reusing the existing handoff tiers: high-risk/urgent → **120 minutes**, otherwise → **1440 minutes** (`admin.ts:509-530`).
- **The watchdog always records ops events**; Slack/email delivery happens only when those channels are configured. (`ops.realtime_alerts` is currently a readiness warning — unconfigured. The DB/admin trail is valuable regardless, and delivery lights up automatically once channels are set.)
- **Partners get view + response recording** (start / contacted, satisfying first-response SLA). The RAG verdict (`resolved`/`inaccurate`/`missing_document`) stays **admin-only** — it feeds `rag_evaluation_cases` and is a content-quality judgment, not a consultation outcome.

## Design

### A. SLA watchdog (new)

New `src/lib/ops/sla-watchdog.ts` exporting `runSlaWatchdog(trigger: string)`, plus `GET/POST /api/ops/sla` mirroring `/api/ops/health` exactly (`authorizeCronRequest` for GET/cron, `requireAdmin` for POST/manual), and a `vercel.json` cron entry.

It evaluates all three queues and reports, per queue: `breached` (due date passed, no first response, not terminal) and `approaching` (due within 25% of the tier window). For each **newly** breached item it calls `recordOpsEvent` (severity `warning`; `error` when the item is high-risk) with a stable `eventType` (`sla.breached`) and a payload naming the queue, item id, tier, dueAt, and age. `recordOpsEvent` already routes to Slack/email when configured and dedupes, so no channel logic lives here.

Idempotency: the watchdog must not re-alert the same item every run. `recordOpsEvent` dedupes on its own key; the watchdog additionally stamps the item (handoff: `sla.breachAlertedAt` in `handoff_metadata`; Prisma queues: `slaBreachAlertedAt` column) and skips items already stamped.

### B. Assignment notification (fix)

`updateAdminHandoff({action:"assign"})` calls `notifyUsers` for the assignee, mirroring `assignPartnerRequest` (`users`, `eventKey`, 4-locale `copy`, `href: "/partner/handoffs"`, `metadata`). The existing analytics event stays. Notification failure must not fail the assignment (best-effort, warn-and-continue).

### C. SLA for PartnerRequest / EscalationCase (new)

Additive, nullable columns on both models: `slaTier String?`, `slaDueAt DateTime?`, `slaFirstResponseAt DateTime?`, `slaBreachAlertedAt DateTime?`. Set at assignment time using the shared tier policy; `slaFirstResponseAt` set on the first status transition that represents contact (`contacted` for PartnerRequest; `accepted` for EscalationCase). The tier function is extracted to one shared module so all three queues cannot drift.

### D. Partner handoff inbox (new)

`GET /api/partner/handoffs` returns the caller's assigned, non-terminal `handoff_tasks` (auth: `requireKaxiUser(["PARTNER_AGENT"])`, filtered to `assignment.assigneeUserId === user.id` — never the whole queue). `PATCH` accepts only `start` and `contacted`, reusing the existing `markFirstResponse` path; any other action is rejected. A `PartnerHandoffInbox` component renders it in the existing `/partner` workspace alongside `PartnerRequestInbox`.

Privacy: the partner response must reuse the same redaction the admin list applies — partners see only what they need to run the consultation, and never the RAG verdict controls.

## Shared tier policy

`src/lib/ops/sla-policy.ts`:
```ts
// The value the handoff queue already writes today. Kept verbatim (despite the
// handoff-era name) because renaming it would change existing handoff records.
export const SLA_POLICY_VERSION = "kaxi-handoff-v1";
export function slaDefaultMinutes(input: { riskLevel?: string | null; leadStage?: string | null }): number; // 120 | 1440
export function slaTierForMinutes(minutes: number): "urgent-2h" | "standard-24h" | "custom";
export function assertSlaMinutes(minutes: number): void; // throws HANDOFF_SLA_INVALID outside 15..10080
export function slaDueAt(from: Date, minutes: number): Date;
```
`handoffs/admin.ts` is refactored to call it, so its current inline logic and the two new queues share one source of truth. Existing handoff behavior must not change (same tiers, same policy string) — this is a pure extraction.

## Out of scope

- Auto-assignment (round-robin/load-based). Assignment stays a human decision.
- Working the existing backlog (assigning the 66, judging the 44) — human work.
- Resolution→RAG feedback for `PartnerRequest`/`EscalationCase`: those closures are consultation outcomes, not retrieval-quality verdicts; wiring them into `rag_evaluation_cases` would pollute the eval set. Revisit separately if a genuine signal is identified.
- Configuring Slack/email channels (operator action; the watchdog degrades to ops-events-only until then).

## Testing

1. Unit: `slaDefaultMinutes`/`slaTierForMinutes`/`assertSlaMinutes`/`slaDueAt` (high-risk→120, urgent stage→120, default→1440; custom tier; throw outside 15..10080); extraction leaves handoff behavior byte-identical.
2. Unit: watchdog classification — breached vs approaching vs healthy vs terminal-skipped; already-alerted items are skipped (idempotency).
3. `scripts/test-handoff-review-loop.ts` extended: assignment triggers a notification; the review loop still passes.
4. Partner inbox authorization: a `PARTNER_AGENT` sees only their own assigned tasks; a non-partner is rejected; `PATCH` rejects `resolve`.
5. Migration: additive nullable columns; `test:schema` green; `REQUIRED_PRODUCTION_MIGRATION` bumped and the `test-production-cutover.ts` tripwire literal updated (both pins).
6. Full `ci:domain` + `ci:ops` green (hermetic).

## Rollout note

The watchdog cron only reports; it never mutates queue state beyond the alert stamp. Adding it cannot break the chat path. The migration is additive/nullable and applies through the standard deploy workflow.
