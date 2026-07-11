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
- `AI_PROVIDER`: Managed application LLM selector. Use `kimi` for Kimi's OpenAI-compatible API or `claude` for the optional Anthropic fallback.
- `OPENAI_API_KEY`: Server-only Kimi key when `AI_PROVIDER=kimi`. `KIMI_API_KEY` and `MOONSHOT_API_KEY` are accepted aliases.
- `OPENAI_BASE_URL`: Kimi OpenAI-compatible base URL. Defaults to `https://api.moonshot.ai/v1`.
- `OPENAI_MODEL`: Kimi model override. Defaults to `kimi-k2.6`.
- Kimi Code membership keys are a separate credential realm. They require `OPENAI_BASE_URL=https://api.kimi.com/coding/v1` and `OPENAI_MODEL=kimi-for-coding`. Kimi documents this endpoint for interactive coding agents and recommends Kimi Platform for product integrations; record any production exception and migrate to a Platform key before broad public usage.
- `KIMI_THINKING`: Optional `enabled` or `disabled` override for compatible Kimi models. Omit it to retain the provider default.
- `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`: Optional Claude fallback credentials used only when `AI_PROVIDER=claude` or automatic selection resolves to Claude.
- `AI_REQUIRE_LLM`, `AI_ALLOW_LLM_FALLBACK`: Global LLM strictness policy. Keep fallback allowed in CI and local development without an API key.
- `AI_AGENT_PREFLIGHT_ENABLED`: Enables deterministic server-side tool/RAG preflight before managed LLM calls.
- `AI_AGENT_PREFLIGHT_TIMEOUT_MS`, `AI_AGENT_CONTEXT_MAX_CHARS`, `AI_AGENT_GROUNDED_QUESTION_MAX_CHARS`: Bound preflight latency and context sent to the managed LLM.
- `AI_AGENT_LOGGING_ENABLED`: Enables Agent `ChatLog` persistence when Postgres is configured.
- `AI_AGENT_LEDGER_ENABLED`: Enables per-request Agent cost/quality ledger persistence when Postgres is configured.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Required for student, partner, and administrator browser authentication.
- `SUPABASE_SERVICE_ROLE_KEY`: Server-only key used for operator bootstrap and storage administration. Never expose it to browser code.
- `SUPABASE_ADMIN_EMAIL`: Operator-only input for `bun run admin:bootstrap-supabase -- --email=...`; it is not consulted by runtime authorization.
- `DATA_ENCRYPTION_KEY`, `PII_HASH_SECRET`: Required before production writes. Encrypts contact/free-form question payloads and hashes them for deletion lookup.
- `PII_ALLOW_UNENCRYPTED_PLAINTEXT`: Local development escape hatch only. Keep `false` in production.
- `PRIVACY_CHATLOG_RETENTION_DAYS`, `PRIVACY_PARTNER_REQUEST_RETENTION_DAYS`, `PRIVACY_LEAD_RETENTION_DAYS`: Retention windows enforced by `/api/privacy/retention`.
- `CRON_SECRET`: Required for Vercel Cron to call `/api/privacy/retention` and `/api/knowledge/monitor`.
- `KNOWLEDGE_MONITOR_PERSIST_CANDIDATES`: Optional. Defaults to creating `PENDING` knowledge candidates from official-source changes. Set `false` to make `/api/knowledge/monitor` audit-only.
- `KNOWLEDGE_MONITOR_SOURCE_IDS`, `KNOWLEDGE_MONITOR_MAX_SOURCES`: Optional controls for limiting the official immigration-law/HiKorea/MOJ watchlist during incident response or staged rollout.
- `KNOWLEDGE_MONITOR_ALERT_WEBHOOK_URL`: Optional operations webhook. When configured, changed or failed official-source monitor runs send a signed JSON alert, or Slack-formatted alert when `KNOWLEDGE_MONITOR_ALERT_FORMAT=slack`.
- `KNOWLEDGE_MONITOR_ALERT_SIGNING_SECRET`: Optional HMAC secret. Adds `x-kaxi-signature: sha256=...` so an operations receiver can verify monitor alerts.
- GitHub secret `KAXI_ADMIN_API_KEY`: Required by `.github/workflows/official-source-monitor.yml` for the 30-minute external monitor that supplements Vercel Cron limits. Use the current production `ADMIN_API_KEY` value and rotate both together.
- `DOCUMENT_UPLOAD_SIGNING_SECRET`: HMAC secret for short-lived document upload URLs. Required before enabling document uploads outside local development.
- `DOCUMENT_UPLOAD_MAX_BYTES`: Optional max upload size. Defaults to 10 MB.
- `DOCUMENT_UPLOAD_DIR`: Local byte-storage path for development. Production should use managed object storage.
- `DOCUMENT_UPLOAD_STORAGE_BACKEND`: Set to `blob` for hosted document uploads.
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob read/write token. Required when hosted document uploads store original document bytes.
- `DOCUMENT_UPLOAD_STORE_BYTES`: Set `false` only when the direct upload endpoint should persist metadata without local bytes, usually during storage-provider migration tests.
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: Server-side chat, RAG serving projection, handoff, health, and private attachment persistence. Never expose the service role key to Typebot or browser code.
- `SUPABASE_CHAT_ATTACHMENTS_BUCKET`: Private chat attachment bucket. Falls back to `SUPABASE_STORAGE_BUCKET` and then `kaxi-documents`.
- `CHAT_SESSION_SIGNING_SECRET`: Signs the HttpOnly KAXI chat-session cookie used to prove attachment and conversation ownership.
- The selected managed LLM key is required by the image attachment worker for JPEG, PNG, and WebP OCR. PDFs with extractable text use the local PDF parser.
- `ATTACHMENT_MALWARE_SCAN_MODE`: `structural` performs local image re-encoding and active-PDF rejection; `http` additionally requires an external scanner verdict before storage. Structural mode is defense in depth, not a managed malware-scanning service.
- `ATTACHMENT_MALWARE_SCAN_URL`, `ATTACHMENT_MALWARE_SCAN_TOKEN`, `ATTACHMENT_MALWARE_SCAN_TIMEOUT_MS`: HTTPS scanner endpoint, bearer token, and timeout used when scan mode is `http`. The endpoint receives the file bytes and must return JSON containing `{ "clean": true }` to accept the upload.
- `ATTACHMENT_MALWARE_SCAN_REQUIRED`: Set `true` in production when uploads must fail closed unless the external scanner is configured and healthy. `/api/readiness` reports the effective scanner posture.
- `CHAT_ATTACHMENTS_ENABLED`: Production defaults to disabled. Set `true` only after the managed scanner URL and token are configured; the chat-session capability response then enables the attachment control. Local development remains enabled unless explicitly set to `false`.
- GitHub secret `KAXI_ADMIN_API_KEY`: Also required by `.github/workflows/chat-attachment-worker.yml`, which retries queued attachment extraction jobs every five minutes through the internal worker API.
- `N8N_TYPEBOT_RAG_WEBHOOK_URL`, `N8N_RAG_INGESTION_WEBHOOK_URL`, `N8N_TYPEBOT_HANDOFF_WEBHOOK_URL`: Production n8n webhook URLs called only by KAXI server routes.
- `N8N_RAG_CAPABILITY_URL`: Read-only active-contract probe used before bulk serving-projection sync.
- `N8N_WEBHOOK_SIGNING_SECRET`, `N8N_WEBHOOK_MAX_AGE_SECONDS`: Shared HMAC/replay-window contract between KAXI and the n8n verification nodes. The secret must match in every KAXI environment that calls n8n.
- `TYPEBOT_PUBLIC_ID`, `TYPEBOT_PUBLIC_URL`: Published Typebot identity and public health target. Keep Typebot unpublished during backend cutover.
- `TYPEBOT_GATEWAY_SECRET`: Separate 32-byte secret sent by both server-side Typebot webhook blocks as `x-kaxi-typebot-token`. It prevents callers from forging `source=typebot`; do not reuse the n8n signing secret.
- `KNOWLEDGE_MONITOR_CRON_SOURCE_IDS`, `KNOWLEDGE_MONITOR_FETCH_TIMEOUT_MS`, `KNOWLEDGE_MONITOR_CONCURRENCY`: Bound the Vercel daily critical-source monitor. The GitHub matrix remains responsible for the complete watchlist.

