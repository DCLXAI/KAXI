# Middleware Defense-in-Depth + E2E CI Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unauthenticated requests to protected page areas (`/admin`, `/student`, `/partner`) are redirected at the proxy (middleware) layer before any page renders, and the existing Playwright smoke suite runs on every CI push.

**Architecture:** `src/proxy.ts` already routes protected paths through `updateSupabaseSession`, but that helper only refreshes the session cookie — it never enforces. We add a pure decision function `resolveProtectedPageRedirect(pathname, hasUser)` to `src/lib/supabase/policy.ts` (DB-free, unit-tested) and call it from `updateSupabaseSession` using the `getUser()` result it already fetches. Role-mismatch enforcement stays per-page (`requireKaxiPageUser` — roles need a DB read the edge proxy must not do); the middleware closes only the unauthenticated hole, mirroring `defaultLoginPath` (`/login`). API paths are deliberately untouched: `/api/admin/*` accepts rotating bearer keys without a Supabase session. Separately, `.github/workflows/ci.yml` gains Playwright steps — the e2e suite is already hermetic (own dev server on :3100, `AGENT_BACKEND: "tool-fallback"`, no external LLM, loopback-guarded test DB via `scripts/prepare-e2e-db.ts`).

**Tech Stack:** Next.js proxy (middleware), Supabase SSR session, Playwright, GitHub Actions.

## Global Constraints

- Branch: `feat/middleware-defense-e2e-ci` off `main`. Commit per task. Trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- NEVER stage `Capsomnia/` or `.superpowers/`; `git add <file> …` only, never `-A`/`.`.
- NEVER run `prisma migrate`/`db:migrate` against anything non-local. No schema changes in this plan.
- Behavior parity: unauthenticated protected-page requests redirect to `/login` — the SAME target `requireKaxiPageUser` uses (`defaultLoginPath` returns `/login` for every non-public area). No `next=` param (parity with the existing page guard).
- Fail-open on Supabase auth outage: if `getUser()` throws, the middleware must keep today's behavior (pass through; page-level guards still enforce). Defense-in-depth must never become a new availability SPOF.
- `/student/login` and `/partner/login` (and `/api/*`) must NEVER be redirected — login pages live under protected prefixes.
- CI e2e must not require any external secret or network (the Playwright `webServer` env in `playwright.config.ts` is already self-contained; `TEST_DATABASE_URL` comes from the CI job env).

---

### Task 1: Proxy-layer unauthenticated redirect

**Files:**
- Modify: `src/lib/supabase/policy.ts` (append after `defaultLoginPath`, ~line 23)
- Modify: `src/lib/supabase/middleware.ts` (enforce inside `updateSupabaseSession`)
- Test: `scripts/test-auth-middleware.ts` (new)
- Modify: `package.json` (add `test:auth-middleware`; append `&& bun run test:auth-middleware` to the END of the `ci:ops` chain)

**Interfaces:**
- Consumes: existing `updateSupabaseSession(req)` flow (`client.auth.getUser()` already called), `defaultLoginPath` semantics.
- Produces: `resolveProtectedPageRedirect(pathname: string, hasUser: boolean): string | null` — returns `"/login"` when an unauthenticated request targets a protected PAGE path, else `null`.

- [ ] **Step 1: Write the failing test**

Create `scripts/test-auth-middleware.ts`:

```ts
import assert from "node:assert/strict";
const { resolveProtectedPageRedirect } = await import("../src/lib/supabase/policy");

// Unauthenticated requests to protected page areas redirect to /login
// (parity with requireKaxiPageUser -> defaultLoginPath).
for (const pathname of [
  "/admin",
  "/admin/cases",
  "/admin/cases/abc123",
  "/student",
  "/student/documents",
  "/partner",
  "/partner/cases/xyz",
]) {
  assert.equal(resolveProtectedPageRedirect(pathname, false), "/login", `${pathname} must redirect`);
}

// Login pages under protected prefixes must never redirect (loop guard).
assert.equal(resolveProtectedPageRedirect("/student/login", false), null);
assert.equal(resolveProtectedPageRedirect("/partner/login", false), null);
assert.equal(resolveProtectedPageRedirect("/login", false), null);

// API paths are exempt: /api/admin accepts rotating bearer keys without a
// Supabase session — middleware must not break API-key clients.
assert.equal(resolveProtectedPageRedirect("/api/admin/cases", false), null);
assert.equal(resolveProtectedPageRedirect("/api/partner/handoffs", false), null);

// Authenticated users pass through (role mismatch stays a page-level concern).
for (const pathname of ["/admin", "/student", "/partner/cases/xyz"]) {
  assert.equal(resolveProtectedPageRedirect(pathname, true), null);
}

// Non-protected paths never redirect regardless of auth.
for (const pathname of ["/", "/ko", "/ko/agent", "/auth/complete", "/account/reset-password", "/partners"]) {
  assert.equal(resolveProtectedPageRedirect(pathname, false), null, `${pathname} must pass`);
}

// Prefix boundary: /partners (public) must not match the /partner prefix.
assert.equal(resolveProtectedPageRedirect("/partnership", false), null);

console.log("PASS auth middleware: protected-page redirect decision");
```

- [ ] **Step 2: Wire the script and verify failure**

In `package.json`, next to `test:api-security`, add:

```json
    "test:auth-middleware": "bun run scripts/test-auth-middleware.ts",
```

