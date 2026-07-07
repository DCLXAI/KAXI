# KAXI Operations Policy

## Required Environment Variables

- `DATABASE_URL`: Supabase/PostgreSQL database URL (`postgresql://...` or `postgres://...`). This is required for local development, CI, preview, and production.
- `SUPABASE_DATABASE_URL`, `SUPABASE_POOLER_URL`, `SUPABASE_DIRECT_URL`: Optional Supabase Postgres aliases. Runtime may use `SUPABASE_DATABASE_URL` or `SUPABASE_POOLER_URL`; Prisma migrations should prefer `SUPABASE_DIRECT_URL`.
- `ADMIN_API_KEY`: Break-glass admin API key for admin APIs. Prefer session login for day-to-day operations.
- `MODEL_CACHE_DIR`: Optional local cache path for Transformer models. Defaults to `data/model-cache` locally and `/tmp/kaxi-model-cache` on Vercel/serverless runtimes.
- `VECTOR_CACHE_FILE`: Optional embedding cache file path. Defaults to `data/vector-store/embeddings-cache.json`.
- `RESTORE_MODEL_CACHE_ON_INSTALL`: Set `true` to decompress the local Transformer model during install. Vercel builds skip this by default to keep function bundles under file-size limits.
- `AI_*_RATE_LIMIT`, `AI_*_DAILY_QUOTA`: Optional AI abuse and cost controls. Use `0` to disable a specific limit. Public Agent and Consult demos default to disabled limits until a managed shared limiter is configured.
- `RATE_LIMIT_BACKEND`: `auto`, `database`, or `memory`. Use `database` with a writable shared PostgreSQL production DB so Vercel instances share quota.
- `AI_CONSULT_BACKEND`: Optional Consult backend override: `remote-bridge`, `codex`, or `zai`. When unset, Consult follows the remote Codex bridge if the Agent backend is configured that way.
- `AI_AGENT_PREFLIGHT_ENABLED`: Enables deterministic server-side tool/RAG preflight before Codex bridge calls.
- `AI_AGENT_PREFLIGHT_TIMEOUT_MS`, `AI_AGENT_CONTEXT_MAX_CHARS`, `AI_AGENT_GROUNDED_QUESTION_MAX_CHARS`: Bound preflight latency and context sent to the LLM bridge.
- `AI_AGENT_LOGGING_ENABLED`: Enables Agent `ChatLog` persistence when Postgres is configured.
- `AI_AGENT_LEDGER_ENABLED`: Enables per-request Agent cost/quality ledger persistence when Postgres is configured.
- `NEXTAUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`: Required for session-based admin login. Generate the hash with `bun run admin:hash-password -- <password>`.
- `ADMIN_PASSWORD`: Local/demo fallback only. Do not use plaintext admin passwords in production.
- `ADMIN_ROLE`: `owner`, `admin`, or `viewer`. `viewer` can read admin dashboards but cannot mutate data.
- `ADMIN_MFA_TOTP_SECRET`: Base32 TOTP secret for admin MFA. Required in hosted/production admin login.
- `DATA_ENCRYPTION_KEY`, `PII_HASH_SECRET`: Required before production writes. Encrypts contact/free-form question payloads and hashes them for deletion lookup.
- `PII_ALLOW_UNENCRYPTED_PLAINTEXT`: Local development escape hatch only. Keep `false` in production.
- `PRIVACY_CHATLOG_RETENTION_DAYS`, `PRIVACY_PARTNER_REQUEST_RETENTION_DAYS`, `PRIVACY_LEAD_RETENTION_DAYS`: Retention windows enforced by `/api/privacy/retention`.
- `CRON_SECRET`: Required for Vercel Cron to call `/api/privacy/retention` and `/api/knowledge/monitor`.
- `KNOWLEDGE_MONITOR_PERSIST_CANDIDATES`: Optional. Defaults to creating `PENDING` knowledge candidates from official-source changes. Set `false` to make `/api/knowledge/monitor` audit-only.
- `KNOWLEDGE_MONITOR_SOURCE_IDS`, `KNOWLEDGE_MONITOR_MAX_SOURCES`: Optional controls for limiting the official immigration-law/HiKorea/MOJ watchlist during incident response or staged rollout.
- `KNOWLEDGE_MONITOR_ALERT_WEBHOOK_URL`: Optional operations webhook. When configured, changed or failed official-source monitor runs send a signed JSON alert, or Slack-formatted alert when `KNOWLEDGE_MONITOR_ALERT_FORMAT=slack`.
- `KNOWLEDGE_MONITOR_ALERT_SIGNING_SECRET`: Optional HMAC secret. Adds `x-kaxi-signature: sha256=...` so an operations receiver can verify monitor alerts.
- GitHub secret `KAXI_ADMIN_API_KEY`: Required by `.github/workflows/official-source-monitor.yml` for the 30-minute external monitor that supplements Vercel Cron limits. Use the current production `ADMIN_API_KEY` value and rotate both together.
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
The restore script only creates missing files. It does not overwrite local runtime data.
On Vercel builds it restores the vector cache but does not decompress the large ONNX model unless `RESTORE_MODEL_CACHE_ON_INSTALL=true`.

