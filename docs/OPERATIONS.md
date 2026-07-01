# KAXI Operations Policy

## Required Environment Variables

- `DATABASE_URL`: Database URL. Local development may use `file:./db/custom.db`; production must target PostgreSQL after the Phase 1 cutover (`postgresql://...` or `postgres://...`).
- `RESTORE_SQLITE_DEMO_DB`: Set `false` in CI/hosted builds to avoid depending on the bundled SQLite demo DB. Local demos may leave it unset to restore `runtime-artifacts/db/custom.db`.
- `ADMIN_API_KEY`: Break-glass admin API key for admin APIs. Prefer session login for day-to-day operations.
- `MODEL_CACHE_DIR`: Optional local cache path for Transformer models. Defaults to `data/model-cache` locally and `/tmp/kaxi-model-cache` on Vercel/serverless runtimes.
- `VECTOR_CACHE_FILE`: Optional embedding cache file path. Defaults to `data/vector-store/embeddings-cache.json`.
- `RESTORE_MODEL_CACHE_ON_INSTALL`: Set `true` to decompress the local Transformer model during install. Vercel builds skip this by default to keep function bundles under file-size limits.
- `AI_*_RATE_LIMIT`, `AI_*_DAILY_QUOTA`: Optional AI abuse and cost controls. Use `0` to disable a specific limit. Public Agent and Consult demos default to disabled limits until a managed shared limiter is configured.
- `RATE_LIMIT_BACKEND`: `auto`, `database`, or `memory`. Use `database` with a writable shared PostgreSQL production DB so Vercel instances share quota.
- `AI_CONSULT_BACKEND`: Optional Consult backend override: `remote-bridge`, `codex`, or `zai`. When unset, Consult follows the remote Codex bridge if the Agent backend is configured that way.
- `AI_AGENT_PREFLIGHT_ENABLED`: Enables deterministic server-side tool/RAG preflight before Codex bridge calls.
- `AI_AGENT_PREFLIGHT_TIMEOUT_MS`, `AI_AGENT_CONTEXT_MAX_CHARS`, `AI_AGENT_GROUNDED_QUESTION_MAX_CHARS`: Bound preflight latency and context sent to the LLM bridge.
- `AI_AGENT_LOGGING_ENABLED`: Enables Agent `ChatLog` persistence. It is automatically skipped on hosted SQLite deployments.
- `AI_AGENT_LEDGER_ENABLED`: Enables per-request Agent cost/quality ledger persistence. It is automatically skipped on hosted SQLite deployments.
- `NEXTAUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`: Required for session-based admin login. Generate the hash with `bun run admin:hash-password -- <password>`.
- `ADMIN_PASSWORD`: Local/demo fallback only. Do not use plaintext admin passwords in production.
- `ADMIN_ROLE`: `owner`, `admin`, or `viewer`. `viewer` can read admin dashboards but cannot mutate data.
- `ADMIN_MFA_TOTP_SECRET`: Base32 TOTP secret for admin MFA. Required in hosted/production admin login.
- `DATA_ENCRYPTION_KEY`, `PII_HASH_SECRET`: Required before production writes. Encrypts contact/free-form question payloads and hashes them for deletion lookup.
- `PII_ALLOW_UNENCRYPTED_PLAINTEXT`: Local development escape hatch only. Keep `false` in production.
- `PRIVACY_CHATLOG_RETENTION_DAYS`, `PRIVACY_PARTNER_REQUEST_RETENTION_DAYS`, `PRIVACY_LEAD_RETENTION_DAYS`: Retention windows enforced by `/api/privacy/retention`.
- `CRON_SECRET`: Required for Vercel Cron to call `/api/privacy/retention`.
- `AGENT_BACKEND`: Agent backend selector. Defaults to `codex`; set `zai` only when explicit Z.ai settings are present.
- `CODEX_AUTH_MODE`: `auto`, `local`, or `api-key`. `auto` uses the current local Codex CLI login in local dev and API-key mode on Vercel.
- `CODEX_API_KEY`: Required on Vercel when `AGENT_BACKEND=codex`.
- `CODEX_AGENT_REQUIRE_ADMIN`: Optional guard for `/api/ai/agent` Codex execution. Keep `false` for public demo, `true` for private/internal use.
- `ZAI_ENABLED`, `ZAI_API_KEY`, `ZAI_CONFIG_PATH`: Optional legacy Z.ai SDK configuration. Leave disabled for Codex CLI/bridge operation.
- `DOCUMENT_UPLOAD_SIGNING_SECRET`: HMAC secret for short-lived document upload URLs. Required before enabling document uploads outside local development.
- `DOCUMENT_UPLOAD_MAX_BYTES`: Optional max upload size. Defaults to 10 MB.
- `DOCUMENT_UPLOAD_DIR`: Local byte-storage path for development. Production should use managed object storage.
- `DOCUMENT_UPLOAD_STORAGE_BACKEND`: Set to `blob` for hosted document uploads.
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob read/write token. Required when hosted document uploads store original document bytes.
- `DOCUMENT_UPLOAD_STORE_BYTES`: Set `false` only when the direct upload endpoint should persist metadata without local bytes, usually during storage-provider migration tests.