Daily RAG health records `degraded` for required dependency failures and `warning` for operational issues such as stale attachment jobs or unacknowledged events. The check starts the published Typebot through its `startChat` runtime API and sends a signed grounded-answer probe through the active n8n RAG webhook; health-only n8n audit rows are removed after the probe. Both failure levels are sent through `OPS_ALERT_WEBHOOK_URL` when configured, while an already-open event does not create another summary event. A healthy run does not emit an alert.
- `OPS_ALERT_WEBHOOK_URL`, `OPS_ALERT_FORMAT`, `OPS_ALERT_SIGNING_SECRET`: Optional HTTPS destination for degraded daily-health notifications. JSON and Slack incoming-webhook payloads are supported.

Attachment processing starts only after a sanitized object is stored. Transient OCR or provider failures move jobs to `retrying`; terminal validation failures reject the attachment and delete its storage object. Operators should investigate stale jobs through `/admin/ops`, and users can retry the existing attachment job from the chat widget without uploading the file again.

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
8. Retention is enforced by `POST /api/privacy/retention` for admins and daily Vercel Cron `GET /api/privacy/retention`; lead consent rows are expired when the linked lead reaches deletion or retention expiry. Canonical chat sessions use a rolling 90-day default and privacy deletion removes associated storage objects, messages, retrieval evidence, n8n audit rows, and handoff rows before deleting the session. Typebot result deletion remains a separate provider-side operation.
9. Before analytics export, use the redacted ChatLog analysis route or scripts; free-form questions are masked for emails, phone numbers, and private messenger handles.

