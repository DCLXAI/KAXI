# Consult Queue Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the consult queue self-announcing — one shared SLA policy across all three queues, a watchdog that reports breaches, assignment notifications that actually reach the assignee, and a partner inbox for the handoff tasks assigned to them.

**Architecture:** A new pure `sla-policy.ts` becomes the single tier source (extracted from the handoff inline logic). `PartnerRequest`/`EscalationCase` gain nullable SLA columns and set them at assignment. A new `sla-watchdog.ts` (+ `/api/ops/sla` route + Vercel cron, mirroring `/api/ops/health`) evaluates all three queues, records ops events for newly breached items, and stamps them so it never re-alerts. Handoff assignment gains a best-effort `notifyUsers`. Partners get a read + respond inbox for their own assigned handoff tasks.

**Tech Stack:** TypeScript (Next.js App Router), Prisma (Postgres), raw `@supabase/supabase-js` for `handoff_tasks` (no Prisma model), Bun test scripts, Vercel Cron.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-16-consult-queue-operations-design.md`.
- **One SLA policy**: high-risk/urgent → **120 min** (`urgent-2h`), otherwise → **1440 min** (`standard-24h`). Extraction must leave existing handoff behavior byte-identical (same tiers, same `policyVersion` string as today).
- The watchdog **always** calls `recordOpsEvent`; it never contains channel logic (`recordOpsEvent` already routes to Slack/email when configured and dedupes).
- The watchdog must be **idempotent**: never re-alert an already-alerted item (stamp `sla.breachAlertedAt` in `handoff_metadata`; `slaBreachAlertedAt` column for the Prisma queues).
- The watchdog **only reports**; it must never mutate queue state beyond the alert stamp.
- Partner API: only the caller's OWN assigned tasks; `PATCH` accepts **only** `start` and `contacted`. The RAG verdict (`resolve`/`inaccurate`/`missing_document`) stays admin-only.
- Notification failure must never fail an assignment (best-effort, warn-and-continue).
- Additive nullable migration only, authored locally. **Never run a bare `db:migrate*`** — the ambient `DATABASE_URL` in this working copy points at PRODUCTION. Pin an explicit localhost URL for any DB command; never print DATABASE_URL values.
- Do NOT stage `Capsomnia/` or `.superpowers/`. Trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Branch: `feat/consult-queue-operations` (already created off `origin/main`).

---

### Task 1: Shared SLA policy module (extraction)

**Files:**
- Create: `src/lib/ops/sla-policy.ts`
- Modify: `src/lib/handoffs/admin.ts` (the inline tier logic around `:509-530`)
- Create: `scripts/test-sla-policy.ts`
- Modify: `package.json` (add `test:sla-policy`, append to `ci:domain`)

**Interfaces:**
- Produces:
  - `export const SLA_POLICY_VERSION = "kaxi-handoff-v1"` — the DEFAULT `sla.policyVersion` today; it stays overridable per-call via the admin's `input.slaPolicy`.
  - `export type SlaTier = "urgent-2h" | "standard-24h" | "custom"`
  - `export function slaDefaultMinutes(input: { riskLevel?: string | null; leadStage?: string | null }): number` — 120 when `riskLevel === "high" || leadStage === "urgent"`, else 1440.
  - `export function slaTierForMinutes(minutes: number): SlaTier` — 120 → `urgent-2h`, 1440 → `standard-24h`, anything else → `custom`.
  - `export function assertSlaMinutes(minutes: number): void` — throws `Error("HANDOFF_SLA_INVALID")` outside 15..10080 (the current behavior is validate-and-throw, **not** clamp).
  - `export function slaDueAt(from: Date, minutes: number): Date`

**Behavior verified against the real code (`admin.ts:508-530`) — reproduce exactly:**
- `defaultMinutes = risk_level === "high" || lead_stage === "urgent" ? 120 : 1440`
- `slaMinutes = requestedMinutes ?? defaultMinutes` (admin may override)
- `if (slaMinutes < 15 || slaMinutes > 10_080) throw new Error("HANDOFF_SLA_INVALID")` — **throws, does not clamp**
- `tier` is derived from the resulting MINUTES, not from risk: `120 → "urgent-2h"`, `1440 → "standard-24h"`, else `"custom"`
- `policyVersion: input.slaPolicy?.trim().slice(0, 80) || "kaxi-handoff-v1"`
- the written `sla` object has keys: `policyVersion, tier, minutes, startsAt, dueAt, status` — `startsAt` must survive the extraction.

The string `"kaxi-handoff-v1"` is now shared by all three queues despite its handoff-era name; renaming it would change what the handoff queue writes, so keep it.

- [ ] **Step 1: Re-read the current inline logic and confirm**

Open `src/lib/handoffs/admin.ts:508-532` and confirm the six bullets above still match the code. If any differs, the CODE wins — implement the real behavior and state the discrepancy in your report.

- [ ] **Step 2: Write the failing test**

Create `scripts/test-sla-policy.ts`:

```ts
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `bun run scripts/test-sla-policy.ts`
Expected: FAIL — `Cannot find module '../src/lib/ops/sla-policy'`

