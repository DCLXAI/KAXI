# ADR-0005: Dedicated Worker Platform and Queryable Trace Ledger

- Status: Accepted
- Date: 2026-08-13
- Owners: Platform / Backend / Operations
- Related: `docs/PRD_TECHNICAL_ARCHITECTURE_UPLIFT.md`, ADR-0001, ADR-0004

## Context

PDF extraction, image OCR, local embedding, official-source monitoring, serving
projection updates, health probes and outbox delivery can exceed an interactive
request budget or block the JavaScript event loop. Running them in Next.js Route
Handlers kept their native dependencies in the Web deployment trace and coupled
batch failure, cold-start and retry behavior to user traffic.

The runtime also needs continuous polling, lease heartbeats and graceful
shutdown. Vercel Functions can execute bounded background invocations, but are
not a continuously running queue consumer. Vercel Services remain a Function
deployment model and were private beta when this decision was recorded. GitHub
Actions provide a useful external recovery signal, but their schedule and job
semantics are not the canonical durable work ledger.

## Decision

KAXI runs a separate Bun container service on Railway for production Worker
execution. The Worker image is built from `Dockerfile.worker`, exposes
`/healthz` and `/metrics`, and handles `SIGTERM`/`SIGINT` with a bounded graceful
shutdown. This ADR chooses the deployment target; an actual production rollout
still requires environment provisioning, secret review and operator approval.

PostgreSQL remains the durable queue and source of truth:

- `worker_jobs` provides an idempotency key, bounded attempts, deadline, lease
  token, heartbeat, exponential retry and dead-letter state;
- `worker_source_checkpoints` resumes an interrupted official-source run at the
  next incomplete source;
- `outbox_events` retains at-least-once operational delivery;
- attachment jobs retain their existing lease contract; and
- `chat_attachment_promotions` reconciles object movement and DB pointer commit
  when a process dies between those steps.

The Worker schedules official-source checks, embeddings, serving projection and
system health itself with time-bucketed idempotency keys. GitHub schedules call
enqueue-only recovery endpoints and are not the sole execution trigger.

All channels use W3C `traceparent`. Web and Worker spans are exported, fail-open,
to the service-role-only `trace_spans` ledger. Operators can query the ledger by
`traceId` or `requestId` through the authenticated Admin Ops API. Span attributes
pass through the same recursive PII and credential redaction used for structured
logs. Export failure must never fail a user request or Worker job.

## Alternatives Considered

### Vercel Functions or Vercel Services

This keeps one vendor and deployment surface, but remains bounded Function
execution and does not provide the continuous polling/heartbeat process required
by this queue design. It can be reconsidered when Services is generally
available and its runtime/lifecycle contract fits the Worker.

### GitHub Actions as the Worker

This requires little new infrastructure, but schedule latency, cancellation and
retry state live outside the product ledger. It remains a recovery trigger only.

### Managed queue plus serverless consumers

A managed queue could improve elasticity, but adds another canonical delivery
system before existing load demonstrates that PostgreSQL `SKIP LOCKED` is the
bottleneck. The job contract is vendor-neutral enough to add a transport later.

## Consequences

- Web/API import closure must not reach `pdf-parse`,
  `@huggingface/transformers`, document OCR/verification, source monitoring or
  embedding execution modules.
- Queue depth, oldest age, retries and DLQ count are visible in Admin Ops and the
  Worker metrics endpoint; threshold breaches create operational events.
- A killed Worker is recoverable after lease expiry, and duplicate enqueue or
  delivery converges through database idempotency.
- Railway receives only Worker-required database, storage and provider secrets;
  the Web runtime no longer executes Worker-owned heavy code.
- Deployment and production trace-coverage validation remain operational rollout
  gates, not assumptions inferred from local tests.

## Verification

`scripts/test-worker-runtime.ts` verifies lease reclaim after simulated kill,
source cursor resume, object-move/DB-pointer reconciliation, queue metrics, W3C
trace propagation, PII redaction, fail-open export and trace/request lookup.

`scripts/test-architecture-boundaries.ts` computes the complete runtime import
closure rooted at `src/app` and rejects Worker-owned heavy modules or packages.
The production Next build trace is also scanned before Phase 2 rollout.

## References

- [Vercel Services](https://vercel.com/docs/services)
- [Vercel Function duration](https://vercel.com/docs/functions/configuring-functions/duration)
- [Railway workers and queues](https://docs.railway.com/guides/cron-workers-queues)
- [Railway restart policy](https://docs.railway.com/deployments/restart-policy)
- [Next.js instrumentation](https://nextjs.org/docs/pages/api-reference/file-conventions/instrumentation)