Hosted Vercel deployments must use a reachable managed PostgreSQL database for admin CRUD, lead capture, partner requests, chat logs, Agent ledger persistence, audit logs, retention, compliance evaluations, knowledge governance, escalation cases, and shared rate-limit buckets.

`bun run db:generate` and `postinstall` always generate `@prisma/client` from `prisma/postgres/schema.prisma`.

### Environment Policy

| environment | database policy | artifact policy |
| --- | --- | --- |
| Local development | Use a local Supabase/PostgreSQL URL and run Postgres migrations/seeds. | Runtime vector/model artifacts may be restored. |
| CI | Uses a `pgvector/pgvector:pg17` PostgreSQL service and applies `prisma/postgres/migrations`. | Runtime vector/model artifacts may be restored. |
| Preview/Production | Must configure Supabase/PostgreSQL as the operational target and pass `/api/readiness` checks before write-bearing features are considered production-ready. | Database artifacts are not restored or used. |

Document uploads additionally require durable storage in hosted environments. Use Vercel Blob, Supabase Storage, or the shared PostgreSQL `database` backend; never use the local filesystem backend on Vercel. Without durable storage, `/api/documents/upload-intent` returns `DOCUMENT_WORKSPACE_UNAVAILABLE` instead of accepting files into an ephemeral serverless filesystem.

## Migration Workflow

Local development:

```bash
bunx prisma migrate dev --name <change-name>
bunx prisma generate
bun run db:seed:schools
bun run db:seed:synonyms
bun run db:seed:rules
bun run db:seed:visa-docs
bun run knowledge:pgvector
bun run db:seed:admin-demo
```

CI / production sanity check:

```bash
bun run db:migrate:deploy
bun run db:generate
```

For PostgreSQL production, provision the database first, load `DATABASE_URL=postgresql://...`, then run `bun run db:migrate:deploy` from a trusted operator machine or CI job. Supabase deployments may instead set `SUPABASE_DIRECT_URL` for migrations and `SUPABASE_POOLER_URL` or `SUPABASE_DATABASE_URL` for runtime; see `docs/SUPABASE_INTEGRATION.md`. This command uses `prisma/postgres/schema.prisma` and `prisma/postgres/migrations`. After migration, run `bun run db:seed:schools`, `bun run db:seed:synonyms`, `bun run db:seed:rules`, `bun run db:seed:visa-docs`, and `bun run knowledge:pgvector` with production DB env loaded so `School`, `Synonym`, approved compliance rule versions, visa document matrix rows, approved knowledge documents, and pgvector embeddings are operational. Use `bun run knowledge:harvest:official -- --persist --min-chunks 500` to create PENDING official-source candidates for the 500+ chunk expansion, then optionally run `bun run knowledge:embed:candidates -- --min-candidate-chunks 500` to pre-embed those candidates without making them production-searchable. Run `bun run knowledge:check:candidates` to project whether approving the current pending candidates will produce a 500+ approved embedded corpus. Export/review them with `bun run legal-review:export` or candidate-only files from `bun run legal-review:candidates`. After review, prefer `bun run knowledge:promote:candidates -- --file <approved-candidates.jsonl> --min-approved-candidate-chunks 500 --min-approved-chunks 500 --min-approved-embedded-chunks 500`; it validates, applies, finalizes, and audits the production-approved corpus. `GET /api/readiness` will not pass merely because the env var exists; it also checks connectivity, pgvector embedding presence, and required production secrets.