- [ ] **Step 4: Write the module**

Create `src/lib/ops/sla-policy.ts`. Single source of truth for SLA tiers across `handoff_tasks`, `PartnerRequest`, and `EscalationCase` — all three queues must resolve tiers here so the policy cannot drift:

```ts
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
  return input.riskLevel === "high" || input.leadStage === "urgent"
    ? URGENT_MINUTES
    : STANDARD_MINUTES;
}

export function slaTierForMinutes(minutes: number): SlaTier {
  if (minutes === URGENT_MINUTES) return "urgent-2h";
  if (minutes === STANDARD_MINUTES) return "standard-24h";
  return "custom";
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
```

- [ ] **Step 5: Refactor handoffs/admin.ts to use it**

In `src/lib/handoffs/admin.ts` (`:508-530`), replace the inline computation with the shared helpers, keeping the emitted object byte-identical:

```ts
    const requestedMinutes = finiteInteger(input.slaMinutes);
    const slaMinutes = requestedMinutes ?? slaDefaultMinutes({
      riskLevel: found.data.risk_level,
      leadStage: found.data.lead_stage,
    });
    assertSlaMinutes(slaMinutes);
    const dueAt = slaDueAt(now, slaMinutes);
    // ...
      sla: {
        policyVersion: input.slaPolicy?.trim().slice(0, 80) || SLA_POLICY_VERSION,
        tier: slaTierForMinutes(slaMinutes),
        minutes: slaMinutes,
        startsAt: nowIso,
        dueAt: dueAt.toISOString(),
        status: "pending",
      },
```

The `sla` object must keep ALL six keys (`policyVersion, tier, minutes, startsAt, dueAt, status`) — `startsAt` is easy to drop by accident. Pure extraction: no behavior change, same throw on invalid minutes.

- [ ] **Step 6: Run tests**

Run: `bun run scripts/test-sla-policy.ts && bun run ci:types && bun run lint`
Expected: PASS / clean.

- [ ] **Step 7: Register the script**

In `package.json`, next to `"test:handoff-review"` add:
```json
"test:sla-policy": "bun run scripts/test-sla-policy.ts",
```
and append `&& bun run test:sla-policy` to the end of the `ci:domain` chain.

Run: `bun run test:sla-policy`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/lib/ops/sla-policy.ts scripts/test-sla-policy.ts src/lib/handoffs/admin.ts package.json
git commit -m "refactor: extract the shared SLA tier policy

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: SLA columns for PartnerRequest and EscalationCase

**Files:**
- Modify: `prisma/postgres/schema.prisma` (`PartnerRequest` ~:403-438, `EscalationCase` ~:1129-1165)
- Create: `prisma/postgres/migrations/20260716140000_queue_sla_fields/migration.sql`
- Modify: `src/lib/ops/schema-parity.ts:3` (`REQUIRED_PRODUCTION_MIGRATION`)
- Modify: `scripts/test-production-cutover.ts:21` (the deliberate tripwire literal)

**Interfaces:**
- Produces: both models gain `slaTier String?`, `slaDueAt DateTime?`, `slaFirstResponseAt DateTime?`, `slaBreachAlertedAt DateTime?`.

- [ ] **Step 1: Add the columns to the Prisma schema**

In `model PartnerRequest` and `model EscalationCase`, add:

