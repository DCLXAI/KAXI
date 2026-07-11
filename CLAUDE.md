# KAXI Claude Code Handoff

## Production deployment status (2026-07-10)

- Production: `https://kaxi.vercel.app`
- Vercel project: `sunsus-projects/kaxi` (already linked in `.vercel/project.json`)
- Release commit: `40e9b07f76298834d5c74c96b325d9c661172bf2`
- `main` and `origin/main` point to the release commit. The dirty `fix/high-security-patches` worktree remains intentionally untouched and may be behind `main`.
- The live deployment is Ready. `GET /api/health` and `GET /api/readiness` return HTTP 200.
- The live Vercel environment uses the current writable PostgreSQL/Supabase database and reports schema parity through `20260710190000_handoff_consent_evidence`.

Do not print, copy into source, or commit any API key, database URL, Vercel token, or Supabase service-role key.

## Critical correction: do not resolve migrations on Supabase

Do **not** run `prisma migrate resolve` against the current Supabase production database for the failed GitHub run. The Actions log explicitly shows that the failed migration connected to `db.prisma.io:5432`, not a Supabase host. Any P3018 row created by that run belongs to the obsolete Prisma-managed database selected by stale GitHub secrets.

The live Vercel runtime database already has a finished, non-rolled-back `_prisma_migrations` row for `20260710190000_handoff_consent_evidence`. It also has the canonical tables, columns, and functions created by the migrations after `20260710100000_n8n_security_baseline`; this is verified by `src/lib/ops/schema-parity.ts` and the live HTTP 200 `status: ready` response from `/api/readiness`.

Do not remove or silently swallow the Supabase `GRANT`/`REVOKE` statements to make the migration pass on the obsolete database. The correct fix is to point GitHub deployment secrets at the same current Supabase database used by Vercel, then rerun the deployment workflow. The old Prisma database and its failed migration ledger are outside the active KAXI production path.

## Resolved credential incident and future rotation rule

The rerun of Actions run `29097143282` reached the correct Supabase session-pooler host but initially failed with Prisma `P1000`. The operator updated the local runtime file with the current credential, and the value was validated through a real database connection without being printed. GitHub and Vercel production DB secrets were then synchronized.

This incident is resolved. CI run `29101526685` and production deployment run `29101762754` both succeeded for release `40e9b07`. The deployment workflow applied migrations, verified a protected canary, ran readiness/legal/Agent/Consult checks, and promoted it to `https://kaxi.vercel.app`.

Do not interpret empty values from `vercel env pull` as missing production configuration. KAXI's production DB variables are Vercel Sensitive Environment Variables, whose values are non-readable after creation. The running deployment still reports a writable DB and full schema parity, which proves that its existing runtime credential remains valid. Do not attempt to extract that credential from Vercel or expose it through an endpoint/build log.

If no operator-held copy of the password exists in a future incident, recovery requires a coordinated password rotation:

1. Choose a new strong URL-safe password outside chat and prepare the session-pooler and runtime URLs without printing them.
2. Reset the database password in Supabase Dashboard (`Database` -> `Settings`). This is an external production change and requires explicit operator approval.
3. Immediately update all Vercel sensitive DB variables used by KAXI and the GitHub repository migration secrets with the same new credential. Update `.local/supabase-kaxi-runtime.env` locally with restrictive file permissions.
4. Deploy from a clean `main`, run the migration workflow, and verify `/api/health`, `/api/readiness`, and the unauthenticated document 401 checks.
5. Do not run `migrate resolve` on the current Supabase database; its migration ledger is already healthy.

Avoid resetting the Supabase password until the Vercel/GitHub/local replacement values and deployment commands are ready, because the currently running deployment will lose new DB connections as soon as the password changes.

## Why the GitHub production deployment failed

There were two separate failures:

1. Run `29096775830` failed the source gate because `actions/checkout` left a detached HEAD. Commit `7a27d71` fixed this by checking out attached `main` and then verifying the exact CI SHA.
2. Run `29097143282` passed the source/build gates but failed at `Apply PostgreSQL migrations`. GitHub Actions selected the repository `DATABASE_URL`, whose host was the old Prisma-managed `db.prisma.io` database. Migration `20260710100000_n8n_security_baseline` contains Supabase role grants/revokes and failed there with PostgreSQL `42501`: `restricted superuser cannot grant or revoke privileges`.

This is why a direct Vercel deployment worked while the GitHub workflow failed: Vercel runtime environment variables point at the current operational database, but the GitHub repository database secrets are stale. The application code and Vercel credentials were not the blocker.

Evidence:

- `https://github.com/DCLXAI/KAXI/actions/runs/29096775830`
- `https://github.com/DCLXAI/KAXI/actions/runs/29097143282`

## Required operator fix before rerunning GitHub deployment

1. In GitHub repository secrets, replace `DATABASE_URL` and `POSTGRES_URL` values that point to the old Prisma database with the current Supabase production connection URL.
2. Prefer a Supabase direct connection for Prisma migrations. If the GitHub runner cannot reach the direct IPv6 endpoint, use the Supabase session pooler suitable for DDL. Do not use the transaction pooler for migrations.
3. Do not use `PRISMA_DATABASE_URL` (`prisma+postgres://...`) for `prisma migrate deploy`.
4. A more explicit follow-up is to add `SUPABASE_DIRECT_URL: ${{ secrets.SUPABASE_DIRECT_URL }}` to `.github/workflows/vercel-production.yml`; `scripts/deploy-postgres-migrations.ts` already prefers this key.
5. Confirm that the selected host is Supabase before running migrations. Never resolve or mutate the failed migration record in the old Prisma database as part of the KAXI Supabase release.

Only secret names may be logged. Never log their values or connection strings.

## Preferred release path

After GitHub database secrets are corrected:

```bash
gh workflow run "Vercel Production Deploy"
gh run list --workflow "Vercel Production Deploy" --limit 3
```

The workflow runs CI, checks a clean attached `main`, builds a Vercel canary, applies migrations, verifies `/api/readiness` plus Agent/Consult smoke tests, and promotes the canary only after those checks pass.

Emergency direct deployment is possible because the local Vercel CLI is authenticated and the project is linked:

```bash
vercel deploy --prod --yes --force
```

Use that only from a clean `main` worktree. It bypasses the GitHub migration/canary gate, so first confirm that the operational DB already has the required migration and then verify readiness after deployment.

## Required post-deploy checks

```bash
curl -fsS https://kaxi.vercel.app/api/health
curl -fsS https://kaxi.vercel.app/api/readiness
curl -sS -o /dev/null -w '%{http_code}\n' https://kaxi.vercel.app/api/documents
```

Expected results:

- Health: HTTP 200 with `status: ok`
- Readiness: HTTP 200 with `status: ready`
- Unauthenticated documents request: HTTP 401
- Unauthenticated `POST /api/documents/upload-intent`: HTTP 401
- Unsigned `PUT /api/documents/upload-direct`: HTTP 401
- `/ko/docs` shows the student-login banner and its button navigates to `/student/login`

## Worktree warning

The primary worktree currently contains unrelated, uncommitted chat guardrail changes. Do not reset, clean, stash, stage, or deploy them. Use a separate clean `main` worktree for release operations.