## Runtime Artifacts

The public repository includes compressed demo runtime artifacts under `runtime-artifacts/`.
They are restored automatically by `postinstall` through `scripts/restore-runtime-artifacts.ts`.

Included artifacts:

- `multilingual-e5-small` model cache, stored as gzip files so no single GitHub file exceeds 100 MB.
- Vector embedding cache for the bundled knowledge base.
- Sanitized SQLite MVP database with `Synonym` seed data, 50 `School` rows including source metadata, and empty user-generated tables. This artifact is a local/demo convenience only, not an operational production database.

The restore script only creates missing files. It does not overwrite local runtime data.
On Vercel builds it restores vector/DB artifacts but does not decompress the large ONNX model unless `RESTORE_MODEL_CACHE_ON_INSTALL=true`.

## Database Policy

Phase 1 fixes the domain schema and PostgreSQL operating target while keeping the public MVP's SQLite-compatible development schema available during cutover. Production writes must move to PostgreSQL. The checked-in `prisma/postgres/migrations/20260701090000_phase1_operational_domain/migration.sql` is the operational PostgreSQL DDL for the Phase 1 domain model.

1. Use Prisma migrations for every schema change.
2. Do not use `prisma db push` against production.
3. Keep personal/local demo user data out of deployment artifacts.
4. Treat `Lead`, `PartnerRequest`, `ChatLog.question`, `Consent`, and `AgentRequestLedger.ip/userId` as user data.
5. `Lead.contact`, `PartnerRequest.question`, and `ChatLog.question` are stored with ciphertext/hash columns when `DATA_ENCRYPTION_KEY` is set. Existing plaintext columns keep only a masked display value. In production, PII-bearing writes are not persisted unless encryption is configured; local development without a key stores `[redacted-unencrypted]` unless the local-only `PII_ALLOW_UNENCRYPTED_PLAINTEXT=true` escape hatch is set outside production.
6. Partner routing requires active consent for `THIRD_PARTY_PROVISION`, `PROCESSING_CONSIGNMENT`, and `OVERSEAS_TRANSFER`; otherwise `POST /api/partner-requests` returns `428 CONSENT_REQUIRED` before creating a `PartnerRequest`.
7. Deletion requests are accepted through `POST /api/privacy/delete-request` with `leadId`, `contact`, or an exact `question`. The request does not reveal whether a record exists and withdraws active lead consents when a matching lead is found.
8. Retention is enforced by `POST /api/privacy/retention` for admins and daily Vercel Cron `GET /api/privacy/retention`; lead consent rows are expired when the linked lead reaches deletion or retention expiry.
9. Before analytics export, use the redacted ChatLog analysis route or scripts; free-form questions are masked for emails, phone numbers, and private messenger handles.