## Database Policy

Phase 0 makes Supabase/PostgreSQL the only supported database target. The checked-in `prisma/postgres/migrations/20260701090000_phase1_operational_domain/migration.sql` is the operational PostgreSQL DDL for the Phase 1 domain model.

1. Use Prisma migrations for every schema change.
2. Do not use `prisma db push` against production.
3. Keep personal/local demo user data out of deployment artifacts.
4. Treat `Lead`, `PartnerRequest`, `ChatLog.question`, `Consent`, and `AgentRequestLedger.ip/userId` as user data.
5. `Lead.contact`, `PartnerRequest.question`, and `ChatLog.question` are stored with ciphertext/hash columns when `DATA_ENCRYPTION_KEY` is set. Existing plaintext columns keep only a masked display value. In production, PII-bearing writes are not persisted unless encryption is configured; local development without a key stores `[redacted-unencrypted]` unless the local-only `PII_ALLOW_UNENCRYPTED_PLAINTEXT=true` escape hatch is set outside production.
6. Partner routing requires active consent for `THIRD_PARTY_PROVISION`, `PROCESSING_CONSIGNMENT`, and `OVERSEAS_TRANSFER`; otherwise `POST /api/partner-requests` returns `428 CONSENT_REQUIRED` before creating a `PartnerRequest`.
7. Deletion requests are accepted through `POST /api/privacy/delete-request` with `leadId`, `contact`, or an exact `question`. The request does not reveal whether a record exists and withdraws active lead consents when a matching lead is found.
8. Retention is enforced by `POST /api/privacy/retention` for admins and daily Vercel Cron `GET /api/privacy/retention`; lead consent rows are expired when the linked lead reaches deletion or retention expiry.
9. Before analytics export, use the redacted ChatLog analysis route or scripts; free-form questions are masked for emails, phone numbers, and private messenger handles.

Hosted Vercel deployments must use a reachable managed PostgreSQL database for admin CRUD, lead capture, partner requests, chat logs, Agent ledger persistence, audit logs, retention, compliance evaluations, knowledge governance, escalation cases, and shared rate-limit buckets.

`bun run db:generate` and `postinstall` always generate `@prisma/client` from `prisma/postgres/schema.prisma`.

### Environment Policy

| environment | database policy | artifact policy |
| --- | --- | --- |
| Local development | Use a local Supabase/PostgreSQL URL and run Postgres migrations/seeds. | Runtime vector/model artifacts may be restored. |
| CI | Uses a `pgvector/pgvector:pg17` PostgreSQL service and applies `prisma/postgres/migrations`. | Runtime vector/model artifacts may be restored. |
| Preview/Production | Must configure Supabase/PostgreSQL as the operational target and pass `/api/readiness` checks before write-bearing features are considered production-ready. | Database artifacts are not restored or used. |

