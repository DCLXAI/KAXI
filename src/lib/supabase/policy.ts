import type { UserRole } from "@prisma/client";

export type KaxiAuthArea = "student" | "partner" | "admin" | "public";

export function areaForPath(pathname: string): KaxiAuthArea {
  if (pathname.startsWith("/student")) return "student";
  if (pathname.startsWith("/partner") || pathname.startsWith("/api/partner")) return "partner";
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) return "admin";
  return "public";
}

export function canAccessArea(role: UserRole | null | undefined, area: KaxiAuthArea): boolean {
  if (area === "public") return true;
  if (area === "admin") return role === "PLATFORM_ADMIN";
  if (area === "student") return role === "STUDENT";
  if (area === "partner") return role === "PARTNER_AGENT";
  return false;
}

export function defaultLoginPath(area: KaxiAuthArea): string {
  if (area === "public") return "/";
  return "/login";
}

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

export function defaultHomePath(role: UserRole): string {
  if (role === "PARTNER_AGENT") return "/partner";
  if (role === "PLATFORM_ADMIN") return "/admin/cases";
  return "/student";
}

export function postLoginPath(role: UserRole, requestedPath?: string | null): string {
  const fallback = defaultHomePath(role);
  const requested = requestedPath?.trim() || "";
  if (!requested.startsWith("/") || requested.startsWith("//")) return fallback;

  const area = areaForPath(requested);
  return canAccessArea(role, area) ? requested : fallback;
}
