# Domain cutover runbook — kaxi.vercel.app → karxy.com

Status: **done, with the old host deliberately kept alive.** Every step is
complete. `karxy.com` (Gabia, expires 2027-07-27) serves the product, and
`kaxi.vercel.app` keeps serving alongside it by decision — see step 8.

Everything below was verified against the repository and the live project on
2026-07-25 and 2026-07-27, not assumed.

## Decision on the old host (step 8)

`kaxi.vercel.app` **stays resolving.** It is not redirected and not removed.

That is the safe end state, not an unfinished one:

- The n8n webhook CORS allowlists carry **both** origins, so traffic arriving on
  either host is accepted.
- Outside links — bookmarks, anything already shared, search-engine indexes —
  still point at the old host and would break on removal.
- Nothing costs anything to keep it: it is the Vercel project's own default
  hostname, serving the same deployment.

Revisit only after the old host has gone quiet in traffic for a stretch. When
that happens the change is a redirect to `karxy.com`, and the thing to re-check
first is whether any signed integration still resolves the old hostname.

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

`NEXT_PUBLIC_APP_URL` is now set to `https://karxy.com` in Vercel production,
and `PRODUCTION_BASE_URL` to the same value as a GitHub repository variable.
Those two are what move the application's own links; no code change was needed.

## What was done

Because both hosts serve at once, each step was applied and verified on its own.
No step needed a maintenance window.

1. **Domain attached.** `karxy.com` and `www.karxy.com` added to the Vercel
   project.
2. **DNS.** Gabia A records per the table above; Vercel issued the certificate
   automatically. Nameservers stayed at Gabia.
3. **Supabase Auth.** `https://karxy.com` added to the redirect allowlist with
   the old origin kept — the app builds `emailRedirectTo` from the request
   origin, so whichever host a user arrives on has to be allowed.
4. **Env.** `NEXT_PUBLIC_APP_URL` and `PRODUCTION_BASE_URL` set, then redeployed.
   The built sitemap emitting 36 `karxy.com` URLs is the proof it took effect.
5. **n8n.** The five callbacks moved to `karxy.com` on the live Railway
   workflows, mirrored into `infra/n8n/*` by editing the `.mjs` source and
   recompiling, with the URL pins in `scripts/test-n8n-rag-orchestration.ts` in
   the same commit. The webhook CORS allowlists **gained** `karxy.com` and kept
   `kaxi.vercel.app` — replacing the origin there would reject requests still
   arriving on the old host.
   Two things worth remembering: the n8n public API rejects `settings` keys
   outside its schema, and it *merges* the subset you send rather than replacing,
   so sending only the documented keys is safe. Verify that on the inactive
   workflow before touching an active one.
6. **Typebot.** Webhook and privacy-link URLs moved, and the bot's own copy was
   rebranded at the same time — it had still been greeting users as KAXI.
7. **Corpus.** `knowledge:pgvector` then the serving projection sync. The
   re-ingest script reads the *local* environment, so it needs
   `NEXT_PUBLIC_APP_URL=https://karxy.com` passed explicitly or it rewrites the
   old host straight back.
   This exposed a real defect: the projection freshness check only compared
   chunk-content hashes, so document-metadata-only drift looked fresh forever.
   Fixed in `59a75c7` by also comparing `source_url`.
8. **Old host kept.** See the decision at the top.

## Verification after cutover

```bash
curl -fsS https://karxy.com/api/health
curl -fsS https://karxy.com/api/readiness
curl -sS -o /dev/null -w '%{http_code}\n' https://karxy.com/api/documents   # expect 401
```

Beyond the standard probes, these were confirmed:

- `/sitemap.xml` emits 36 `karxy.com` URLs — checked;
- `rag_serving_chunks` has no `ready` row carrying the old host, and none whose
  `source_url` has drifted from its document — checked;
- the live Typebot widget opens on `karxy.com` and greets as KARXY — checked;
- the n8n capability webhook answers with the governed contract
  (`2026-07-14.v4`, `rag_serving_chunks`, `hybrid-rrf-v3-openai-required`) —
  checked;
- the repo mirror and the live workflows agree on every node's `url` and
  `allowedOrigins` — checked.

Still worth an operator's own eyes, because neither can be proven from here:

- a magic-link login completing end to end — the real test of the Supabase
  allowlist;
- one scheduled GitHub workflow run succeeding against the new host, since those
  now read `PRODUCTION_BASE_URL`.

## Rollback

Each leg is independent and reversible. Backups of all three n8n workflows as
they were before the change are at `.local/n8n-backup-20260727-*.json`; the
Typebot's previous state is at `.local/typebot-backup-20260727-pre-domain.json`.
Unsetting `NEXT_PUBLIC_APP_URL` returns the application's links to the old host,
since the code default is still `https://kaxi.vercel.app`.
