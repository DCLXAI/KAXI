# KAXI Supabase Integration

Status: Phase 1 ready
Last updated: 2026-07-08

## Scope

KAXI can use Supabase as the managed PostgreSQL provider without replacing the current Prisma data access layer. This integration covers the operational database first:

- Prisma PostgreSQL runtime connection
- Prisma migration connection
- production readiness checks
- existing seed scripts for schools, synonyms, and compliance rules

Supabase Auth, Storage, pgvector RAG, and Edge Functions are compatible follow-up phases, but they are not required for the first DB cutover.

## Environment Variables

Use one of the standard KAXI PostgreSQL variables or the Supabase aliases below.

| variable | purpose |
| --- | --- |
| `DATABASE_URL` | Canonical app runtime PostgreSQL URL. Preferred for Vercel runtime. |
| `POSTGRES_URL` | Compatible alias for managed PostgreSQL providers. |
| `SUPABASE_DATABASE_URL` | Supabase Postgres URL alias. KAXI treats it as PostgreSQL when `DATABASE_URL` is empty or not set to PostgreSQL. |
| `SUPABASE_POOLER_URL` | Supabase pooler/session URL alias for app runtime. |
| `SUPABASE_DIRECT_URL` | Direct Supabase DB URL for Prisma migrations. Prefer this for `db:migrate:deploy`. |
| `PRISMA_SCHEMA_PROVIDER` | Set to `postgresql` in hosted Supabase deployments. |
| `KAXI_PRISMA_PROVIDER` | Set to `postgresql` in hosted Supabase deployments. |

Optional future variables:

| variable | purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project API URL for future client SDK usage. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key for future client SDK usage. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key for future admin/storage jobs. Never expose to the browser. |
| `SUPABASE_STORAGE_BUCKET` | Future document storage bucket, default `kaxi-documents`. |

## First Cutover

1. Create or choose a Supabase project.
2. Copy the database connection strings from Supabase Dashboard.
3. Configure Vercel production env:

```bash
DATABASE_URL="<supabase pooled/session postgres url>"
SUPABASE_DIRECT_URL="<supabase direct postgres url>"
PRISMA_SCHEMA_PROVIDER="postgresql"
KAXI_PRISMA_PROVIDER="postgresql"
```

4. Apply migrations from a trusted operator machine:

```bash
bun run db:generate
bun run scripts/deploy-postgres-migrations.ts
```

5. Seed operational lookup tables:

```bash
bun run db:seed:schools
bun run db:seed:synonyms
bun run db:seed:rules
```

6. Verify:

```bash
bun run db:check-production
curl https://kaxi.vercel.app/api/readiness
```

The readiness payload must report:

- `database.postgresql_operational: ok`
- `database.managed_writable: ok`
- `schools.source_metadata.metadata.source: "db"`
- `schools.source_metadata.metadata.fallbackAllowed: false`

## Migration Notes

Prisma migrations should use a direct database URL when possible. Runtime traffic can use a pooled/session URL. KAXI's migration helper checks `SUPABASE_DIRECT_URL` before generic runtime variables.

If the Supabase URL or password has been exposed in chat, logs, or a committed file, rotate the database password before treating the deployment as production.

## Follow-Up Phases

### Phase 2: Supabase Storage

Move uploaded document bytes from `DocumentFileBlob` database storage to Supabase Storage while keeping `UploadedFile` and `DocumentItem` metadata in PostgreSQL.

### Phase 3: pgvector RAG

Enable the `vector` extension and add embeddings to `KnowledgeChunk` or a dedicated `KnowledgeEmbedding` table. Production RAG should then run in `KNOWLEDGE_RAG_SOURCE=strict_db` mode and search only approved, current documents.

### Phase 4: Supabase Auth / RLS

Supabase Auth and row-level security can replace or augment the current NextAuth/admin-password flow, but this requires a separate role and tenant policy design for students, partner agents, and platform admins.