```prisma
  slaTier            String?
  slaDueAt           DateTime?
  slaFirstResponseAt DateTime?
  slaBreachAlertedAt DateTime?
```

Add an index on each model so the watchdog can scan efficiently:
```prisma
  @@index([slaDueAt])
```

- [ ] **Step 2: Author the migration SQL**

Physical table names are the model names quoted PascalCase (this schema has no `@@map` on these models — confirm against an existing migration that creates `"PartnerRequest"` / `"EscalationCase"` and use whatever identifier those used verbatim).

Create `prisma/postgres/migrations/20260716140000_queue_sla_fields/migration.sql`:

```sql
-- AlterTable
ALTER TABLE "PartnerRequest" ADD COLUMN     "slaTier" TEXT;
ALTER TABLE "PartnerRequest" ADD COLUMN     "slaDueAt" TIMESTAMP(3);
ALTER TABLE "PartnerRequest" ADD COLUMN     "slaFirstResponseAt" TIMESTAMP(3);
ALTER TABLE "PartnerRequest" ADD COLUMN     "slaBreachAlertedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "EscalationCase" ADD COLUMN     "slaTier" TEXT;
ALTER TABLE "EscalationCase" ADD COLUMN     "slaDueAt" TIMESTAMP(3);
ALTER TABLE "EscalationCase" ADD COLUMN     "slaFirstResponseAt" TIMESTAMP(3);
ALTER TABLE "EscalationCase" ADD COLUMN     "slaBreachAlertedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "PartnerRequest_slaDueAt_idx" ON "PartnerRequest"("slaDueAt");

-- CreateIndex
CREATE INDEX "EscalationCase_slaDueAt_idx" ON "EscalationCase"("slaDueAt");
```

Verify the quoted table/index identifiers match the convention in the migration that created those tables.

- [ ] **Step 3: Bump BOTH migration pins**

There are TWO pins and missing either breaks CI:
1. `src/lib/ops/schema-parity.ts:3` → `export const REQUIRED_PRODUCTION_MIGRATION = "20260716140000_queue_sla_fields";`
2. `scripts/test-production-cutover.ts:21` → `assert.equal(expectedMigration, "20260716140000_queue_sla_fields");`

The second is a deliberate tripwire (it forces a conscious acknowledgement that production needs the new migration) — update the literal, do NOT derive it from the constant.

- [ ] **Step 4: Apply locally + regenerate + verify**

Run (pin localhost explicitly — the ambient DATABASE_URL is PRODUCTION):
```bash
DATABASE_URL="postgresql://sunsu@localhost:5433/kaxi_phase0?schema=public" \
  PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="플래그 승인 (권장)" \
  bunx prisma migrate deploy --schema prisma/postgres/schema.prisma
bunx prisma generate --schema prisma/postgres/schema.prisma
bun run test:schema && bun run test:cutover && bun run ci:types
```
Expected: migration applies to localhost only (confirm the `Datasource "db": ... at "localhost:5433"` line), client regenerates with the new fields, all three checks PASS.

- [ ] **Step 5: Commit**

```bash
git add prisma/postgres/schema.prisma prisma/postgres/migrations/20260716140000_queue_sla_fields src/lib/ops/schema-parity.ts scripts/test-production-cutover.ts
git commit -m "feat: add SLA fields to the partner request and escalation case queues

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Set SLA on assignment + first response for the Prisma queues

**Files:**
- Modify: `src/lib/partners/assignment.ts` (`assignPartnerRequest` ~:40-136, `updatePartnerRequestStatus`)
- Modify: `src/lib/cases/repository.ts` (`assignCaseToPartnerOffice` ~:218, `acceptAssignedCase` ~:300)
- Test: extend `scripts/test-partner-request-transitions.ts`

**Interfaces:**
- Consumes (Task 1): `slaDefaultMinutes`, `slaTierForMinutes`, `slaDueAt`; (Task 2): the four columns.

- [ ] **Step 1: Write the failing test**

Extend `scripts/test-partner-request-transitions.ts` (follow the file's existing setup/teardown pattern — read it first). Assert:
- After `assignPartnerRequest(...)` on a request, the row has a non-null `slaTier` and `slaDueAt`, and `slaDueAt - matchedAt ≈ the tier minutes` (allow a few seconds of slack).
- The tier matches `slaTierForMinutes(slaDefaultMinutes(...))` for that request. `PartnerRequest` has no risk column, so expect `standard-24h`/1440 — assert that, and note in your report if the model actually does carry a risk-like field.
- After transitioning to `contacted`, `slaFirstResponseAt` is set; transitioning again does NOT move it (first response only).

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:partner-transitions` (pin `TEST_DATABASE_URL` to the loopback `*_test` DB; add `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="플래그 승인 (권장)"` if the reset guard blocks).
Expected: FAIL — `slaTier`/`slaDueAt` null.

