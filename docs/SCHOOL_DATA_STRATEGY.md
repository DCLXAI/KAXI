# KAXI School Data Strategy

## Decision

The operational source of truth for school data is the `School` table.

`src/lib/data/schools.ts` is retained only as:

- a local development seed,
- the input for `bun run db:seed:schools`,
- a non-hosted local fallback when the database is unavailable,
- a governance audit fixture for metadata checks.

Hosted preview and production runtimes must fail closed when the operational `School` table is unavailable or empty. They must not silently serve seed data.

## Why

School recommendations affect visa preparation, cost planning, and partner routing. A hybrid model where public UI sometimes reads static seed data and sometimes reads Prisma rows makes it hard to answer:

- which source was shown to the user,
- when the school row was last verified,
- whether expired rows are hidden,
- whether admin review actually affects production answers.

The repository boundary keeps that behavior explicit.

## Runtime Boundary

Public product surfaces must use one of these paths:

- `/api/schools`
- `src/lib/schools/repository.ts`
- type-only imports from `src/lib/data/schools.ts`

They must not directly import the `SCHOOLS` seed array at runtime.

Allowed runtime seed consumers:

- `src/lib/schools/repository.ts`, only for non-hosted local fallback,
- `scripts/seed-schools.ts`, to load the operational table,
- `scripts/audit-data-governance.ts`, to verify seed metadata before seeding.

## Metadata Contract

Each school row must include:

- `officialUrl`
- `sourceUrl`
- `verifiedAt`
- `reviewAfter`

Public reads hide rows whose `reviewAfter` is in the past unless an authenticated admin requests `includeExpired=true`.

`GET /api/schools` returns provenance fields:

- `source`: `db` or `seed`
- `operational`: whether the operational table served the response
- `fallback`: whether local seed fallback was used
- `activeRows`: active row count used for operational checks

## Operating Workflow

1. Update seed fixtures only when source metadata is also updated.
2. Run `bun run db:seed:schools` against the target database.
3. Verify `GET /api/schools` returns `source: "db"` and `operational: true`.
4. Use admin review APIs for re-verification instead of editing production rows ad hoc.
5. Treat the bundled SQLite DB and seed file as demo artifacts, not production data.

## Migration Path

Phase 1 keeps the seed file because it is useful for local demos and CI fixtures.

A later phase may remove public seed fallback entirely after:

- production PostgreSQL is mandatory for all deployments,
- seed import is limited to migration/fixture scripts,
- admin school review has operational owner and audit reporting,
- source-change monitoring covers school accreditation/source pages.
