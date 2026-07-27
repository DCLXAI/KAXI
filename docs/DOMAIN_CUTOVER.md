# Domain cutover runbook — kaxi.vercel.app → karxy.com

Status: **in progress — waiting on DNS.** `karxy.com` was registered at Gabia
(expires 2027-07-27) and both `karxy.com` and `www.karxy.com` are attached to
the Vercel project. The DNS records are not set yet, so the domain does not
resolve. `kaxi.vercel.app` is unaffected and still serving.

Everything below was verified against the repository and the live project on
2026-07-25, not assumed.

## Why the custom domain is the right path

`kaxi.vercel.app` is not a domain we hold separately — it is derived from the
Vercel **project name** (`kaxi`, see `.vercel/project.json`). Renaming the
project to get `karxy.vercel.app` would be a **hard cutover**: the old hostname
stops serving the moment it takes effect, with no overlap window. Creating a
second Vercel project is also blocked, because the production database
credentials are Vercel Sensitive Environment Variables that cannot be read back
after creation — that path forces a full database password rotation.

A custom domain avoids all of it. `karxy.com` serves **alongside**
`kaxi.vercel.app`, so the switch of the canonical hostname is gradual and
reversible, and no step below requires an outage window.

## Immediate next step: DNS at Gabia

Vercel asked for a plain A record (its `[recommended]` option; changing the
nameservers to Vercel is the alternative and is not needed):

| Host | Type | Value |
|---|---|---|
| `@` | A | `76.76.21.21` |
| `www` | A | `76.76.21.21` |

`www` may instead be a `CNAME` to `cname.vercel-dns.com`, which is the more
conventional choice for a subdomain; either works.

Leave the Gabia nameservers as they are. Vercel re-verifies on its own and
issues the TLS certificate once the record resolves; a freshly registered domain
can take several hours to appear in public DNS.

Check progress with:

```bash
dig @8.8.8.8 +short karxy.com A
curl -fsS https://karxy.com/api/health
```

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

Because both hosts serve at once, these can be done one at a time and verified
individually. Nothing here needs a maintenance window. Steps 3 and 5 are the two
that cannot be done from a Claude session — Supabase and n8n MCP are not
authenticated — so they need an owner before step 4 flips the canonical host.

1. ~~Register the domain and attach it to Vercel.~~ Done: `karxy.com` and
   `www.karxy.com` are on the project.
2. **Set the Gabia DNS records above** and wait for `karxy.com` to serve. Until
   this lands, everything below is blocked.
3. Add `https://karxy.com` to the Supabase Auth redirect allowlist. **Keep the
   old origin listed** — the app builds `emailRedirectTo` from the request
   origin, so whichever host a user arrives on must be allowed.
4. Set `NEXT_PUBLIC_APP_URL=https://karxy.com` in Vercel production, and the
   `PRODUCTION_BASE_URL` GitHub repository variable to the same value. This is
   what moves the application's own links; no code change is needed.
5. Update and republish the n8n workflows, update `infra/n8n/*` and the URL pins
   in `scripts/test-n8n-rag-orchestration.ts` in one commit, and let CI verify.
   Until this is done the n8n callbacks keep using `kaxi.vercel.app`, which is
   fine while that host still serves.
6. Point the Typebot gateway at the new origin.
7. Re-ingest so stored document URLs follow: `bun run knowledge:pgvector`, then
   `bun run scripts/sync-rag-serving-projection.ts --execute --confirm-contract 2026-07-14.v4`.
   Skipping the second command leaves the serving projection stale — that failure
   mode is real and was hit during the rebrand corpus update.
8. Verify, then decide whether `kaxi.vercel.app` should redirect to `karxy.com`.
   Keep it resolving for as long as anything external still points at it.

## Verification after cutover

```bash
curl -fsS https://karxy.com/api/health
curl -fsS https://karxy.com/api/readiness
curl -sS -o /dev/null -w '%{http_code}\n' https://karxy.com/api/documents   # expect 401
```

Beyond the standard probes, confirm specifically:

- a magic-link login completes end to end (this is the Supabase allowlist check);
- an agent answer returns citations, which exercises the n8n or direct RAG path;
- `/sitemap.xml` emits the new host;
- one scheduled workflow run succeeds against the new host;
- `rag_serving_chunks` has no `ready` rows still carrying the old host in their
  metadata.