Use `bun run ops:audit:phase0-phase1` before review approval to confirm the pre-approval state: 50 matrix rows, 500+ pending official-source chunks, candidate embeddings, legal-review packets, legal-review validation tooling, approved-only search exclusion, and document verification scripts/APIs. After an administrative scrivener/admin approves the harvested candidates, `knowledge:promote:candidates` ends by running `bun run ops:audit:phase0-phase1 -- --require-production-approved` to require 500+ approved embedded chunks and 500+ approved official-source embedded chunks. Official-source counts require both an `official_` source type and an approved HTTPS government host such as `*.go.kr` or `*.korea.kr`; a spoofed `sourceType` on a non-official URL is not counted. The total and official-source floors remain equal by default. For an explicitly reviewed mixed corpus, operators may set separate `--min-approved-official-chunks` and `--min-approved-official-embedded-chunks` floors on `knowledge:check:corpus`, `knowledge:finalize:corpus`, `knowledge:promote:candidates`, and `ops:audit:phase0-phase1`; this does not change source classification or citation checks. If approval happens through `/admin/knowledge`, the API still requires a real legal reviewer identity, checked date, complete pending-candidate coverage, actual pgvector embeddings, and 500+ official candidate chunks for bulk approval.

If a production `DATABASE_URL`, Prisma Accelerate URL, or Blob token is exposed in chat, logs, or a committed file, rotate it before using it in Vercel.

After loading production DB env locally, verify the managed DB before deploying or promoting:

```bash
bun run db:check-production
```

The production check rejects loopback and local-only PostgreSQL hosts. A successful local connection is not evidence that Vercel has a shared operational database.

### Governed RAG Serving Cutover

The canonical source is approved, current `KnowledgeDocument`/`KnowledgeChunk` data. `rag_serving_chunks` is the OpenAI 1536-dimensional serving projection. `knowledge_chunks` is legacy compatibility data and must remain available until the governed projection is complete.

After KAXI production is deployed and the validated n8n draft is published:

```bash
bun run rag:serving:sync
bun run rag:serving:sync --execute --confirm-contract 2026-07-10.v1 --batch-size 10
```

The first command is a read-only status check. The execute command first calls the active n8n capability endpoint and refuses to ingest when the workflow contract, target table, model, dimensions, or signed-ingestion flag differs. It stops on a failed batch or when ready count makes no progress, and can be rerun to continue.

Only after `readyChunks == eligibleChunks`, `citationReadyChunks == eligibleChunks`, and the evaluation pass rate is at least 85%:

```bash
bun run rag:evaluation:run
bun run rag:serving:cutover
bun run rag:serving:cutover --execute --confirm CUTOVER_LEGACY_RAG --expected-ready 199
```

The database function rechecks the counts inside the cutover transaction, copies legacy rows to `legacy_rag_chunks_quarantine`, and then removes `knowledge_chunks`. Never call the cutover RPC directly during a partial sync.

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

Admin APIs require a linked `PLATFORM_ADMIN` Supabase session, or the server-to-server break-glass `x-admin-key: $ADMIN_API_KEY` / `Authorization: Bearer $ADMIN_API_KEY`.
Do not expose admin navigation in public product surfaces. Admin UI routes such as `/admin` and `/synonyms` are real Next.js routes, but server-side API guards remain mandatory.
The browser never accepts an admin API key. Create and confirm the Supabase account, then run `bun run admin:bootstrap-supabase -- --email=admin@example.com` to bind its UUID to `User.role=PLATFORM_ADMIN`. For a new operator, add `--invite` to send a Supabase setup email and atomically link the invited UUID. Admin actions and privacy operations are written to `AdminAuditLog`; inspect with `GET /api/audit-logs`.