- [ ] **Step 3: Implement**

In `assignPartnerRequest` (inside the existing transaction, where `matchedAt` is set), compute and persist:
```ts
const assignedAt = new Date();
const minutes = slaDefaultMinutes({ riskLevel: null, leadStage: null });
// ...data: { ..., slaTier: slaTierForMinutes(minutes), slaDueAt: slaDueAt(assignedAt, minutes) }
```
`PartnerRequest` has no risk/urgency column, so this always resolves to `standard-24h`/1440 — check the model to confirm, and if a risk-like field does exist, pass it to `slaDefaultMinutes` instead of nulls. State which you found in your report.

In `updatePartnerRequestStatus`, when transitioning to `contacted` and `slaFirstResponseAt` is currently null, set it to now. Never overwrite a non-null `slaFirstResponseAt`.

In `src/lib/cases/repository.ts`: `assignCaseToPartnerOffice` sets `slaTier`/`slaDueAt` the same way, passing the case's `riskLevel` to `slaDefaultMinutes` (EscalationCase has `riskLevel`, so a high-risk case correctly gets the 2h tier). `acceptAssignedCase` sets `slaFirstResponseAt` when null (never overwrite a non-null value).

- [ ] **Step 4: Run tests**

Run: `bun run test:partner-transitions && bun run test:case-pipeline && bun run ci:types && bun run lint`
Expected: all PASS/clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/partners/assignment.ts src/lib/cases/repository.ts scripts/test-partner-request-transitions.ts
git commit -m "feat: set queue SLA on assignment and first response

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: SLA watchdog + cron route

**Files:**
- Create: `src/lib/ops/sla-watchdog.ts`
- Create: `src/app/api/ops/sla/route.ts`
- Modify: `vercel.json` (add the cron)
- Create: `scripts/test-sla-watchdog.ts`
- Modify: `package.json` (add `test:sla-watchdog`, append to `ci:ops`)

**Interfaces:**
- Consumes (Task 1): `slaDefaultMinutes`; (Task 2/3): the SLA columns.
- Produces:
  - `export type SlaWatchdogItem = { queue: "handoff" | "partner_request" | "escalation_case"; id: string; tier: string; dueAt: string; riskLevel: string | null; state: "breached" | "approaching" }`
  - `export function classifySlaItem(input: { dueAt: string | null; minutes: number; firstResponseAt?: string | null; terminal: boolean; now: Date }): "breached" | "approaching" | "healthy" | "skipped"` — **pure, exported for tests**
  - `export async function runSlaWatchdog(trigger: string): Promise<{ trigger: string; checkedAt: string; queues: Record<string, { breached: number; approaching: number; alerted: number }> }>`

- [ ] **Step 1: Write the failing test (pure classifier — hermetic, no DB)**

Create `scripts/test-sla-watchdog.ts`:

```ts
import assert from "node:assert/strict";
import { classifySlaItem } from "../src/lib/ops/sla-watchdog";

const now = new Date("2026-07-16T12:00:00.000Z");
const iso = (offsetMinutes: number) => new Date(now.getTime() + offsetMinutes * 60_000).toISOString();

// Terminal items are never alerted, however overdue.
assert.equal(classifySlaItem({ dueAt: iso(-9999), minutes: 1440, terminal: true, now }), "skipped");
// Already answered (first response recorded) -> not breached.
assert.equal(classifySlaItem({ dueAt: iso(-60), minutes: 1440, firstResponseAt: iso(-120), terminal: false, now }), "skipped");
// No due date -> nothing to judge.
assert.equal(classifySlaItem({ dueAt: null, minutes: 1440, terminal: false, now }), "skipped");
// Past due, unanswered, active -> breached.
assert.equal(classifySlaItem({ dueAt: iso(-1), minutes: 1440, terminal: false, now }), "breached");
// Within the final 25% of the window -> approaching.
assert.equal(classifySlaItem({ dueAt: iso(60), minutes: 1440, terminal: false, now }), "approaching");
// 25% boundary is inclusive of "approaching".
assert.equal(classifySlaItem({ dueAt: iso(360), minutes: 1440, terminal: false, now }), "approaching");
// Comfortably inside the window -> healthy.
assert.equal(classifySlaItem({ dueAt: iso(600), minutes: 1440, terminal: false, now }), "healthy");
// Urgent tier uses its own window: 25% of 120min = 30min.
assert.equal(classifySlaItem({ dueAt: iso(20), minutes: 120, terminal: false, now }), "approaching");
assert.equal(classifySlaItem({ dueAt: iso(60), minutes: 120, terminal: false, now }), "healthy");

console.log("PASS sla watchdog: breach/approach/healthy classification");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run scripts/test-sla-watchdog.ts`
Expected: FAIL — `Cannot find module '../src/lib/ops/sla-watchdog'`

- [ ] **Step 3: Write the classifier + watchdog**

Create `src/lib/ops/sla-watchdog.ts`. The classifier is pure and exported so the rules are testable without a DB:

```ts
const APPROACHING_FRACTION = 0.25;

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
```

`runSlaWatchdog(trigger)` then:
1. Reads active `handoff_tasks` via `serviceClient()` (mirror the select/limit style of `listAdminHandoffs`, `handoffs/admin.ts:226-238`), plus non-terminal `PartnerRequest` and `EscalationCase` rows with a non-null `slaDueAt` via Prisma.
2. Classifies each with `classifySlaItem`. `terminal` = the queue's closed/resolved statuses. `minutes`: for handoffs use the stored `sla.minutes`; for the Prisma queues derive it from the stored `slaTier` (`urgent-2h`→120, `standard-24h`→1440) — the tier is what those rows persist.
3. For each **breached** item **not already stamped** (`handoff_metadata.sla.breachAlertedAt` / `slaBreachAlertedAt`), calls `recordOpsEvent({ source: "sla-watchdog", severity: item.riskLevel === "high" ? "error" : "warning", eventType: "sla.breached", message: <queue + id + how overdue>, payload: { queue, id, tier, dueAt, riskLevel } })`, then stamps the item so later runs skip it.
4. Returns per-queue counts `{ breached, approaching, alerted }`.

Stamping is the ONLY mutation this module may perform. Wrap each queue's scan in its own try/catch so one queue failing cannot abort the others; log a warn and continue.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run scripts/test-sla-watchdog.ts`
Expected: `PASS sla watchdog: breach/approach/healthy classification`

- [ ] **Step 5: Add the route (mirror /api/ops/health exactly)**

Create `src/app/api/ops/sla/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/security";
import { runSlaWatchdog } from "@/lib/ops/sla-watchdog";
import { authorizeCronRequest } from "@/lib/security/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const unauthorized = authorizeCronRequest(req);
  if (unauthorized) return unauthorized;
  return NextResponse.json(await runSlaWatchdog("daily-cron"));
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req, { roles: ["owner", "admin"] });
  if (unauthorized) return unauthorized;
  return NextResponse.json(await runSlaWatchdog("admin-manual"));
}
```

- [ ] **Step 6: Add the cron**

In `vercel.json`, add to `crons` (staggered clear of the existing 18:00/18:15/18:30 jobs; hourly so a 2h urgent tier is caught in time):

```json
    {
      "path": "/api/ops/sla",
      "schedule": "45 * * * *"
    }
```

- [ ] **Step 7: Register the test + run gates**

In `package.json` add `"test:sla-watchdog": "bun run scripts/test-sla-watchdog.ts",` and append `&& bun run test:sla-watchdog` to the end of the `ci:ops` chain.

Run: `bun run test:sla-watchdog && bun run ci:types && bun run lint`
Expected: PASS / clean.

- [ ] **Step 8: Commit**