Document uploads additionally require durable object storage in hosted environments. Set `DOCUMENT_UPLOAD_STORAGE_BACKEND=blob` and `BLOB_READ_WRITE_TOKEN` before enabling upload URLs. Without durable storage, `/api/documents/upload-intent` returns `DOCUMENT_WORKSPACE_UNAVAILABLE` instead of accepting files into an ephemeral serverless filesystem.

## Migration Workflow

Local development:

```bash
bunx prisma migrate dev --name <change-name>
bunx prisma generate
bun run db:seed:schools
bun run db:seed:synonyms
bun run db:seed:rules
bun run knowledge:pgvector
bun run db:seed:admin-demo
```

CI / production sanity check:

```bash
bun run db:migrate:deploy
bun run db:generate
```

For PostgreSQL production, provision the database first, load `DATABASE_URL=postgresql://...`, then run `bun run db:migrate:deploy` from a trusted operator machine or CI job. Supabase deployments may instead set `SUPABASE_DIRECT_URL` for migrations and `SUPABASE_POOLER_URL` or `SUPABASE_DATABASE_URL` for runtime; see `docs/SUPABASE_INTEGRATION.md`. This command uses `prisma/postgres/schema.prisma` and `prisma/postgres/migrations`. After migration, run `bun run db:seed:schools`, `bun run db:seed:synonyms`, `bun run db:seed:rules`, and `bun run knowledge:pgvector` with production DB env loaded so `School`, `Synonym`, approved compliance rule versions, approved knowledge documents, and pgvector embeddings are operational. `GET /api/readiness` will not pass merely because the env var exists; it also checks connectivity, pgvector embedding presence, and required production secrets.

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
5. School data is served from the `School` table. `src/lib/data/schools.ts` remains a local development seed/fallback only; hosted and production runtimes fail closed instead of silently serving seed data when the table is unavailable or empty. `GET /api/schools` returns `source`, `operational`, `fallback`, and `activeRows` so operators can verify whether the response came from the operational table or local seed fallback. See `docs/SCHOOL_DATA_STRATEGY.md` for the import boundary and migration policy.
6. RAG search and legacy retrieval automatically exclude documents whose source metadata is past `reviewAfter`; DB-backed RAG additionally excludes rejected and superseded documents.
7. Automated crawling must only calculate diff and impact, or create non-searchable `PENDING` candidates. It must not write approved production chunks or change approval status without an admin approval action.
8. Every answer grounded in RAG must show the source label and `lastCheckedAt` basis notice.
9. Knowledge diff output must include impacted `ComplianceRuleVersion` rows and impacted chat/user records so operators know which rules and prior users may need follow-up after a source change.
10. Each `School` row must include `sourceUrl`, `verifiedAt`, and `reviewAfter`; public school APIs hide rows past `reviewAfter`.
11. Admins can inspect expired schools with `includeExpired=true` and reverify a school through `POST /api/schools/:id/review`.
12. Immigration, visa, and stay-status answers must use a law-first hierarchy: recent promulgation/effective-date check, Immigration Act, Enforcement Decree stay-status tables, Enforcement Rule attachment/fee rules, then HiKorea/manual operational guidance. HiKorea sources are official operational RAG sources, but they are not the final legal basis when a statute or regulation controls the issue.
13. HiKorea sources cover the homepage urgent notices, integrated stay-status manual, D-2/D-4/D-10/E-7/F-2/F-5 requirement checks, extension/change/outside-activity procedures, e-application/visit reservation, forms, fees/authentication cautions, and policy-change notices. Treat these as official RAG sources, but still route case-specific filing judgment to 1345, the competent immigration office, or an administrative-scrivener review.
14. `/api/knowledge/monitor` checks the official watchlist for recent Immigration Act/Decree/Rule promulgations and effective dates, current Immigration Act/Enforcement Decree/Enforcement Rule text, HiKorea homepage/manual/procedure/form/notice sources, and Ministry of Justice immigration policy news. Vercel Cron calls it daily; GitHub Actions also calls it every 30 minutes in source batches to supplement Vercel Hobby cron limits; admins can run preview or PENDING-candidate creation from `/admin/knowledge` when an administrative scrivener spots a live change. Changed sources become `PENDING` candidates for admin review and approval before production RAG use. If `KNOWLEDGE_MONITOR_ALERT_WEBHOOK_URL` is configured, changed/failed monitor runs send an operations alert with impacted rule/user counts and a link back to `/admin/knowledge`.
15. Run `bun run knowledge:metadata` as a dry-run before and after source-monitor batches. It canonicalizes approved candidate IDs/titles, normalizes source metadata, and collapses duplicate `PENDING` candidates so each source family keeps at most one latest review candidate. Use `bun run knowledge:metadata --apply` only after backing up `KnowledgeDocument` and `KnowledgeChunk`.
16. Run `bun run knowledge:quality --write-report` after metadata cleanup to classify `PENDING` candidates into `approve_ready`, `needs_cleaning`, or `reject`. It writes `quality/knowledge-quality-report.json` and `.md` with body length, UI-noise ratio, official keyword hits, legal keyword hits, issues, and recommended action.
17. Use `bun run knowledge:quality --apply-legal-approvals` only after a database backup. The script promotes allowlisted official-law candidates when the cleaned body contains real article/table/form markers. Article-required law candidates without a body marker remain non-production and must be re-fetched or manually cleaned.
18. Use `bun run knowledge:quality --audit-approved --write-report` to inspect approved official-law chunks for drift. Use `bun run knowledge:quality --apply-approved-cleaning` after backup to rewrite approved law chunks with the cleaner and move unsafe article-level documents back to a `PENDING` quality-hold candidate ID so static approved fallbacks are no longer shadowed.
19. `bun run test:governance` verifies source metadata, required immigration-law RAG coverage, required HiKorea RAG coverage, required MOJ policy-news coverage, school seed metadata, and automatic expiry filtering. `bun run test:knowledge-quality` verifies law.go.kr UI-noise removal and the article-body approval gate.