## CI Quality Gates

GitHub Actions restores non-DB runtime artifacts during `bun install --frozen-lockfile`, prepares the PostgreSQL test DB from Prisma migrations and seed scripts, then runs typecheck, lint, `test:schema`, `test:vector`, `test:rules`, `test:quality`, `test:governance`, `test:rag-ops`, `test:knowledge-monitor`, `test:privacy`, `test:agent`, `test:planner`, `test:citations`, `test:school-data`, admin/document/readiness checks, and production build.
The workflow calls the package-level `ci:types`, `ci:domain`, and `ci:ops` profiles instead of duplicating each test command. `test:ci-gates` fails if a non-E2E `test:*` script is not reachable from `bun run ci` or if the workflow stops using the CI profiles.
Production deployment is triggered by the successful `CI` workflow run for the exact `main` commit. Manual production deployment invokes the same reusable CI workflow first. The deploy job rejects a dirty checkout or SHA/migration mismatch, deploys the production build with `--skip-domain`, runs the backend cutover gate against that unique URL, and only then assigns production domains with `vercel promote`.
`test:schema` verifies the Phase 1 domain models, Prisma engine validation for the single PostgreSQL schema, PostgreSQL operational migration DDL, and pgvector extension migration.
`test:vector` verifies the restored model/vector cache can retrieve expected KAXI source documents.
`/api/readiness` includes `embeddings.cache` as a warning-level check. It reports only safe diagnostics such as cache location class (`project-data`, `serverless-tmp`, or `custom`), cache existence, vector-cache entry count, transformer load state, and coverage; it does not expose absolute local paths.
`test:rules` verifies the DB-backed D-2/D-4 Compliance Rule Engine, including approved-only execution, effective date windows, required source refs, 20+ golden cases, and `ComplianceEvaluation` persistence.
`test:quality` validates the multilingual evaluation set in `quality/multilingual-eval-cases.json`, including expected source document, refusal expectation, and cost-format labels.
`test:rag-ops` verifies Phase 7 RAG operations: approved-only production search, rejected/superseded blocking, answer source/checked-date notices, impact lists for rules/users, and diff-only crawler behavior.
`test:knowledge-quality` verifies official-law candidate cleaning, required article-body gating, and candidate ID/title canonicalization.
`test:knowledge-monitor` verifies official-source monitoring, non-searchable pending candidates, and admin approval superseding older RAG documents.
`test:official-source-harvest` verifies the official-source collection path can create 500+ PENDING candidate chunks without auto-approving them.
`test:legal-review-candidates` verifies harvested candidates appear in the legal-review packet, approval supersedes the old document, chunk boundaries are preserved, and 500+ approved embedded chunks pass corpus readiness.
`test:harvested-candidate-decisions` verifies candidate-only legal-review decision files can be generated blank or prefilled after reviewer identity is supplied.
`test:legal-review-validation` verifies legal-review decision JSONL preflight checks for reviewer identity, checked date, duplicates, pending-candidate coverage, and approved-candidate chunk thresholds.
`test:pending-candidate-embeddings` verifies PENDING candidate chunks can be pre-embedded while remaining excluded from production pgvector search.
`test:candidate-approval-readiness` verifies the approval projection gate: pending candidate chunk coverage, pre-embedding coverage, superseded approved-document accounting, and projected approved embedded chunk thresholds.
`test:knowledge-promotion` verifies the one-shot reviewed-candidate promotion command: strict validation, approval apply, corpus finalization, and production-approved audit.
`test:planner` verifies multilingual intent detection, slot filling, budget parsing, safety/partner signals, and exact-school refinements.
`test:citations` verifies inline answer citation markers link to the visible source cards without rewriting existing Markdown links.
`test:school-data` verifies public app/components do not import runtime school seed data directly; production-facing UI must use `/api/schools` or repository-backed APIs.
`test:privacy` verifies consent-gated partner routing, third-party/consignment/overseas consent rows, privacy audit events, canonical chat deletion/retention cascade, metadata-only n8n audit enforcement, PII encryption/redaction behavior, production PII persistence guards, and hosted non-Postgres write guards.
`test:privacy-env` verifies the production privacy-environment preflight rejects weak/missing `DATA_ENCRYPTION_KEY`, `PII_HASH_SECRET`, `CRON_SECRET`, enabled plaintext override, invalid retention windows, and never prints secret material.
`test:agent` verifies Agent status diagnostics, dry-run preflight behavior, and partner-request PII masking.
`test:admin-dashboard` verifies the Phase 3 admin APIs for cases, case actions, rules, knowledge documents, and audit logs.
`test:documents` verifies Phase 5 signed document upload, file hash/size/MIME validation, local storage path-traversal rejection, admin review status changes, and audit logs.
`test:document-verification` verifies Layer 1 matrix validation, approved-over-pending requirement priority, stale-date checks, and Layer 3 cross-document mismatch detection.
`test:document-verification-api` verifies the admin document verification route, admin guard, Layer 1, Layer 2 RAG retrieval from safe OCR context, sensitive query-value exclusion, LLM-unavailable separation, weak-source guardrail, persistence, and audit logging.
`test:document-verification-batch` verifies profile-level matrix coverage, missing required-document detection, optional placeholder creation, set summaries, and audit logging.
`test:document-verification-metrics` verifies the reviewer feedback metrics API for coverage, accuracy, false-positive/false-negative rates, issue-code ranking, and audit logging.
`test:n8n-signature` verifies HMAC validity, tamper detection, expiry, malformed envelopes, and replay protection.
`test:rag-serving` verifies canonical eligibility, category fallback, no-context behavior, citation requirements, legacy quarantine, and the transactional cutover gate.
`test:chat-security` verifies signed session ownership, expiry/tamper protection, and attachment magic-byte allowlists.
`test:lead-privacy` verifies diagnosis/handoff separation and encrypted lead-contact persistence contracts.
`test:readiness` verifies that production readiness fails closed when managed DB, canonical migration/object parity, PII secrets, a linked administrator, retention, or shared limiter settings are missing.
`test:cutover` verifies the source migration gate, backend readiness contract, fail-closed attachment posture, and published Typebot consent-flow contract.

