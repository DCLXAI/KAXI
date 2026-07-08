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
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key for admin Auth/storage jobs. Never expose to the browser, logs, or JSON responses. |
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

The first Auth/RLS slice keeps server-side Prisma as the trusted operational path and adds a direct-client safety boundary for future Supabase browser clients.

Implemented boundary:

- `User.authUserId` maps an internal KAXI user to `auth.users.id`.
- `School` is public-readable only while its source review window is current.
- `KnowledgeDocument` and `KnowledgeChunk` are public-readable only for approved, current, non-superseded RAG.
- students can read their own profile, documents, journey state, compliance evaluations, and case data.
- partner agents can read cases assigned to their organization and linked student/document metadata.
- platform admins can read governance and operational tables through RLS-scoped direct clients.
- `DocumentFileBlob` has RLS enabled but no direct-client policy; original document bytes stay server/service-role only.
- direct-client mutations remain closed until the UI flow and audit requirements are explicitly designed.

Apply the slice after the case-pipeline migration:

```bash
SUPABASE_DIRECT_URL="<direct Supabase postgres url>" \
DATABASE_URL="$SUPABASE_DIRECT_URL" \
KAXI_PRISMA_PROVIDER=postgresql \
PRISMA_SCHEMA_PROVIDER=postgresql \
bun run db:migrate:deploy
```

Verify the policy migration locally before deploy:

```bash
bun run test:supabase-rls
bun run test:schema
```

Next Auth/RLS follow-ups:

- add Supabase Auth sign-up/sign-in UI for student and partner-agent accounts;
- create an admin-only account-linking flow that writes `User.authUserId`;
- move direct document downloads to Supabase Storage signed URLs;
- add write policies only for audited, narrow mutations such as case timeline comments or student profile self-service edits.

### Phase 3 Slice 2: Supabase Auth runtime

Runtime Auth integration uses Supabase Auth for students and partner agents while the existing NextAuth admin login remains unchanged.

Configured variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""
SUPABASE_POOLER_URL=""
SUPABASE_DIRECT_URL=""
```

Security boundary:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is browser-safe and may be bundled in client code.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only. Do not print it, return it from API routes, expose it to client components, or commit it.
- On machines where the direct Supabase hostname is IPv6-only or DNS-unresolvable, use `SUPABASE_POOLER_URL` for runtime Prisma work. Use direct URLs only from networks that can resolve and reach them.

Auth mapping:

- Supabase `auth.users.id` maps to `public."User"."authUserId"`.
- Student self-signup maps or creates `User.role = STUDENT` and ensures a `StudentProfile`.
- Partner agents must have a `PartnerAgentInvite` token. Only `tokenHash` is stored; the plaintext token is delivered out-of-band by an operator.
- Partner case APIs still call `src/lib/cases/repository.ts`, so assigned-organization scope and `THIRD_PARTY_PROVISION` consent checks remain server-enforced before the later RLS write-policy slice.

Manual Supabase Auth verification:

```bash
# 1. Install SDK packages if the sandbox did not install them.
bun add @supabase/supabase-js @supabase/ssr

# 2. Load runtime env without printing values.
set -a
source .local/supabase-kaxi-runtime.env
set +a
export DATABASE_URL="$SUPABASE_POOLER_URL"

# 3. Apply only forward migrations. Do not reset the remote database.
bun run db:migrate:deploy

# 4. Start the app and test student OTP/password signup.
bun run dev
# Open /student/login, sign up or request an email link, then confirm /student shows the mapped account.

# 5. Create a partner invite through the server helper or an admin script, deliver the plaintext token once,
# then open /partner/login?invite=<token> and verify /partner lists only cases assigned to that office.
```

Automated checks:

```bash
bun run test:supabase-rls
bun run test:supabase-auth
bun run ci:types
bun run lint
```

### Phase 3 Final Slice: Document Storage / OCR

Document byte storage can now use a private Supabase Storage bucket while the legacy database byte backend remains available as a fallback.

Recommended runtime env:

```bash
DOCUMENT_UPLOAD_STORAGE_BACKEND="supabase"
SUPABASE_STORAGE_BUCKET="kaxi-documents"
NEXT_PUBLIC_SUPABASE_URL=""
SUPABASE_SERVICE_ROLE_KEY=""
DOCUMENT_UPLOAD_SIGNING_SECRET=""
```

Security boundary:

- The bucket must be private.
- Upload, download, migration, and signed URL creation use the server-only service role key.
- Download links must be generated as short-lived signed URLs. KAXI caps helper-generated document links at 600 seconds.
- Existing `DocumentFileBlob` rows are not deleted by migration tooling; operators should verify object storage before choosing a separate cleanup plan.

Provision the bucket from a trusted operator machine:

```bash
set -a
source .local/supabase-kaxi-runtime.env
set +a
export DOCUMENT_UPLOAD_STORAGE_BACKEND="supabase"

bun run storage:provision:supabase
```

Migrate existing database blobs only after the bucket is provisioned. The script is idempotent and skips objects already present at the same `storageKey`.

```bash
set -a
source .local/supabase-kaxi-runtime.env
set +a
export DATABASE_URL="$SUPABASE_POOLER_URL"
export DOCUMENT_UPLOAD_STORAGE_BACKEND="supabase"

bun run storage:migrate:document-blobs
```

OCR behavior:

- Upload completion transitions `DocumentItem` through `OCR_PROCESSING`.
- Claude vision extraction uses structured JSON output through `src/lib/ai/claude-gateway.ts`.
- Sensitive extracted fields are encrypted into `DocumentItem.ocrExtractedCiphertext`; admin UI receives only redacted OCR JSON and validation metadata.
- If `ANTHROPIC_API_KEY` is not configured, OCR is skipped and the document becomes `NEEDS_REVIEW` / `NEEDS_HUMAN_REVIEW` for manual review.
