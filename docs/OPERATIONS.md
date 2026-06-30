# KAXI Operations Policy

## Required Environment Variables

- `DATABASE_URL`: Prisma database URL. SQLite is acceptable for local demos only.
- `ADMIN_API_KEY`: Required for admin APIs, lead exports, chat-log analysis, and synonym management.
- `MODEL_CACHE_DIR`: Optional local cache path for Transformer models. Defaults to `data/model-cache`.
- `VECTOR_CACHE_FILE`: Optional embedding cache file path. Defaults to `data/vector-store/embeddings-cache.json`.
- `RESTORE_MODEL_CACHE_ON_INSTALL`: Set `true` to decompress the local Transformer model during install. Vercel builds skip this by default to keep function bundles under file-size limits.
- `AI_*_RATE_LIMIT`, `AI_*_DAILY_QUOTA`: Optional AI abuse and cost controls. Use `0` to disable a specific limit.
- `AI_AGENT_PREFLIGHT_ENABLED`: Enables deterministic server-side tool/RAG preflight before Codex bridge calls.
- `AI_AGENT_PREFLIGHT_TIMEOUT_MS`, `AI_AGENT_CONTEXT_MAX_CHARS`, `AI_AGENT_GROUNDED_QUESTION_MAX_CHARS`: Bound preflight latency and context sent to the LLM bridge.
- `AI_AGENT_LOGGING_ENABLED`: Enables Agent `ChatLog` persistence. It is automatically skipped on hosted SQLite deployments.
- `AI_AGENT_LEDGER_ENABLED`: Enables per-request Agent cost/quality ledger persistence. It is automatically skipped on hosted SQLite deployments.
- `NEXTAUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`: Required for session-based admin login.
- `AGENT_BACKEND`: Agent backend selector. Defaults to `codex`; set `zai` only when explicit Z.ai settings are present.
- `CODEX_AUTH_MODE`: `auto`, `local`, or `api-key`. `auto` uses the current local Codex CLI login in local dev and API-key mode on Vercel.
- `CODEX_API_KEY`: Required on Vercel when `AGENT_BACKEND=codex`.
- `CODEX_AGENT_REQUIRE_ADMIN`: Optional guard for `/api/ai/agent` Codex execution. Keep `false` for public demo, `true` for private/internal use.
- `ZAI_ENABLED`, `ZAI_API_KEY`, `ZAI_CONFIG_PATH`: Optional legacy Z.ai SDK configuration. Leave disabled for Codex CLI/bridge operation.

## Runtime Artifacts

The public repository includes compressed demo runtime artifacts under `runtime-artifacts/`.
They are restored automatically by `postinstall` through `scripts/restore-runtime-artifacts.ts`.

Included artifacts:

- `multilingual-e5-small` model cache, stored as gzip files so no single GitHub file exceeds 100 MB.
- Vector embedding cache for the bundled knowledge base.
- Sanitized SQLite MVP database with `Synonym` seed data, 50 `School` rows including source metadata, and empty user-generated tables.

The restore script only creates missing files. It does not overwrite local runtime data.
On Vercel builds it restores vector/DB artifacts but does not decompress the large ONNX model unless `RESTORE_MODEL_CACHE_ON_INSTALL=true`.

## Database Policy

The checked-in schema is still MVP-oriented. Production must use a managed relational database, preferably Postgres.

1. Use Prisma migrations for every schema change.
2. Do not use `prisma db push` against production.
3. Keep personal/local demo user data out of deployment artifacts.
4. Treat `Lead`, `PartnerRequest`, `ChatLog.question`, and `AgentRequestLedger.ip/userId` as user data.
5. Define retention before production launch:
   - `ChatLog`: 30-90 days unless explicit analytics consent exists.
   - `AgentRequestLedger`: 30-90 days for cost/debug analytics, with IP truncation or hashing before broader reporting.
   - `Lead`: delete on user/admin request, or after the business retention window.
   - `PartnerRequest`: retain only while fulfillment/accounting requires it.
6. Before analytics export, redact contact details and free-form questions that may contain personal data.

Hosted Vercel deployments must not rely on bundled SQLite for writes. The bundled DB is a demo seed/read model. Use a writable production database for admin CRUD, lead capture, partner requests, chat logs, and Agent ledger persistence.

## Migration Workflow

Local development:

```bash
bunx prisma migrate dev --name <change-name>
bunx prisma generate
bun run db:seed:schools
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
5. School data is served from the `School` table. `src/lib/data/schools.ts` remains the deterministic seed/fallback source.
6. Each `School` row must include `sourceUrl`, `verifiedAt`, and `reviewAfter`; rows past `reviewAfter` should be reverified or hidden before production use.

## Admin Access

Admin APIs require `x-admin-key: $ADMIN_API_KEY` or `Authorization: Bearer $ADMIN_API_KEY`.
Do not expose admin navigation in public product surfaces. Direct hash routes may exist for demo access, but server-side guards are mandatory.

## AI Cost Controls

The app uses in-memory IP rate limits and daily quotas. This is enough for a single-node demo, not multi-instance production.

For production, replace the in-memory limiter with Redis/Upstash or a database-backed limiter so quota is shared across instances.

## Agent Grounding

`/api/ai/agent` runs a deterministic KAXI preflight before Codex bridge calls when `AI_AGENT_PREFLIGHT_ENABLED` is not `false`.
The preflight may call school search, cost calculation, document checklist, partner request, and RAG search tools.
The resulting compact context is prepended to the Codex bridge prompt so public answers are grounded in KAXI data even when the bridge is running in fast direct-answer mode.

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
This is intended for the owner opening `https://kaxi.vercel.app/#agent` on the same Mac, not for public multi-user production.

Start the bridge:

```bash
bun run codex:bridge
```

The bridge listens on `http://127.0.0.1:8787` by default.
The deployed Agent UI automatically probes `http://127.0.0.1:8787/health` when opened from a `vercel.app` host.
If the bridge is reachable, chat requests go to the local Codex CLI and return `backend: "codex-cli-local-bridge"`.
If it is not reachable, the UI falls back to `/api/ai/agent` on Vercel.

Useful browser overrides:

```js
localStorage.setItem("kaxiCodexBridgeUrl", "http://127.0.0.1:8787/api/ai/agent")
localStorage.setItem("kaxiCodexBridgeUrl", "off")
localStorage.setItem("kaxiCodexBridgeToken", "...")
```

Useful bridge environment variables:

- `CODEX_BRIDGE_HOST`: Defaults to `127.0.0.1`. Keep localhost unless using a trusted tunnel.
- `CODEX_BRIDGE_PORT`: Defaults to `8787`.
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
```

On the Mac:

```bash
export CODEX_BRIDGE_TOKEN=<long-random-secret>
bun run codex:bridge
```

Then expose `http://127.0.0.1:8787` through a tunnel such as Cloudflare Tunnel, ngrok, or Tailscale Funnel.
The tunnel URL goes only into Vercel server environment variables as `CODEX_REMOTE_BRIDGE_URL`.
The public frontend continues calling `/api/ai/agent`, and Vercel forwards to the Mac bridge with the secret token.

Minimum safety rules:

1. Keep `CODEX_BRIDGE_TOKEN` enabled for any tunnel.
2. For public stress testing, set `CODEX_BRIDGE_RATE_LIMIT=0`, `AI_AGENT_RATE_LIMIT=0`, and `AI_AGENT_DAILY_QUOTA=0`.
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
