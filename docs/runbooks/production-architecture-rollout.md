# Production Architecture Rollout and Evidence Runbook

Owner: Tech Lead / Operations
Applies to: `20260813085000_trace_request_correlation` and the Phase 0–4 architecture uplift
Change class: production migration, Web deployment, Railway Worker deployment, real AI probes and real alert delivery

This runbook is deliberately operator-gated. Reading evidence is safe; migration,
deployment, latency measurement, RAG evaluation and alert rehearsal change an
external system or create production records. Do not run those steps without an
approved change ticket and named rollback owner.

## 1. Required approvals and evidence record

Before starting, record the following in the change ticket:

- exact source commit and green CI run;
- database backup identifier and restore owner;
- Web and Worker release identifiers;
- approved production base URL;
- exact UTC canary start time (for example `2026-08-14T00:00:00Z`);
- pre-release completed-response p95 baseline and cold first-progress budget;
- alert recipients who expect the warning rehearsal;
- rollback decision owner and communication channel.

Stop immediately if the checkout is dirty, the database target cannot be
unambiguously identified as production, or any required secret is printed to a
terminal/log. Never use `prisma migrate reset` against a shared database.

Before any external action, run the value-redacting local preflight. It performs
no network requests and emits only check identifiers and booleans:

```sh
bun run ops:check:rollout-readiness -- --phase all \
  --ticket CHANGE-1234 \
  --rollback-owner owner@example.com \
  --source-commit 0000000000000000000000000000000000000000 \
  --railway-deploy-authorized \
  --base-url https://approved-canary.example \
  --baseline-complete-p95-ms 0000 \
  --cold-first-progress-budget-ms 0000 \
  --alert-recipients-acknowledged \
  --canary-start-utc 2026-08-14T00:00:00Z
```

Replace every placeholder with the approved evidence. The command must pass from
the exact clean release checkout. A failure is a stop-the-line result, not a reason
to skip an input or weaken the check.

## 2. Pre-deploy gates

From the exact release commit, require CI, type, lint, schema policy, architecture,
privacy and production cutover checks to pass. Confirm the Worker image builds from
`Dockerfile.worker` and only receives Worker-required database, storage, provider
and alert credentials.

Capture a pre-migration backup using the managed database procedure. Then, with
the production migration connection loaded through the approved secret mechanism:

```sh
bun run db:migrate:deploy
```

The deploy must apply through
`20260813085000_trace_request_correlation`. Readiness/schema parity must report
that migration and required, non-null request correlation on outbox, Worker and
attachment queues. Migration failure or parity mismatch is a stop-the-line event;
do not manually mark a failed migration as applied.

## 3. Web and Worker rollout

Deploy the Web/API release through the existing CI-controlled Vercel workflow.
Do not promote the production alias until the immutable canary passes the normal
health, readiness, authentication and backend cutover checks.

Create or update the Railway Worker service from `Dockerfile.worker` with command
`bun run worker:start`. Configure a bounded restart policy, one initial replica,
and health/metrics probes on `/healthz` and `/metrics`. Verify:

- the Worker and Web report the same release commit;
- `/healthz` is healthy without exposing secrets;
- queue depth and oldest-ready-age are visible;
- one approved synthetic job completes and produces a `worker.job.*` span;
- stopping the Worker leaves queued canonical state intact and lease recovery
  succeeds after restart.

Record the exact UTC timestamp immediately before canary traffic begins. Do not
reconstruct or round this timestamp later.

## 4. RAG production quality gate

These commands invoke the production retrieval/AI path and create evaluation
records. Run only under the approved ticket, against the immutable deployment
first:

```sh
bun run rag:openai:preflight
RAG_EVAL_REQUIRE_PRODUCTION=true RAG_EVAL_STAGE=full RAG_EVAL_TRANSPORT=gateway bun run rag:evaluation:run
```

Require the v4 hybrid RPC, provider query vector, existing full-evaluation
thresholds, citation validity 100%, and governed high-risk recall 100%. Any
regression blocks promotion; do not lower a threshold during the release.

## 5. Production observation gates

After at least 24 hours and enough real/synthetic approved activity, run the
read-only evidence collectors with production database configuration loaded:

```sh
bun run ops:check:trace-coverage -- --hours 24 --min-samples 20 --minimum 0.95
bun run ops:check:tenant-writes -- --hours 24 --min-writes 20
```

Both commands fail closed on insufficient or truncated evidence. Trace coverage
requires matching request and trace IDs across every required span group and scans
all sampled span attributes for PII/credential-shaped keys. Tenant evidence
requires non-null/no-default tenant columns and zero legacy/default rows.

Latency measurement makes 20–30 real production AI calls and persists canonical
results. Use the baseline and cold-start budget approved before rollout:

```sh
bun run ops:check:latency -- --execute --ticket CHANGE-0000 --base-url https://approved-canary.example --samples 20 --baseline-complete-p95-ms 0000 --cold-first-progress-budget-ms 0000
```

Require first-progress p95 at most 500 ms, completed-response p95 no more than
110% of baseline, and the first cold sample within its approved budget.

Alert rehearsal sends a real warning to every configured required operations
channel. Notify recipients first, then run:

```sh
bun run ops:rehearse:alert -- --execute --ticket CHANGE-0000 --actor operator@example.com
```

Require delivery success on every required/configured channel and persisted admin
audit evidence. A partial delivery is a failed gate, even if another channel
succeeded.

Finally, use the exact recorded UTC canary start:

```sh
bun run ops:check:canary -- --since 2026-08-14T00:00:00Z --minimum-hours 24 --minimum-writes 20 --minimum-trace-units 20 --minimum-trace-coverage 0.95
```

The canary passes only with zero critical ops events, cross-tenant events,
duplicate open handoffs, terminal queue failures, unsafe tenant rows and trace PII.

## 6. Stop-the-line and rollback

Stop promotion or roll the application path back if any PRD rollback condition or
gate above fails. Preserve the additive database objects; do not attempt a
destructive down migration. Then:

1. stop Worker consumption while preserving queued rows;
2. point Web traffic back to the last verified deployment;
3. retain outbox/queue state for reconciliation;
4. follow `worker-replay-and-reconciliation.md` for replay or terminal closure;
5. investigate trace/tenant evidence before resuming;
6. restore from backup only for confirmed data corruption, following
   `disaster-recovery.md` and with separate approval.

If trace PII or cross-tenant access is detected, treat it as a security/privacy
incident, restrict access to evidence, and do not paste raw rows into the ticket.

## 7. Completion record

Attach machine-readable outputs or CI artifacts, not screenshots alone:

| Evidence | Required result |
| --- | --- |
| Migration/schema parity | migration `20260813085000_trace_request_correlation`, no missing object |
| Web and Worker release | same approved commit, healthy independent runtimes |
| Full RAG evaluation | existing thresholds, citation 100%, high-risk recall 100% |
| Trace coverage | at least 20 units, coverage at least 95%, PII violations 0 |
| Tenant write audit | at least 20 writes, legacy/default rows 0, unsafe columns 0 |
| Latency | first progress and completion budgets pass |
| Alert rehearsal | every required channel delivered, audit row persisted |
| 24-hour canary | all critical/cross-tenant/duplicate/DLQ/PII counts 0 |

Only after every row is evidenced may the matching unchecked production boxes in
the PRD be marked complete.