Hosted Vercel deployments must not rely on bundled SQLite for writes. The bundled DB is a demo seed/read model. Use a reachable managed PostgreSQL database for admin CRUD, lead capture, partner requests, chat logs, Agent ledger persistence, audit logs, retention, compliance evaluations, knowledge governance, escalation cases, and shared rate-limit buckets.

When `DATABASE_URL` is `postgres://...` or `postgresql://...`, `bun run db:generate` and `postinstall` generate `@prisma/client` from `prisma/postgres/schema.prisma`. Local/CI `file:` URLs continue to generate the SQLite-compatible client from `prisma/schema.prisma`.

### Environment Policy

| environment | database policy | artifact policy |
| --- | --- | --- |
| Local demo | `DATABASE_URL=file:./db/custom.db` is allowed. Run `bun run db:prepare-local`, `bun run db:seed:schools`, `bun run db:seed:synonyms`, and `bun run db:seed:rules` when rebuilding from migrations. | `RESTORE_SQLITE_DEMO_DB` may be unset so the demo DB is restored if missing. |
| CI | Uses SQLite-compatible migration replay for fast tests, with `RESTORE_SQLITE_DEMO_DB=false`; the DB must be created from migrations and seeds, not copied from runtime artifacts. | Runtime vector/model artifacts may be restored; DB artifact is skipped. |
| Preview/Production | Must configure PostgreSQL as the operational target and pass `/api/readiness` checks before write-bearing features are considered production-ready. | SQLite DB artifact is read-only/demo fallback only and must not be used for production writes. |

Document uploads additionally require durable object storage in hosted environments. Set `DOCUMENT_UPLOAD_STORAGE_BACKEND=blob` and `BLOB_READ_WRITE_TOKEN` before enabling upload URLs. Without durable storage, `/api/documents/upload-intent` returns `DOCUMENT_WORKSPACE_UNAVAILABLE` instead of accepting files into an ephemeral serverless filesystem.

## Migration Workflow

Local development:

```bash
bunx prisma migrate dev --name <change-name>
bunx prisma generate
bun run db:seed:schools
bun run db:seed:synonyms
bun run db:seed:rules
bun run db:seed:admin-demo
```

CI / production sanity check:

```bash
bun run db:migrate:deploy
bun run db:generate
```

For PostgreSQL production, provision the database first, load `DATABASE_URL=postgresql://...`, then run `bun run db:migrate:deploy` from a trusted operator machine or CI job. This command uses `prisma/postgres/schema.prisma` and `prisma/postgres/migrations`. After migration, run `bun run db:seed:schools`, `bun run db:seed:synonyms`, and `bun run db:seed:rules` with production DB env loaded so `School`, `Synonym`, and approved compliance rule versions are operational tables. `GET /api/readiness` will not pass merely because the env var exists; it also checks connectivity and required production secrets.

If a production `DATABASE_URL`, Prisma Accelerate URL, or Blob token is exposed in chat, logs, or a committed file, rotate it before using it in Vercel.

After loading production DB env locally, verify the managed DB before deploying or promoting:

```bash
bun run db:check-production
```

## Data Source Policy

Visa, immigration, school-accreditation, and cost guidance are time-sensitive.

1. Every static RAG source label must exist in `SOURCE_METADATA` in `src/lib/data/knowledge.ts`.
2. Official sources must include a public official-domain URL, `verifiedAt`, and `reviewAfter`.
3. Internal analysis sources must be marked `owner: "internal"` and reviewed at least quarterly.
4. Production RAG may use a `KnowledgeDocument` only when `reviewStatus=APPROVED`, `validFrom` is active, `validTo` is empty or in the future, `supersededBy` is empty, and at least one `KnowledgeChunk` exists.
5. School data is served from the `School` table. `src/lib/data/schools.ts` remains a local development seed/fallback only; hosted and production runtimes fail closed instead of silently serving seed data when the table is unavailable or empty.
6. RAG search and legacy retrieval automatically exclude documents whose source metadata is past `reviewAfter`; DB-backed RAG additionally excludes rejected and superseded documents.
7. Automated crawling must only calculate diff and impact. It must not write new production chunks or change approval status without an admin approval action.
8. Every answer grounded in RAG must show the source label and `lastCheckedAt` basis notice.
9. Knowledge diff output must include impacted `ComplianceRuleVersion` rows and impacted chat/user records so operators know which rules and prior users may need follow-up after a source change.
10. Each `School` row must include `sourceUrl`, `verifiedAt`, and `reviewAfter`; public school APIs hide rows past `reviewAfter`.
11. Admins can inspect expired schools with `includeExpired=true` and reverify a school through `POST /api/schools/:id/review`.
12. `bun run test:governance` verifies source metadata, school seed metadata, and automatic expiry filtering.