`test:chat-history` runs against an isolated fake PostgREST boundary and verifies signed-session ownership, server-side decryption, canonical message ordering, HTTPS-only citations, failed-request retry identity, and refresh recovery for pending/failed attachments without touching a live Supabase project.

## Production Readiness

`GET /api/readiness` is the operational go/no-go check for the governance items in this document.
It returns `200` only when required production checks pass and `503` when the deployment is still a demo/read-only configuration.

The readiness response intentionally exposes only booleans and reason strings, not secret values.
Before production deploys, run `bun run privacy:check-production-env` with the production env loaded. It forces production privacy semantics even when run locally and fails unless `DATA_ENCRYPTION_KEY`, `PII_HASH_SECRET`, and `CRON_SECRET` are strong non-placeholder secrets, `PII_HASH_SECRET` differs from `DATA_ENCRYPTION_KEY`, `PII_ALLOW_UNENCRYPTED_PLAINTEXT` is not enabled, and any configured retention windows are positive.
The release sequence is intentionally ordered:

```bash
bun run release:check:source -- --expected-sha <commit-sha>
# GitHub deploys and verifies the unique Vercel production canary, then promotes it.
# Publish the reviewed Typebot draft only after the backend canary passes.
bun run release:check:typebot
```

Do not publish Typebot before the KAXI deployment contains the matching gateway secret and `handoff_consent_evidence` migration. The Typebot gate sends a real high-risk conversation and requires the published flow to return a grounded response, show `block_privacy_notice`, and stop at `block_privacy_consent` before any contact field.
Before treating KAXI as production-ready, `/api/readiness` must report `status: "ready"` for:

- current RAG `reviewAfter` metadata and non-expired school source metadata,
- PostgreSQL operational database target and reachable managed database,
- `DATA_ENCRYPTION_KEY`, `PII_HASH_SECRET`, retention `CRON_SECRET`,
- shared database-backed rate limit,
- Supabase admin login, valid linked role, and audit-log persistence.

