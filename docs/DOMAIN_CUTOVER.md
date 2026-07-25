# Domain cutover runbook — kaxi.vercel.app → karxy

Status: **not started.** The KAXI→KARXY rebrand shipped in `ce73280`; the domain
was deliberately left alone. This document records what a cutover touches, what
breaks if a step is skipped, and in what order to do it.

Everything below was verified against the repository and the live project on
2026-07-25, not assumed.

## The core constraint

`kaxi.vercel.app` is not a domain we hold separately — it is derived from the
Vercel **project name** (`kaxi`, see `.vercel/project.json`). Vercel only serves
`<project>.vercel.app`, so:

- To get `karxy.vercel.app`, the Vercel project must be **renamed**.
- A rename is a **hard cutover**: the old hostname stops serving the moment it
  takes effect. There is no overlap window.
- `karxy.vercel.app` is currently unclaimed (returns Vercel's 404) and is not
  under our account.

Creating a second Vercel project named `karxy` instead is **blocked**: the
production database credentials are Vercel Sensitive Environment Variables,
which are non-readable after creation. A new project would need those values
re-entered, and per `CLAUDE.md` no operator copy is guaranteed to exist — that
path forces a full database password rotation.

**A custom domain (e.g. `karxy.com`) does not have this problem.** It can be
added alongside `kaxi.vercel.app`, both serve simultaneously, and the switch of
the canonical hostname becomes reversible. If a custom domain is an option,
prefer it over renaming the Vercel project.

## What breaks, and who can fix it

| System | Reference | Impact if not updated | Fixable from a Claude session? |
|---|---|---|---|
| Supabase Auth | Redirect URL allowlist | Login, magic links, password reset all fail. The app itself adapts — `emailRedirectTo` is built from `siteOrigin(req)` — but Supabase rejects redirect targets that are not on its allowlist. | **No** — Supabase MCP is not authenticated; it is a dashboard change |
| n8n (Railway) | 5 callback URLs hardcoded in the published workflows | RAG orchestration, ingestion, handoff updates and error reporting all fail against the old host | **No** — n8n MCP is not authenticated; workflows must be edited and republished |
| GitHub Actions crons | 4 workflow files | Scheduled jobs hit a dead host: attachment worker (*/5), source monitor (*/30), SLA watchdog (hourly), health alert (daily) | Yes — now reads `vars.PRODUCTION_BASE_URL` with the old host as fallback |
| Vercel env | `NEXT_PUBLIC_APP_URL` | Admin deep links in alerts point at the dead host | Yes, if Vercel CLI access is available |
| App code | `siteBaseUrl()` | — | Already centralized, see below |
| Knowledge corpus | `KnowledgeDocument.sourceUrl` for the two internal docs | Citations show the old host until re-ingested | Yes — requires `knowledge:pgvector` then `rag:serving:sync` |
| Typebot | Gateway target | Chat widget cannot reach the gateway | Yes — Typebot MCP is available |
| Deploy workflow | `scripts/check-production-cutover.ts` | Post-deploy gate probes the dead host | Yes — already reads `CUTOVER_BASE_URL` |

### n8n callback URLs that must be republished

```
https://kaxi.vercel.app/api/internal/n8n/rag-runtime
https://kaxi.vercel.app/api/internal/n8n/rag-ingestion
https://kaxi.vercel.app/api/internal/n8n/handoff-update
https://kaxi.vercel.app/api/internal/n8n/error-report
https://kaxi.vercel.app/api/internal/n8n/verify
```

These live in the workflows deployed on Railway. `infra/n8n/*.json` mirrors them
and `scripts/test-n8n-rag-orchestration.ts` pins them, so the repo copies and the
test pins must move in the same change — otherwise CI and production disagree.

## What is already prepared

The base URL now resolves through one function, `siteBaseUrl()` in
`src/lib/config/site-url.ts`:

```
NEXT_PUBLIC_APP_URL || APP_URL  →  https://$VERCEL_URL  →  https://kaxi.vercel.app
```

`NEXT_PUBLIC_APP_URL` is **not** currently set in Vercel production, so the
hardcoded default is the live value today. Setting that variable is what moves
the application's own links; no code change is needed for them.

## Order of operations

Do not start until the Supabase and n8n legs have an owner — those are the two
that cannot be done from a Claude session and are also the two that take the
product down.

1. Decide the target host. Prefer a custom domain; only rename the Vercel
   project if a `*.vercel.app` host is genuinely required.
2. Add the new host to Vercel and confirm it serves. With a custom domain both
   hosts serve at once; with a rename there is no overlap, so schedule a window.
3. Add the new origin to the Supabase Auth redirect allowlist **before** the
   switch. Keep the old origin listed until the cutover is confirmed.
4. Set `NEXT_PUBLIC_APP_URL` to the new origin in Vercel production, and set the
   `PRODUCTION_BASE_URL` GitHub repository variable to the same value.
5. Update and republish the n8n workflows, update `infra/n8n/*` and the URL pins
   in `scripts/test-n8n-rag-orchestration.ts` in one commit, and let CI verify.
6. Point the Typebot gateway at the new origin.
7. Re-ingest so stored document URLs follow: `bun run knowledge:pgvector`, then
   `bun run scripts/sync-rag-serving-projection.ts --execute --confirm-contract 2026-07-14.v4`.
   Skipping the second command leaves the serving projection stale — that failure
   mode is real and was hit during the rebrand corpus update.
8. Verify, then decide whether to keep the old host redirecting.

## Verification after cutover

```bash
curl -fsS https://<new-host>/api/health
curl -fsS https://<new-host>/api/readiness
curl -sS -o /dev/null -w '%{http_code}\n' https://<new-host>/api/documents   # expect 401
```

Beyond the standard probes, confirm specifically:

- a magic-link login completes end to end (this is the Supabase allowlist check);
- an agent answer returns citations, which exercises the n8n or direct RAG path;
- `/sitemap.xml` emits the new host;
- one scheduled workflow run succeeds against the new host;
- `rag_serving_chunks` has no `ready` rows still carrying the old host in their
  metadata.