## Admin Access

Admin APIs require a session login or break-glass `x-admin-key: $ADMIN_API_KEY` / `Authorization: Bearer $ADMIN_API_KEY`.
Do not expose admin navigation in public product surfaces. Admin UI routes such as `/admin` and `/synonyms` are real Next.js routes, but server-side API guards remain mandatory.
Prefer session login through `/login`; the browser API-key fallback is intentionally memory-only and should be used only for temporary operations.
Production/hosted admin login fails closed unless `NEXTAUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, a valid `ADMIN_ROLE`, and `ADMIN_MFA_TOTP_SECRET` are configured, and plaintext `ADMIN_PASSWORD` is empty. Admin actions and privacy operations are written to `AdminAuditLog`; inspect with `GET /api/audit-logs`.

## CI Quality Gates

GitHub Actions restores non-DB runtime artifacts during `bun install --frozen-lockfile`, prepares the PostgreSQL test DB from Prisma migrations and seed scripts, then runs typecheck, lint, `test:schema`, `test:vector`, `test:rules`, `test:quality`, `test:governance`, `test:rag-ops`, `test:knowledge-monitor`, `test:privacy`, `test:agent`, `test:planner`, `test:citations`, `test:school-data`, admin/document/readiness checks, and production build.
The workflow calls the package-level `ci:types`, `ci:domain`, and `ci:ops` profiles instead of duplicating each test command. `test:ci-gates` fails if a non-E2E `test:*` script is not reachable from `bun run ci` or if the workflow stops using the CI profiles.
`test:schema` verifies the Phase 1 domain models, Prisma engine validation for the single PostgreSQL schema, PostgreSQL operational migration DDL, and pgvector extension migration.
`test:vector` verifies the restored model/vector cache can retrieve expected KAXI source documents.
`/api/readiness` includes `embeddings.cache` as a warning-level check. It reports only safe diagnostics such as cache location class (`project-data`, `serverless-tmp`, or `custom`), cache existence, vector-cache entry count, transformer load state, and coverage; it does not expose absolute local paths.
`test:rules` verifies the DB-backed D-2/D-4 Compliance Rule Engine, including approved-only execution, effective date windows, required source refs, 20+ golden cases, and `ComplianceEvaluation` persistence.
`test:quality` validates the multilingual evaluation set in `quality/multilingual-eval-cases.json`, including expected source document, refusal expectation, and cost-format labels.
`test:rag-ops` verifies Phase 7 RAG operations: approved-only production search, rejected/superseded blocking, answer source/checked-date notices, impact lists for rules/users, and diff-only crawler behavior.
`test:knowledge-quality` verifies official-law candidate cleaning, required article-body gating, and candidate ID/title canonicalization.
`test:knowledge-monitor` verifies official-source monitoring, non-searchable pending candidates, and admin approval superseding older RAG documents.
`test:planner` verifies multilingual intent detection, slot filling, budget parsing, safety/partner signals, and exact-school refinements.
`test:citations` verifies inline answer citation markers link to the visible source cards without rewriting existing Markdown links.
`test:school-data` verifies public app/components do not import runtime school seed data directly; production-facing UI must use `/api/schools` or repository-backed APIs.
`test:privacy` verifies consent-gated partner routing, third-party/consignment/overseas consent rows, privacy audit events, deletion/retention consent status changes, PII encryption/redaction behavior, production PII persistence guards, and hosted non-Postgres write guards.
`test:privacy-env` verifies the production privacy-environment preflight rejects weak/missing `DATA_ENCRYPTION_KEY`, `PII_HASH_SECRET`, `CRON_SECRET`, enabled plaintext override, invalid retention windows, and never prints secret material.
`test:agent` verifies Agent status diagnostics, dry-run preflight behavior, and partner-request PII masking.
`test:admin-dashboard` verifies the Phase 3 admin APIs for cases, case actions, rules, knowledge documents, and audit logs.
`test:documents` verifies Phase 5 signed document upload, file hash/size/MIME validation, admin review status changes, and audit logs.
`test:readiness` verifies that production readiness fails closed when managed DB, PII secrets, MFA, retention, or shared limiter settings are missing.

## Production Readiness

`GET /api/readiness` is the operational go/no-go check for the governance items in this document.
It returns `200` only when required production checks pass and `503` when the deployment is still a demo/read-only configuration.

The readiness response intentionally exposes only booleans and reason strings, not secret values.
Before production deploys, run `bun run privacy:check-production-env` with the production env loaded. It forces production privacy semantics even when run locally and fails unless `DATA_ENCRYPTION_KEY`, `PII_HASH_SECRET`, and `CRON_SECRET` are strong non-placeholder secrets, `PII_HASH_SECRET` differs from `DATA_ENCRYPTION_KEY`, `PII_ALLOW_UNENCRYPTED_PLAINTEXT` is not enabled, and any configured retention windows are positive.
Before treating KAXI as production-ready, `/api/readiness` must report `status: "ready"` for:

- current RAG `reviewAfter` metadata and non-expired school source metadata,
- PostgreSQL operational database target and reachable managed database,
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
Planner diagnostics in that context include detected signals, resolved slots, missing slots, and confidence drivers. The same evidence is returned in agent response `meta.intentEvidence` for runtime debugging without exposing raw secrets.

Partner requests created from the conversational agent stay in dry-run draft mode. Persist actual contact requests through the explicit lead/partner intake flow so consent, retention, and PII controls remain clear.

Keep `AI_AGENT_PREFLIGHT_TIMEOUT_MS` below the total function budget. If preflight times out, the route skips grounding and continues with the original user question.
Agent `ChatLog` and `AgentRequestLedger` persistence should use a writable production database.

The ledger records IP/user id, backend, Codex mode, duration, estimated tokens, grounded/tool count, success/failure, and compact error type/message. It is for cost/debug accounting, not a permanent user profile.

## Codex CLI Agent Backend

The app routes `/api/ai/agent` to Codex CLI by default (`AGENT_BACKEND=codex`).
Set `AGENT_BACKEND=zai` only if the deployment explicitly configures `ZAI_ENABLED=true` with `ZAI_CONFIG_PATH` or another SDK-supported credential path.
If Codex credentials are missing or a Codex run fails, `/api/ai/agent` falls back to the built-in tool engine instead of returning 500.

### AI Backend Decision Table

The runtime selector in `src/lib/ai/backend-selector.ts` is the single policy source for Agent, Consult, `/api/ai/agent` status, and `/api/readiness`.
It returns safe `decisionTable` entries so operators can see which branch selected the backend without exposing secrets.

Agent backend selection:

| priority | condition | selected backend | note |
| --- | --- | --- | --- |
| 1 | `AGENT_BACKEND=zai` | `zai` | Requires explicit Z.ai configuration for LLM readiness. |
| 2 | `AGENT_BACKEND=tool-fallback` | `tool-fallback` | Built-in KAXI tools only; strict LLM mode will report unavailable. |
| 3 | `AGENT_BACKEND=remote-bridge` | `remote-bridge` | Uses the server-side Codex bridge and requires an LLM by default. |
| 4 | unset or unsupported value | `codex` | Unsupported values are ignored but surfaced in diagnostics. |

Consult backend selection:

| priority | condition | selected backend | note |
| --- | --- | --- | --- |
| 1 | `AI_CONSULT_BACKEND=remote-bridge` or `codex` | configured value | Explicit Consult override wins. |
| 2 | Agent selected `remote-bridge`, or `CODEX_REMOTE_BRIDGE_URL` is enabled | `remote-bridge` | Keeps `/consult` aligned with public Agent bridge deployments. |
| 3 | `AI_CONSULT_BACKEND=zai` | `zai` | Explicit Z.ai Consult override. |
| 4 | Agent selected `codex` and Codex is usable by API key, serverless flag, or local runtime | `codex` | Local development can use the current Codex CLI login. |
| 5 | otherwise | `zai` | Safe fallback target; readiness warns if Z.ai is not configured and fallback is not strict. |

Strict LLM requirement:

| feature | fallback-allow override | strict signals |
| --- | --- | --- |
| Agent | `AI_ALLOW_LLM_FALLBACK=true` or `AI_AGENT_ALLOW_TOOL_FALLBACK=true` | `AI_REQUIRE_LLM=true`, `AI_AGENT_REQUIRE_LLM=true`, or selected `remote-bridge` |
| Consult | `AI_ALLOW_LLM_FALLBACK=true` or `AI_CONSULT_ALLOW_OFFICIAL_SUMMARY_FALLBACK=true` | `AI_REQUIRE_LLM=true`, `AI_CONSULT_REQUIRE_LLM=true`, or selected `remote-bridge` |

Inspect `GET /api/ai/agent` `backendPolicy.agent.decisionTable` and `backendPolicy.consult.decisionTable` first when the site says it is using built-in fallback or an unexpected backend.
Authenticated operators can also inspect the same safe diagnostics in `/admin` and `GET /api/admin/ops`, which pairs the backend decision table with the readiness `ai.backend_policy` check.

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
`GET /api/ai/agent` returns safe diagnostics for backend readiness, bridge configuration, preflight, limits, persistence, and the shared `backendPolicy` decision without exposing secrets. The `remoteBridge` block intentionally exposes only a redacted endpoint (`protocol://host/path`), token-present boolean, timeout, and in-process attempt/success/failure counters.
`GET /api/readiness` also includes `ai.backend_policy`, using the same backend selector diagnostics so operators can see whether Agent/Consult are using Codex, Z.ai, remote bridge, or fallback and whether strict LLM mode has blocking configuration issues.