## Admin Access

Admin APIs require a session login or break-glass `x-admin-key: $ADMIN_API_KEY` / `Authorization: Bearer $ADMIN_API_KEY`.
Do not expose admin navigation in public product surfaces. Admin UI routes such as `/admin` and `/synonyms` are real Next.js routes, but server-side API guards remain mandatory.
Prefer session login through `/login`; the browser API-key fallback is intentionally memory-only and should be used only for temporary operations.
Production/hosted admin login fails closed unless `NEXTAUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, a valid `ADMIN_ROLE`, and `ADMIN_MFA_TOTP_SECRET` are configured, and plaintext `ADMIN_PASSWORD` is empty. Admin actions and privacy operations are written to `AdminAuditLog`; inspect with `GET /api/audit-logs`.

## CI Quality Gates

GitHub Actions restores non-DB runtime artifacts during `bun install --frozen-lockfile`, prepares the local test DB from Prisma migrations and seed scripts, then runs typecheck, lint, `test:schema`, `test:vector`, `test:rules`, `test:quality`, `test:governance`, `test:rag-ops`, `test:privacy`, `test:agent`, and production build.
`test:schema` verifies the Phase 1 domain models, SQLite-compatible migration replay, and PostgreSQL operational migration DDL.
`test:vector` verifies the restored model/vector cache can retrieve expected KAXI source documents.
`test:rules` verifies the DB-backed D-2/D-4 Compliance Rule Engine, including approved-only execution, effective date windows, required source refs, 20+ golden cases, and `ComplianceEvaluation` persistence.
`test:quality` validates the multilingual evaluation set in `quality/multilingual-eval-cases.json`, including expected source document, refusal expectation, and cost-format labels.
`test:rag-ops` verifies Phase 7 RAG operations: approved-only production search, rejected/superseded blocking, answer source/checked-date notices, impact lists for rules/users, and diff-only crawler behavior.
`test:privacy` verifies consent-gated partner routing, third-party/consignment/overseas consent rows, privacy audit events, deletion/retention consent status changes, PII encryption/redaction behavior, production PII persistence guards, and hosted SQLite write guards.
`test:agent` verifies Agent status diagnostics, dry-run preflight behavior, and partner-request PII masking.
`test:admin-dashboard` verifies the Phase 3 admin APIs for cases, case actions, rules, knowledge documents, and audit logs.
`test:documents` verifies Phase 5 signed document upload, file hash/size/MIME validation, admin review status changes, and audit logs.
`test:readiness` verifies that production readiness fails closed when managed DB, PII secrets, MFA, retention, or shared limiter settings are missing.

## Production Readiness

`GET /api/readiness` is the operational go/no-go check for the governance items in this document.
It returns `200` only when required production checks pass and `503` when the deployment is still a demo/read-only configuration.

The readiness response intentionally exposes only booleans and reason strings, not secret values.
Before treating KAXI as production-ready, `/api/readiness` must report `status: "ready"` for:

- current RAG `reviewAfter` metadata and non-expired school source metadata,
- PostgreSQL operational database target and reachable managed database instead of bundled SQLite,
- `DATA_ENCRYPTION_KEY`, `PII_HASH_SECRET`, retention `CRON_SECRET`,
- shared database-backed rate limit,
- hashed admin login, MFA, valid role, and audit-log persistence.

## AI Cost Controls

The app supports shared IP rate limits and daily quotas through `RateLimitBucket`.

Use `RATE_LIMIT_BACKEND=database` with a reachable managed production DB for Vercel multi-instance deployments. `auto` uses the shared database when it is configured and falls back to memory only outside hosted/production runtimes. In production, finite limits fail closed with HTTP 503 if the shared limiter backend is unavailable; set a specific limit to `0` only for intentionally disabled endpoints.

## Agent Grounding

`/api/ai/agent` runs a deterministic KAXI preflight before Codex bridge calls when `AI_AGENT_PREFLIGHT_ENABLED` is not `false`.
The preflight uses the same intent planner as the built-in fallback agent, with Korean, English, Vietnamese, and Mongolian cues for school search, cost calculation, document checklist, path diagnosis, partner request drafts, and RAG search tools.
The resulting compact context is prepended to the Codex bridge prompt so public answers are grounded in KAXI data even when the bridge is running in fast direct-answer mode.

Partner requests created from the conversational agent stay in dry-run draft mode. Persist actual contact requests through the explicit lead/partner intake flow so consent, retention, and PII controls remain clear.

Keep `AI_AGENT_PREFLIGHT_TIMEOUT_MS` below the total function budget. If preflight times out, the route skips grounding and continues with the original user question.
Agent `ChatLog` and `AgentRequestLedger` persistence should use a writable production database. Hosted deployments using `DATABASE_URL=file:...` skip Agent log and ledger writes to avoid read-only SQLite failures.

The ledger records IP/user id, backend, Codex mode, duration, estimated tokens, grounded/tool count, success/failure, and compact error type/message. It is for cost/debug accounting, not a permanent user profile.

## Codex CLI Agent Backend

The app routes `/api/ai/agent` to Codex CLI by default (`AGENT_BACKEND=codex`).
Set `AGENT_BACKEND=zai` only if the deployment explicitly configures `ZAI_ENABLED=true` with `ZAI_CONFIG_PATH` or another SDK-supported credential path.
If Codex credentials are missing or a Codex run fails, `/api/ai/agent` falls back to the built-in tool engine instead of returning 500.

Local development can reuse the Codex CLI login already present on the developer machine:

```bash
CODEX_AUTH_MODE=auto bun run dev
```

In local mode the app runs the system `codex` binary, defaults `CODEX_HOME` to `~/.codex`, and returns `backend: "codex-cli-local"` from `/api/ai/agent`.
Use `CODEX_CLI_PATH` or `CODEX_LOCAL_HOME` only when the CLI binary or auth cache lives somewhere non-standard.
Set `CODEX_USE_USER_CONFIG=true` only for trusted local experiments that should load the user's full Codex config.

Vercel Production cannot access the developer machine's current Codex CLI session.
Do not copy `~/.codex/auth.json` into source control, chat, or public deployment artifacts.
For production Codex CLI execution, set:

```env
AGENT_BACKEND=codex
CODEX_AUTH_MODE=api-key
CODEX_API_KEY=...
```

### Browser-to-Local Codex Bridge

When the developer MacBook is on, the deployed site can use that Mac's current Codex CLI through a localhost bridge.
This is intended for the owner opening `https://kaxi.vercel.app/agent` on the same Mac, not for public multi-user production.