```bash
git add src/lib/ops/sla-watchdog.ts src/app/api/ops/sla/route.ts scripts/test-sla-watchdog.ts vercel.json package.json
git commit -m "feat: add an SLA watchdog that reports queue breaches

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Notify the assignee when a handoff task is assigned

**Files:**
- Modify: `src/lib/handoffs/admin.ts` (the `assign` branch, ~:490-531 and its persistence tail ~:592-599)
- Test: extend `scripts/test-handoff-review-loop.ts`

**Interfaces:**
- Consumes: `notifyUsers` from `@/lib/notifications/repository` (signature: `{ users: Array<{id, locale?}>, eventKey, copy, href?, metadata?, tx? }`).

- [ ] **Step 1: Write the failing test**

Extend `scripts/test-handoff-review-loop.ts` (read its existing setup first). After an assign action, assert a `UserNotification` row exists for the assignee (query via `db.userNotification.findMany({ where: { userId: <assignee> } })`), and that its `eventKey`-derived dedupe means a second identical assign does not create a duplicate row.

If the test file cannot reach a real assign (it may be scoped to the review RPC), instead add the assertion to whichever suite exercises `updateAdminHandoff` — say which you chose and why in your report. Do not assert on a stub: the notification row must be real.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:handoff-review` (pin the loopback `TEST_DATABASE_URL`; add the Prisma consent env if the reset guard blocks).
Expected: FAIL — no notification row.

- [ ] **Step 3: Implement**

In the `assign` branch of `updateAdminHandoff`, after the handoff row is successfully updated, notify the assignee — mirroring `assignPartnerRequest` (`src/lib/partners/assignment.ts:117-132`):

```ts
    try {
      await notifyUsers({
        users: [{ id: user.id, locale: user.locale }],
        eventKey: `handoff:${input.id}:assigned:${user.id}`,
        copy: {
          ko: { title: "새 상담 배정", message: "새로운 상담 건이 배정되었습니다." },
          vi: { title: "Yêu cầu tư vấn mới được giao", message: "Một yêu cầu tư vấn mới đã được giao cho bạn." },
          mn: { title: "Шинэ зөвлөгөө хуваарилагдлаа", message: "Танд шинэ зөвлөгөөний хүсэлт хуваарилагдлаа." },
          en: { title: "New consultation assigned", message: "A new consultation task was assigned to you." },
        },
        href: "/partner",
        metadata: { handoffTaskId: input.id },
      });
    } catch (notifyError) {
      // Best-effort: the assignment itself must never fail because the
      // assignee could not be notified.
      console.warn("[handoffs] assignee notification failed", notifyError);
    }
```

Place it where the assignment has already been persisted (so a notification never precedes a failed write). Keep the existing `recordServerProductEvent`. The `eventKey` shape gives per-task-per-assignee dedupe.

- [ ] **Step 4: Run tests**

Run: `bun run test:handoff-review && bun run ci:types && bun run lint`
Expected: PASS / clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/handoffs/admin.ts scripts/test-handoff-review-loop.ts
git commit -m "fix: notify the assignee when a handoff task is assigned

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Partner handoff inbox

**Files:**
- Create: `src/app/api/partner/handoffs/route.ts`
- Modify: `src/lib/handoffs/admin.ts` (add a partner-scoped list + a partner-scoped update guard) — or create `src/lib/handoffs/partner.ts` if `admin.ts` is already large; prefer a new focused module.
- Create: `src/components/partner/PartnerHandoffInbox.tsx`
- Modify: `src/app/partner/page.tsx` (render it alongside the existing inbox)
- Create: `scripts/test-partner-handoff-inbox.ts`
- Modify: `package.json` (add `test:partner-handoffs`, append to `ci:ops`)

**Interfaces:**
- Produces:
  - `listPartnerHandoffs(userId: string)` — the caller's assigned, non-terminal tasks only.
  - `updatePartnerHandoff(input: { id: string; userId: string; action: "start" | "contacted" })` — rejects any other action and any task not assigned to `userId`.

- [ ] **Step 1: Write the failing test**

Create `scripts/test-partner-handoff-inbox.ts` asserting the authorization contract (the security-critical part), hermetically where possible:
- `updatePartnerHandoff` with `action: "resolve"` (or any value outside start/contacted) throws/rejects — the RAG verdict must stay admin-only.
- `updatePartnerHandoff` for a task whose `assignment.assigneeUserId !== userId` throws/rejects — a partner cannot touch someone else's task.
- `listPartnerHandoffs(userId)` returns only tasks assigned to that user.

