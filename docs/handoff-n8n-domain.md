# Handoff: move the n8n callbacks to karxy.com (cutover step 5)

Paste this into the new Claude Code session. It has the n8n MCP tools; the
session that did the rest of the cutover does not.

---

Work in `/Users/sunsu/Desktop/KAXI`. The product was renamed KAXI → KARXY and
moved from `kaxi.vercel.app` to the custom domain `karxy.com`. Both hosts
currently serve the same Vercel deployment, so nothing is broken — but the
deployed n8n workflows on Railway still call the old host, and that is the last
thing blocking retirement of `kaxi.vercel.app`.

Do step 5 of `docs/DOMAIN_CUTOVER.md`: point the n8n callbacks at `karxy.com`,
and move the repo mirror and the test pins in the **same commit**, so CI and
production do not disagree.

## The five callbacks to move

```
https://kaxi.vercel.app/api/internal/n8n/rag-runtime
https://kaxi.vercel.app/api/internal/n8n/rag-ingestion
https://kaxi.vercel.app/api/internal/n8n/handoff-update
https://kaxi.vercel.app/api/internal/n8n/error-report
https://kaxi.vercel.app/api/internal/n8n/verify
```

Only the host changes. Paths, methods, headers, signing and node structure stay
exactly as they are.

## Three places that must move together

1. **Live n8n on Railway** — via the `mcp__n8n__*` tools. The deployed workflows
   are `KAXI RAG Typebot Orchestrator`, `KAXI Shared Error Handler`, and
   `KAXI RAG Typebot Architecture`.
2. **`infra/n8n/*.json` and `infra/n8n/*.mjs`** — the repo mirror of those
   workflows.
3. **`scripts/test-n8n-rag-orchestration.ts`** — pins the URLs at lines 142
   (`rag-runtime`) and 261 (`error-report`), and asserts on node names.

## Rules

- **Do not rename anything.** Workflow names (`KAXI RAG Typebot Orchestrator`,
  `KAXI Shared Error Handler`) and node names (`Run KAXI RAG Core`,
  `Run KAXI Handoff Core`, `Run KAXI RAG Ingestion Core`) are resolved by name
  by operators, by `scripts/build-n8n-orchestrator.ts`, and by the test above.
  The KAXI in them is an asset identifier, not brand surface.
- **Do not touch** the `KAXI_` environment-variable prefix, lowercase `kaxi`
  identifiers (`x-kaxi-*` headers, `kaxi-site` and other ops source ids,
  prompt/workflow version ids), or the `"KR" | "KAXI"` jurisdiction value.
- **Back up each workflow** (`n8n_get_workflow` → save the JSON under `.local/`,
  which is gitignored) before writing. Prefer `n8n_update_partial_workflow` over
  a full replace.
- Run `n8n_validate_workflow` after each change.
- Never print or commit the n8n API key or the `x-kaxi-typebot-token` value.
- Do not commit anything under `Capsomnia/` or `.superpowers/`.
- Commit trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

## Verify before calling it done

- `bun run test:n8n-rag-orchestration` (or the matching `package.json` script)
  passes with the updated pins.
- `n8n_health_check` is clean, and a real signed request reaches
  `https://karxy.com/api/internal/n8n/rag-runtime`.
- `curl -fsS https://karxy.com/api/readiness` still reports `status: ready`.
- An agent answer in the app still returns citations — that exercises the n8n
  path end to end.

## After step 5

Step 8 becomes unblocked: decide whether `kaxi.vercel.app` redirects to
`karxy.com` or keeps serving. Confirm nothing external still points at the old
host first. Everything else in the cutover is already done — DNS, TLS, Supabase
auth allowlist, `NEXT_PUBLIC_APP_URL`, `PRODUCTION_BASE_URL`, Typebot, the
knowledge corpus, and the RAG serving projection.

## Two credentials need rotating, independently of this work

- The n8n API key was pasted into a chat transcript in plain text. It expires
  2026-09-24; revoke and reissue it in n8n → Settings → API.
- The Typebot `x-kaxi-typebot-token` shared secret passed through tool-call
  arguments during the rebrand, so it sits in a session transcript and in
  cached tool results under `~/.claude/projects/`. It is not in git.
