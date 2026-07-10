import { NextRequest, NextResponse } from "next/server";
import { AuthBridgeError, syncKaxiUserForAuth } from "@/lib/supabase/auth";
import { postLoginPath } from "@/lib/supabase/policy";
import { createSupabaseServerClient, isSupabaseAuthUnavailable } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next");
  const code = url.searchParams.get("code");
  const inviteToken = url.searchParams.get("inviteToken");
  const locale = url.searchParams.get("locale") || "ko";

  try {
    if (!code) return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
    const client = await createSupabaseServerClient();
    const exchanged = await client.auth.exchangeCodeForSession?.(code);
    const sessionUser = exchanged?.data?.session?.user || null;
    if (!exchanged || exchanged.error || !sessionUser) {
      return NextResponse.redirect(new URL("/login?error=callback_failed", url.origin));
    }

    const user = await syncKaxiUserForAuth({
      authUserId: sessionUser.id,
      email: sessionUser.email,
      inviteToken,
      locale,
    });

    return NextResponse.redirect(new URL(postLoginPath(user.role, next), url.origin));
  } catch (err) {
    if (err instanceof AuthBridgeError) {
      const redirect = new URL("/login", url.origin);
      redirect.searchParams.set("error", err.code);
      return NextResponse.redirect(redirect);
    }
    if (isSupabaseAuthUnavailable(err)) {
      const redirect = new URL("/login", url.origin);
      redirect.searchParams.set("error", "supabase_unavailable");
      return NextResponse.redirect(redirect);
    }
    console.error("[GET /auth/callback]", err);
    return NextResponse.redirect(new URL("/login?error=internal", url.origin));
  }
}
