# PostgreSQL disaster recovery rehearsal

Production recovery uses a custom-format `pg_dump`, an empty recovery database, `pg_restore --exit-on-error`, and application-level verification before any traffic switch. Never restore over the active database.

## Objectives

- Target RPO: the managed PostgreSQL point-in-time recovery window; manual exports are an additional release checkpoint.
- Target RTO: restore, schema parity, tenant sentinel, queue/outbox reconciliation, then controlled traffic promotion within 60 minutes.
- Required evidence: backup SHA-256, migration count, tenant counts, latest accepted chat/outbox timestamps, restore duration, operator and incident ID.

## Rehearsal

Run `bun run test:disaster-recovery` only with a loopback `TEST_DATABASE_URL` whose database name ends in `_test`. The test resets that isolated database, inserts a sentinel, creates a custom-format backup, restores it into a newly generated `_test` database, verifies data and migration history, then removes the temporary restore database and dump.

## Production sequence

1. Freeze write traffic and record the last accepted request/outbox IDs.
2. Create or select a point-in-time snapshot; record checksum and timestamp.
3. Restore into a new database/project, never the active target.
4. Run schema parity and read-only tenant/message/handoff/outbox integrity queries.
5. Reconcile attachment promotion, Worker leases, retries, and outbox deliveries without issuing duplicate external side effects.
6. Point a canary deployment at the restored database and exercise readiness plus signed Web/Worker/n8n tenant paths.
7. Promote traffic only after two operators approve the evidence. Roll back by restoring the previous connection target; do not destructively down-migrate.
