import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseMiddlewareClient, isSupabaseAuthUnavailable } from "@/lib/supabase/server";
import { resolveProtectedPageRedirect } from "@/lib/supabase/policy";

export async function updateSupabaseSession(req: NextRequest): Promise<NextResponse> {
  const res = NextResponse.next({ request: req });
  try {
    const client = await createSupabaseMiddlewareClient(req, res);
    const { data } = await client.auth.getUser();
    const redirectPath = resolveProtectedPageRedirect(req.nextUrl.pathname, Boolean(data?.user));
    if (redirectPath) {
      // Carry cookie mutations (e.g. Supabase clearing a stale session) onto
      // the redirect, or the browser would resend the dead cookie forever.
      const redirect = NextResponse.redirect(new URL(redirectPath, req.url));
      for (const cookie of res.cookies.getAll()) redirect.cookies.set(cookie);
      return redirect;
    }
  } catch (err) {
    // Fail open: on Supabase auth outage the proxy passes through and the
    // page-level requireKaxiPageUser guard remains the enforcement point.
    if (!isSupabaseAuthUnavailable(err)) {
      console.warn("[supabase middleware skipped]", err instanceof Error ? err.message : "unknown error");
    }
  }
  return res;
}
