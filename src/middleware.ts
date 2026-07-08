import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

const handleI18nRouting = createIntlMiddleware(routing);
const PUBLIC_LEGACY_PATHS = new Set(["/", "/agent", "/consult", "/diagnose", "/schools", "/cost", "/docs", "/partners"]);
const LOCALE_PREFIX = /^\/(ko|vi|mn|en)(\/|$)/;

function needsSupabaseSession(pathname: string) {
  return (
    pathname.startsWith("/student") ||
    pathname.startsWith("/partner") ||
    pathname === "/auth/callback" ||
    pathname.startsWith("/api/partner")
  );
}

function needsI18nRouting(pathname: string) {
  return PUBLIC_LEGACY_PATHS.has(pathname) || LOCALE_PREFIX.test(pathname);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (needsSupabaseSession(pathname)) {
    return updateSupabaseSession(req);
  }
  if (needsI18nRouting(pathname)) {
    return handleI18nRouting(req);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/:locale(ko|vi|mn|en)/:path*",
    "/agent",
    "/consult",
    "/diagnose",
    "/schools",
    "/cost",
    "/docs",
    "/partners",
    "/student/:path*",
    "/partner/:path*",
    "/auth/callback",
    "/api/partner/:path*",
  ],
};