Follow the pattern of the existing handoff tests for the Supabase-backed `handoff_tasks` table (see how `scripts/test-handoff-review-loop.ts` sets up rows). If a full DB round-trip is impractical, at minimum assert the action allow-list and the ownership guard against injected rows — but do not write an assertion that passes vacuously.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run scripts/test-partner-handoff-inbox.ts`
Expected: FAIL — module/function missing.

- [ ] **Step 3: Implement the partner-scoped module**

Implement `listPartnerHandoffs` / `updatePartnerHandoff`:
- List: read `handoff_tasks` via `serviceClient()`, filter to `handoff_metadata.assignment.assigneeUserId === userId` and non-terminal status. Reuse the existing PII redaction the admin list applies (`serializePartnerRequestForResponse`-equivalent for handoffs — check how `listAdminHandoffs` handles `revealPii` and follow it; partners are trusted with contact details only to the extent the admin path already allows).
- Update: hard allow-list `["start", "contacted"]`; verify the task's `assignment.assigneeUserId === userId` BEFORE mutating; then reuse the existing `markFirstResponse` path so first-response SLA is recorded identically to the admin route.

- [ ] **Step 4: Add the API route**

Create `src/app/api/partner/handoffs/route.ts`, mirroring `src/app/api/partner/requests/route.ts` (`requireKaxiUser(["PARTNER_AGENT"])`, `AuthBridgeError` handling, `console.error` + 500 fallback). `GET` → `listPartnerHandoffs(user.id)`. `PATCH` → parse `{ id, action }`, call `updatePartnerHandoff({ id, userId: user.id, action })`, return the updated task.

- [ ] **Step 5: Add the UI**

Create `src/components/partner/PartnerHandoffInbox.tsx` following `src/components/partner/PartnerRequestInbox.tsx` (fetch on mount, list, action buttons). Show: question summary, risk level, SLA due/remaining, and "처리 시작"/"연락 완료" buttons. Render it in `src/app/partner/page.tsx` next to the existing `PartnerRequestInbox`. No verdict controls.

- [ ] **Step 6: Run gates**

Run: `bun run test:partner-handoffs && bun run ci:types && bun run lint`
Expected: PASS / clean.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/partner/handoffs/route.ts src/lib/handoffs/partner.ts src/components/partner/PartnerHandoffInbox.tsx src/app/partner/page.tsx scripts/test-partner-handoff-inbox.ts package.json
git commit -m "feat: give partners an inbox for their assigned handoff tasks

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Docs + full gates

**Files:**
- Modify: `docs/OPERATIONS.md` (the "Handoff Assignment SLA" section ~:88-97)

- [ ] **Step 1: Update the operations doc**

The existing section documents "no batch job" as intended. That is now false. Rewrite it to describe: the shared policy (`sla-policy.ts`, 2h urgent / 24h standard across all three queues), the hourly `/api/ops/sla` watchdog (records `sla.breached` ops events; Slack/email only when those channels are configured), the one-time breach stamp that prevents re-alerting, and the partner inbox (`/partner`, start/contacted only — verdicts stay admin-only).

Add a line noting that SLA alerts land in ops events regardless, and that configuring `OPS_ALERT_SLACK_WEBHOOK_URL` / Resend turns them into real-time delivery.

- [ ] **Step 2: Run the full gates**

Run:
```bash
PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="플래그 승인 (권장)" bun run ci:domain && bun run ci:ops
```
then once with the CI-equivalent hermetic env (`OPENAI_EMBEDDING_API_KEY="" OPENAI_API_KEY="" KAXI_QUERY_EMBEDDINGS_USE_OPENAI_KEY="false" NEXT_PUBLIC_SUPABASE_URL="" SUPABASE_URL="" SUPABASE_SERVICE_ROLE_KEY=""`, keeping the Prisma consent var).
Expected: exit 0, all PASS.

- [ ] **Step 3: Commit**

```bash
git add docs/OPERATIONS.md
git commit -m "docs: document the SLA watchdog and partner handoff inbox

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
