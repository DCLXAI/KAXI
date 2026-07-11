# KAXI Database Policy

Status: Phase 1 pgvector RAG baseline
Last updated: 2026-07-08

## Scope

KAXI now uses `prisma/postgres/schema.prisma` as the only Prisma schema. Supabase/PostgreSQL is the only supported runtime, local development, and CI database target.

## Implemented Domain Models

The core tables are defined in [schema.prisma](../prisma/postgres/schema.prisma):

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

Existing MVP tables (`Lead`, `PartnerRequest`, `School`, `ChatLog`, `Synonym`, `AdminAuditLog`, `RateLimitBucket`, `AgentRequestLedger`) remain until their Phase 1+ data migrations are complete.

## Migrations

PostgreSQL migrations live under:

```text
prisma/postgres/migrations
```

`20260708000000_enable_pgvector` enables the `vector` extension.
`20260708010000_pgvector_rag` adds the native `KnowledgeChunk.embedding vector(384)` column,
the generated `tsv` search column, HNSW/GIN indexes, and the RRF hybrid search SQL function.

## Environment Policy

| environment | database | required behavior |
| --- | --- | --- |
| Local development | `DATABASE_URL=postgresql://...` or Supabase local URL | Run `bun run db:migrate` or `bun run db:migrate:deploy`, then seed lookup tables. |
| CI | `pgvector/pgvector:pg17` service with `DATABASE_URL=postgresql://...` | Apply Postgres migrations and run the CI profiles. |
| Preview/Production | Supabase Postgres runtime URL plus `SUPABASE_DIRECT_URL` for migrations | `/api/readiness` must pass Postgres connectivity and production secret checks. |

## Setup

```bash
bun run db:migrate:deploy
bun run db:seed:schools
bun run db:seed:synonyms
bun run db:seed:rules
bun run knowledge:pgvector
bun run test:schema
```

## Readiness Gate

Production is considered unfinished when:

- no Postgres URL is configured;
- the configured DB URL is not PostgreSQL;
- Postgres connectivity fails;
- approved pgvector knowledge embeddings are missing;
- PII secrets, retention secret, linked admin role, or shared limiter DB are missing.

## RLS Notes

The Supabase Auth/RLS baseline lives in `20260708060000_supabase_auth_rls`.
It maps `auth.users.id` to `User.authUserId`, enables RLS on operational tables,
keeps direct-client mutations closed, exposes only public/current school and
approved RAG rows, and scopes student/partner/admin reads through helper
functions. Server-side Prisma remains the trusted mutation path until narrower
audited write policies are designed.
