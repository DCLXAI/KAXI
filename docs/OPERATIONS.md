# K-Bridge Operations Policy

## Required Environment Variables

- `DATABASE_URL`: Prisma database URL. SQLite is acceptable for local demos only.
- `ADMIN_API_KEY`: Required for admin APIs, lead exports, chat-log analysis, and synonym management.
- `MODEL_CACHE_DIR`: Optional local cache path for Transformer models. Defaults to `data/model-cache`.
- `VECTOR_CACHE_FILE`: Optional embedding cache file path. Defaults to `data/vector-store/embeddings-cache.json`.
- `AI_*_RATE_LIMIT`, `AI_*_DAILY_QUOTA`: Optional AI abuse and cost controls.
- `NEXTAUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`: Required for session-based admin login.
- `CODEX_SERVERLESS_ENABLED`, `CODEX_API_KEY`: Optional experimental Codex CLI bridge. Keep disabled unless admin-only usage is intended.

## Runtime Artifacts

The public repository includes compressed demo runtime artifacts under `runtime-artifacts/`.
They are restored automatically by `postinstall` through `scripts/restore-runtime-artifacts.ts`.

Included artifacts:

- `multilingual-e5-small` model cache, stored as gzip files so no single GitHub file exceeds 100 MB.
- Vector embedding cache for the bundled knowledge base.
- Sanitized SQLite MVP database with `Synonym` seed data and empty `Lead`, `PartnerRequest`, and `ChatLog` tables.

The restore script only creates missing files. It does not overwrite local runtime data.

## Database Policy

The checked-in schema is still MVP-oriented. Production must use a managed relational database, preferably Postgres.

1. Use Prisma migrations for every schema change.
2. Do not use `prisma db push` against production.
3. Keep local demo SQLite data out of deployment artifacts.
4. Treat `Lead`, `PartnerRequest`, and `ChatLog.question` as user data.
5. Define retention before production launch:
   - `ChatLog`: 30-90 days unless explicit analytics consent exists.
   - `Lead`: delete on user/admin request, or after the business retention window.
   - `PartnerRequest`: retain only while fulfillment/accounting requires it.
6. Before analytics export, redact contact details and free-form questions that may contain personal data.

## Migration Workflow

Local development:

```bash
bunx prisma migrate dev --name <change-name>
bunx prisma generate
```

CI / production:

```bash
bunx prisma migrate deploy
bunx prisma generate
```

## Data Source Policy

Visa, immigration, school-accreditation, and cost guidance are time-sensitive.

1. Every RAG source label must exist in `SOURCE_METADATA` in `src/lib/data/knowledge.ts`.
2. Official sources must include a public official-domain URL, `verifiedAt`, and `reviewAfter`.
3. Internal analysis sources must be marked `owner: "internal"` and reviewed at least quarterly.
4. Any document past `reviewAfter` must be excluded from production answers or reverified before release.
5. School data in `src/lib/data/schools.ts` is demo seed data until migrated into the `School` table with source URLs and verification dates.

## Admin Access

Admin APIs require `x-admin-key: $ADMIN_API_KEY` or `Authorization: Bearer $ADMIN_API_KEY`.
Do not expose admin navigation in public product surfaces. Direct hash routes may exist for demo access, but server-side guards are mandatory.

## AI Cost Controls

The app uses in-memory IP rate limits and daily quotas. This is enough for a single-node demo, not multi-instance production.

For production, replace the in-memory limiter with Redis/Upstash or a database-backed limiter so quota is shared across instances.

## Experimental Codex CLI Bridge

The app can route `/api/ai/agent` to Codex CLI when `CODEX_SERVERLESS_ENABLED=true` or `AGENT_BACKEND=codex`.
It also exposes `/api/codex/exec` for direct admin-only tests.

This bridge is intentionally guarded by `requireAdmin`. Do not expose it to public users:

1. Codex CLI can inspect the deployed bundle and may invoke shell commands.
2. Vercel functions are ephemeral and time-limited; long agent runs may timeout.
3. The native Codex binary is large, so Vercel function packaging may fail on plan or bundle limits.
4. Set `CODEX_API_KEY` in Vercel Production only if this risk is accepted.
5. Keep `CODEX_EXEC_RATE_LIMIT`, `CODEX_EXEC_TIMEOUT_MS`, and `CODEX_EXEC_MAX_CHARS` conservative.

Recommended production path remains a normal API-based agent using the OpenAI API or Vercel AI Gateway, not Codex CLI inside serverless.