## AI Cost Controls

The app supports shared IP rate limits and daily quotas through `RateLimitBucket`.

Use `RATE_LIMIT_BACKEND=database` with a reachable managed production DB for Vercel multi-instance deployments. `auto` uses the shared database when it is configured and falls back to memory only outside hosted/production runtimes. In production, finite limits fail closed with HTTP 503 if the shared limiter backend is unavailable; set a specific limit to `0` only for intentionally disabled endpoints.

## Agent Grounding

`/api/ai/agent` runs a deterministic KAXI preflight before managed LLM calls when `AI_AGENT_PREFLIGHT_ENABLED` is not `false`.
The preflight uses the same intent planner as the built-in fallback agent, with Korean, English, Vietnamese, and Mongolian cues for school search, cost calculation, document checklist, path diagnosis, partner request drafts, and RAG search tools.
Planner diagnostics include detected signals, resolved slots, missing slots, and confidence drivers. The same evidence is returned in agent response `meta.intentEvidence` for runtime debugging without exposing raw secrets.

Partner requests created from the conversational agent stay in dry-run draft mode. Persist actual contact requests through the explicit lead/partner intake flow so consent, retention, and PII controls remain clear.

Keep `AI_AGENT_PREFLIGHT_TIMEOUT_MS` below the total function budget. If preflight times out, the route skips grounding and continues with the original user question.
Agent `ChatLog` and `AgentRequestLedger` persistence should use a writable production database.

The ledger records IP/user id, backend, duration, estimated tokens, grounded/tool count, success/failure, and compact error type/message. It is for cost/debug accounting, not a permanent user profile.

## Managed LLM Backend

Agent, Consult, general chat, OCR, and structured admin suggestions use `src/lib/ai/llm-gateway.ts`.
The default Kimi adapter calls the OpenAI-compatible Chat Completions endpoint, defaults to `kimi-k2.6`, converts image blocks to OpenAI format, and uses `response_format.type=json_schema` for structured outputs. PDF OCR uploads the file with `purpose=file-extract`, retrieves extracted content, and deletes the temporary provider file.
`OPENAI_MODEL` and `OPENAI_BASE_URL` can override the model and endpoint without code changes.

Every ordinary text call passes through the gateway, which redacts emails, phone numbers, and private messenger handles before sending text to the selected provider. OCR media remains available to the provider because field extraction requires the visible document content.
Agent preflight, rate limits, daily quotas, `AgentRequestLedger`, and citation normalization remain enforced around the gateway.

### AI Backend Decision Table

The runtime selector in `src/lib/ai/backend-selector.ts` is the single policy source for Agent, Consult, `/api/ai/agent` status, and `/api/readiness`.
`AI_PROVIDER=kimi` selects Kimi. `AI_PROVIDER=claude` selects Anthropic. In automatic mode, an explicit Kimi/Moonshot key or Moonshot/Kimi base URL selects Kimi; otherwise the legacy Claude path remains available.

| condition | behavior |
| --- | --- |
| `AI_PROVIDER=kimi` and a Kimi key is configured | Kimi OpenAI-compatible API serves Agent/Consult/OCR. |
| `AI_PROVIDER=claude` and `ANTHROPIC_API_KEY` is configured | Claude serves Agent/Consult/OCR as an optional fallback provider. |
| key missing and `AI_REQUIRE_LLM=false` | Agent uses built-in tools; Consult summarizes retrieved approved official sources. |
| key missing and `AI_REQUIRE_LLM=true` with no fallback override | endpoints return `503 LLM backend unavailable`; readiness reports an AI backend issue. |
| legacy Codex/bridge/Z.ai env vars present | ignored and surfaced as warnings only. |

Inspect `GET /api/ai/agent` `backendPolicy.agent.decisionTable` and `backendPolicy.consult.decisionTable` first when the site says it is using fallback.
Authenticated operators can inspect the same safe diagnostics in `/admin/ops` and `GET /api/admin/ops`, which pair the backend decision table with readiness, the latest integration health run, and open `ops_events`. Owners and admins can run a fresh check with `POST /api/admin/ops` and acknowledge an event with `PATCH /api/admin/ops` using `{ "eventId": "<uuid>" }`; each action is written to `AdminAuditLog`.