and append ` && bun run test:auth-middleware` to the very end of the `ci:ops` value.

Run: `bun run test:auth-middleware`
Expected: FAIL — `resolveProtectedPageRedirect` is not exported.

- [ ] **Step 3: Implement the decision function**

Append to `src/lib/supabase/policy.ts` (after `defaultLoginPath`):

```ts
const PROTECTED_PAGE_PREFIXES = ["/admin", "/student", "/partner"] as const;
const PROTECTED_PAGE_EXEMPT = new Set(["/student/login", "/partner/login"]);

// Middleware-layer defense-in-depth: unauthenticated requests to protected
// PAGE areas are turned away at the proxy, before any page renders. Only the
// unauthenticated case is decided here — role mismatch needs a DB read and
// stays with requireKaxiPageUser. API paths are exempt because /api/admin and
// /api/partner accept rotating bearer keys without a Supabase session.
export function resolveProtectedPageRedirect(pathname: string, hasUser: boolean): string | null {
  if (hasUser) return null;
  if (pathname.startsWith("/api/")) return null;
  if (PROTECTED_PAGE_EXEMPT.has(pathname)) return null;
  const isProtected = PROTECTED_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return isProtected ? "/login" : null;
}
```

- [ ] **Step 4: Enforce in the session middleware**

In `src/lib/supabase/middleware.ts`, replace the body of `updateSupabaseSession`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseMiddlewareClient, isSupabaseAuthUnavailable } from "@/lib/supabase/server";
import { resolveProtectedPageRedirect } from "@/lib/supabase/policy";

export async function updateSupabaseSession(req: NextRequest): Promise<NextResponse> {
  const res = NextResponse.next({ request: req });
  try {
    const client = await createSupabaseMiddlewareClient(req, res);
    const { data } = await client.auth.getUser();
    const redirectPath = resolveProtectedPageRedirect(req.nextUrl.pathname, Boolean(data?.user));
    if (redirectPath) return NextResponse.redirect(new URL(redirectPath, req.url));
  } catch (err) {
    // Fail open: on Supabase auth outage the proxy passes through and the
    // page-level requireKaxiPageUser guard remains the enforcement point.
    if (!isSupabaseAuthUnavailable(err)) {
      console.warn("[supabase middleware skipped]", err instanceof Error ? err.message : "unknown error");
    }
  }
  return res;
}
```

- [ ] **Step 5: Run gates**

Run: `bun run test:auth-middleware && bun run ci:types && bun run lint`
Expected: `PASS auth middleware: protected-page redirect decision`, types clean, lint clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/supabase/policy.ts src/lib/supabase/middleware.ts scripts/test-auth-middleware.ts package.json
git commit -m "feat(auth): proxy-layer redirect for unauthenticated protected pages

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: E2E — middleware assertion + CI wiring

**Files:**
- Modify: `tests/e2e/kaxi-smoke.spec.ts` (append one test)
- Modify: `.github/workflows/ci.yml` (two steps after `bun run build`)

**Interfaces:**
- Consumes: Task 1's redirect behavior; the existing hermetic Playwright `webServer` setup in `playwright.config.ts` (dev server :3100, loopback test DB, `AGENT_BACKEND: "tool-fallback"`).
- Produces: e2e gate in CI (`verify` job).

- [ ] **Step 1: Add the live middleware assertion**

Append to `tests/e2e/kaxi-smoke.spec.ts` (match the file's existing `test(...)` style — read the file's imports/helpers first and reuse them):

```ts
test("unauthenticated protected pages redirect at the proxy layer", async ({ page }) => {
  for (const path of ["/admin", "/student", "/partner"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
  // Login pages under protected prefixes must stay reachable (no loop).
  const partnerLogin = await page.goto("/partner/login");
  expect(partnerLogin?.status()).toBe(200);
});
```

- [ ] **Step 2: Run the suite locally to verify**

Run: `bun run test:e2e`
Expected: all tests pass including the new one (the config starts its own dev server on :3100; requires the local loopback test DB used by the existing suite — same requirement as before this plan). If the local test DB cannot be prepared in this session (Prisma consent gate), record that, verify instead with `bunx playwright test --list` (spec parses, test registered), and rely on the CI run in Step 4 — do NOT fake a pass.

- [ ] **Step 3: Wire e2e into CI**

In `.github/workflows/ci.yml`, after the `run: bun run build` step, append two steps (same indentation as siblings):

```yaml
      - name: Install Playwright browsers
        run: bunx playwright install --with-deps chromium
      - name: End-to-end smoke
        run: bun run test:e2e
```

- [ ] **Step 4: Commit and observe CI**

```bash
git add tests/e2e/kaxi-smoke.spec.ts .github/workflows/ci.yml
git commit -m "ci: run the Playwright smoke suite on every push + middleware e2e

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

The real verification is the PR's CI run: the `verify` job must show the `End-to-end smoke` step passing (this is the first time e2e runs in CI — treat a red run as a genuine finding, fix forward, never delete the step to go green).

---

### Task 3: Rollout (operator-gated)

- [ ] Open PR; wait for CI green INCLUDING the new e2e step; merge; deploy via `gh workflow run "Vercel Production Deploy"`; post-deploy checks (`/api/health` commit match, readiness, 401 gates) plus live middleware probe: `curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' https://kaxi.vercel.app/admin` expecting a 3xx to `/login`, and `https://kaxi.vercel.app/partner/login` expecting 200.