Check the local bridge directly:

```bash
curl -s http://127.0.0.1:8787/health | jq
```

The local health payload includes uptime, `sleepGuard.active`, rate/body/question limits, fallback mode, and recent request/failure counters. It never returns `CODEX_BRIDGE_TOKEN`.

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
CODEX_REMOTE_BRIDGE_TIMEOUT_MS=52000
# Optional. If unset, /consult follows AGENT_BACKEND=remote-bridge automatically.
AI_CONSULT_BACKEND=remote-bridge
AI_CONSULT_REMOTE_BRIDGE_TIMEOUT_MS=52000
AI_REQUIRE_LLM=true
AI_ALLOW_LLM_FALLBACK=false
```

On the Mac:

```bash
export CODEX_BRIDGE_TOKEN=<long-random-secret>
export CODEX_BRIDGE_ENABLE_TOOL_FALLBACK=false
export CODEX_EXEC_TIMEOUT_MS=52000
bun run codex:bridge
```

Then expose `http://127.0.0.1:8787` through a tunnel such as Cloudflare Tunnel, ngrok, or Tailscale Funnel.
The tunnel URL goes only into Vercel server environment variables as `CODEX_REMOTE_BRIDGE_URL`.
The public frontend continues calling `/api/ai/agent` and `/api/ai/consult`, and Vercel forwards LLM-bound requests to the Mac bridge with the secret token.
Remote-bridge production is strict by default: bridge failures return `503 LLM backend unavailable` instead of being disguised as built-in tool answers.
During incidents, compare `GET /api/ai/agent` `remoteBridge.stats` with the Mac `/health` `stats`: Vercel-side failures with no Mac-side requests usually indicate tunnel/DNS/token/CORS reachability, while Mac-side failures indicate Codex CLI timeout, auth, or local runtime issues.
Set `AI_REQUIRE_LLM=true` as an explicit safety marker.
If you intentionally want degraded service, set `AI_ALLOW_LLM_FALLBACK=true`; `/api/ai/agent` can fall back to built-in tools and `/api/ai/consult` can summarize retrieved official sources.

