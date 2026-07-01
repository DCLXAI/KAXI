# KAXI Phase 1 Database Policy

Status: implemented for Phase 1 schema baseline
Last updated: 2026-07-01

## Scope

Phase 1 fixes the operational domain schema while keeping the current public MVP deploy path stable. The app still has a SQLite-compatible development schema for local/demo tests, but the operating target is PostgreSQL.

## Implemented Prisma Domain Models

The following Phase 1 core tables are defined in [schema.prisma](../prisma/schema.prisma):

| domain | models |
| --- | --- |
| organization/user | `Organization`, `User`, `StudentProfile` |
| consent/privacy | `Consent` |
| student journey | `JourneyState` |
| documents/files | `DocumentItem`, `UploadedFile` |
| compliance rules | `ComplianceRule`, `ComplianceRuleVersion`, `ComplianceRuleTest`, `ComplianceEvaluation` |
| RAG governance | `KnowledgeDocument`, `KnowledgeChunk` |
| escalation/review | `EscalationCase`, `AgentReview` |
| audit | `AuditEvent` |

Existing MVP tables (`Lead`, `PartnerRequest`, `School`, `ChatLog`, `Synonym`, `AdminAuditLog`, `RateLimitBucket`, `AgentRequestLedger`) remain for compatibility during migration.

## Migrations

SQLite-compatible development migration:

```text
prisma/migrations/20260701090000_phase1_operational_domain/migration.sql
```

PostgreSQL operational migration:

```text
prisma/postgres/migrations/20260701090000_phase1_operational_domain/migration.sql
```

The PostgreSQL migration uses enum types and JSONB fields for compliance rule ASTs, RAG metadata, consent evidence, and audit metadata.

## Environment Policy

| environment | database | required behavior |
| --- | --- | --- |
| Local demo | `DATABASE_URL=file:./db/custom.db` | SQLite-compatible DB may be restored from artifact or rebuilt from migrations. |
| CI | `DATABASE_URL=file:${GITHUB_WORKSPACE}/db/custom.db` | `RESTORE_SQLITE_DEMO_DB=false`; DB is rebuilt with `db:prepare-local` and seeded. |
| Preview/Production | `DATABASE_URL=postgresql://...` | Must use PostgreSQL before write-bearing operations are considered production-ready. |

## Local Rebuild

```bash
RESTORE_SQLITE_DEMO_DB=false bun run db:prepare-local
bun run db:seed:schools
bun run db:seed:synonyms
bun run test:schema
```

## Production Cutover

1. Provision managed PostgreSQL.
2. Apply `prisma/postgres/migrations/20260701090000_phase1_operational_domain/migration.sql`.
3. Load `DATABASE_URL=postgresql://...` into the deployment environment.
4. Seed operational lookup tables:

```bash
bun run db:seed:schools
bun run db:seed:synonyms
```

5. Run:

```bash
bun run db:check-production
```

6. Confirm `/api/readiness` reports the PostgreSQL target and no production write blockers.

## Readiness Gate

`test:readiness` and `/api/readiness` now include `database.postgresql_operational`.

Production is considered unfinished when:

- `DATABASE_URL` is `file:...`;
- the deployment relies on the bundled SQLite artifact;
- the active runtime provider has not completed PostgreSQL cutover;
- PII secrets, retention secret, admin MFA, or shared limiter DB are missing.

## RLS / pgvector Notes

The Phase 1 Prisma schema establishes the table boundaries needed for future PostgreSQL Row-Level Security and pgvector work. RLS policies and vector indexes are intentionally separate follow-up migrations because they require the actual production PostgreSQL provider and extension setup.

