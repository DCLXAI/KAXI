# ADR-0004: Atomic Chat Persistence and Transactional Outbox

- Status: Accepted
- Date: 2026-08-13
- Owners: Backend / Tech Lead / Operations
- Related: `docs/PRD_TECHNICAL_ARCHITECTURE_UPLIFT.md`, ADR-0001, ADR-0003

## Context

An accepted Typebot turn previously persisted its chat message, retrieval run and
required human handoff through separate database and Supabase REST calls. A
failure between those calls could return or retain a partially accepted turn.
External notification delivery was also coupled too closely to request success,
so a provider outage could either hide an already valid handoff or lose its
follow-up signal.

The persistence contract needs one source of truth for message, retrieval,
attachment links, required handoff and asynchronous side effects. Concurrent
retries from separate web or Worker instances must return the same canonical
records without process-local locking.

## Decision

KAXI uses a Prisma interactive transaction over PostgreSQL for the accepted chat
unit of work.

The transaction:

1. acquires a transaction-scoped PostgreSQL advisory lock derived from the
   idempotency key;
2. upserts the canonical chat session and message;
3. links verified attachments and upserts the completed retrieval run;
4. creates or updates the required canonical handoff when `needsHuman=true`;
5. inserts one PII-minimized `OutboxEvent`; and
6. returns `persistenceAccepted=true` only after the transaction commits.

The chat idempotency key has a full unique PostgreSQL index. PostgreSQL permits
multiple `NULL` values, preserving optional legacy rows while giving Prisma a
native conflict target. `(eventType, idempotencyKey)` uniquely identifies an
outbox event. A retry with a different session or question hash is rejected.

Prisma was chosen instead of a database function because the current application
already owns encryption/redaction, retrieval metadata normalization and typed
models in TypeScript. Keeping that policy in one application/infrastructure path
avoids duplicating it in PL/pgSQL. The transaction remains database-native and
can later be replaced behind the same use-case contract if contention data
justifies a stored function.

Outbox delivery is at-least-once:

- consumers claim bounded batches with `FOR UPDATE SKIP LOCKED`;
- a UUID lease token protects acknowledgement and failure updates;
- stale processing leases are reclaimable;
- failures use bounded exponential backoff and eventually enter
  `dead_letter`;
- the event ID is the stable downstream delivery/idempotency key; and
- protected aggregate data is fetched at delivery time rather than copied into
  the event payload.

`outbox_events` is service-role-only, tenant-scoped, retained for 90 days by
default and included in the privacy retention job. The initial consumer can run
from a script, but ADR-0001 assigns its production execution to the dedicated
Worker introduced in Phase 2.

## Consequences

- Retrieval, handoff or outbox insertion failure rolls back the entire accepted
  turn, including the session/message write and attachment links.
- Provider availability no longer controls whether a handoff is visible in the
  canonical operations queue.
- Ten parallel retries of the same logical turn produce one message, retrieval
  run, open handoff and outbox event.
- Long-running provider calls never occur inside the business transaction.
- Advisory-lock contention and outbox queue age become operational signals that
  Phase 2 observability must expose.

## Verification

`scripts/test-atomic-chat-outbox.ts` runs against PostgreSQL and verifies:

- rollback after injected retrieval and handoff failures;
- ten-way concurrent idempotent persistence;
- attachment linking and PII-minimized event payloads; and
- a 30-minute provider outage followed by successful retry without duplicate
  delivery.

`scripts/test-architecture-boundaries.ts` separately enforces that the
service-role Supabase client is created only in the infrastructure boundary.