Minimum safety rules:

1. Keep `CODEX_BRIDGE_TOKEN` enabled for any tunnel.
2. For public stress testing, set `CODEX_BRIDGE_RATE_LIMIT=0`, `AI_AGENT_RATE_LIMIT=0`, `AI_AGENT_DAILY_QUOTA=0`, `AI_CONSULT_RATE_LIMIT=0`, and `AI_CONSULT_DAILY_QUOTA=0`.
3. Keep Codex sandbox `read-only` and `CODEX_USE_USER_CONFIG=false`.
4. Do not run the bridge from a directory containing private files that external prompts should never inspect.
5. Keep `CODEX_BRIDGE_ENABLE_TOOL_FALLBACK=false` for production so bridge timeouts are visible and can be fixed.
6. Turn off the tunnel when public testing is over.

`/api/codex/exec` remains guarded by `requireAdmin` for direct admin-only tests.
For `/api/ai/agent`, set `CODEX_AGENT_REQUIRE_ADMIN=true` if Codex should be private/internal only.

Codex CLI in serverless has important tradeoffs:

1. Codex CLI can inspect the deployed bundle and may invoke shell commands.
2. Vercel functions are ephemeral and time-limited; long agent runs may timeout.
3. The native Codex binary is large, so Vercel function packaging may fail on plan or bundle limits.
4. Set `CODEX_API_KEY` in Vercel Production only if this cost and runtime risk is accepted.
5. Keep `CODEX_EXEC_RATE_LIMIT`, `CODEX_EXEC_TIMEOUT_MS`, and `CODEX_EXEC_MAX_CHARS` conservative.

Recommended production path remains a normal API-based agent using the OpenAI API or Vercel AI Gateway, not Codex CLI inside serverless.
