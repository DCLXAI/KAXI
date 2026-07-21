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