Start the bridge:

```bash
bun run codex:bridge
```

On macOS, keep the bridge awake while the lid is open:

```bash
bun run codex:bridge:awake
```

The bridge listens on `http://127.0.0.1:8787` by default.
The deployed Agent UI does not auto-probe localhost. Set `NEXT_PUBLIC_CODEX_BRIDGE_URL` or the browser override below only for trusted owner sessions that should call the local bridge directly.
If the bridge is reachable, chat requests go to the local Codex CLI and return `backend: "codex-cli-local-bridge"`.
If it is not reachable or a bridge request fails, the UI falls back to `/api/ai/agent` on Vercel.
`GET /api/ai/agent` returns safe diagnostics for backend readiness, bridge configuration, preflight, limits, and persistence without exposing secrets.

Useful browser overrides:

```js
localStorage.setItem("kaxiCodexBridgeUrl", "http://127.0.0.1:8787/api/ai/agent")
localStorage.setItem("kaxiCodexBridgeUrl", "off")
localStorage.setItem("kaxiCodexBridgeToken", "...")
```

Useful bridge environment variables:

- `CODEX_BRIDGE_HOST`: Defaults to `127.0.0.1`. Keep localhost unless using a trusted tunnel.
- `CODEX_BRIDGE_PORT`: Defaults to `8787`.
- `CODEX_BRIDGE_PREVENT_SLEEP`: Set `true` to run macOS `caffeinate` while the bridge process is alive.
- `CODEX_BRIDGE_ALLOWED_ORIGINS`: Comma-separated browser origins allowed by CORS.
- `CODEX_BRIDGE_TOKEN`: Optional token required as `x-kaxi-codex-bridge-token`.
- `CODEX_EXEC_TIMEOUT_MS`: Codex CLI timeout for each local bridge request.

Do not bind the bridge to `0.0.0.0` or expose it through a tunnel without `CODEX_BRIDGE_TOKEN`.

### Public Users Through A Mac Tunnel

For external users, do not expose the bridge token in browser JavaScript.
Use Vercel as the server-side proxy:

```env
AGENT_BACKEND=remote-bridge
CODEX_REMOTE_BRIDGE_URL=https://<tunnel-host>/api/ai/agent
CODEX_REMOTE_BRIDGE_TOKEN=<same-secret-as-CODEX_BRIDGE_TOKEN-on-the-Mac>
CODEX_REMOTE_BRIDGE_TIMEOUT_MS=55000
# Optional. If unset, /consult follows AGENT_BACKEND=remote-bridge automatically.
AI_CONSULT_BACKEND=remote-bridge
```

On the Mac:

```bash
export CODEX_BRIDGE_TOKEN=<long-random-secret>
bun run codex:bridge
```

Then expose `http://127.0.0.1:8787` through a tunnel such as Cloudflare Tunnel, ngrok, or Tailscale Funnel.
The tunnel URL goes only into Vercel server environment variables as `CODEX_REMOTE_BRIDGE_URL`.
The public frontend continues calling `/api/ai/agent` and `/api/ai/consult`, and Vercel forwards LLM-bound requests to the Mac bridge with the secret token.
When the remote bridge is unavailable, `/api/ai/agent` returns a built-in `tool-fallback` answer instead of surfacing a 502 to public users.
When the Consult bridge is unavailable, `/api/ai/consult` falls back to a direct official-source summary with the normal administrative-scrivener disclaimer.

Minimum safety rules:

1. Keep `CODEX_BRIDGE_TOKEN` enabled for any tunnel.
2. For public stress testing, set `CODEX_BRIDGE_RATE_LIMIT=0`, `AI_AGENT_RATE_LIMIT=0`, `AI_AGENT_DAILY_QUOTA=0`, `AI_CONSULT_RATE_LIMIT=0`, and `AI_CONSULT_DAILY_QUOTA=0`.
3. Keep Codex sandbox `read-only` and `CODEX_USE_USER_CONFIG=false`.
4. Do not run the bridge from a directory containing private files that external prompts should never inspect.
5. Turn off the tunnel when public testing is over.

`/api/codex/exec` remains guarded by `requireAdmin` for direct admin-only tests.
For `/api/ai/agent`, set `CODEX_AGENT_REQUIRE_ADMIN=true` if Codex should be private/internal only.

Codex CLI in serverless has important tradeoffs:

1. Codex CLI can inspect the deployed bundle and may invoke shell commands.
2. Vercel functions are ephemeral and time-limited; long agent runs may timeout.
3. The native Codex binary is large, so Vercel function packaging may fail on plan or bundle limits.
4. Set `CODEX_API_KEY` in Vercel Production only if this cost and runtime risk is accepted.
5. Keep `CODEX_EXEC_RATE_LIMIT`, `CODEX_EXEC_TIMEOUT_MS`, and `CODEX_EXEC_MAX_CHARS` conservative.

Recommended production path remains a normal API-based agent using the OpenAI API or Vercel AI Gateway, not Codex CLI inside serverless.
