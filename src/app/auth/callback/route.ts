import { NextRequest, NextResponse } from "next/server";
import { AuthBridgeError, upsertKaxiUserForAuth } from "@/lib/supabase/auth";
import { createSupabaseServerClient, isSupabaseAuthUnavailable } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next") || "/student";
  const code = url.searchParams.get("code");
  const role = url.searchParams.get("role") === "PARTNER_AGENT" ? "PARTNER_AGENT" : "STUDENT";
  const inviteToken = url.searchParams.get("inviteToken");
  const locale = url.searchParams.get("locale") || "ko";

  try {
    if (!code) return NextResponse.redirect(new URL("/student/login?error=missing_code", url.origin));
    const client = await createSupabaseServerClient();
    const exchanged = await client.auth.exchangeCodeForSession?.(code);
    if (!exchanged || exchanged.error || !exchanged.data.session?.user) {
      return NextResponse.redirect(new URL("/student/login?error=callback_failed", url.origin));
    }

    await upsertKaxiUserForAuth({
      authUserId: exchanged.data.session.user.id,
      email: exchanged.data.session.user.email,
      role,
      inviteToken,
      locale,
    });

    return NextResponse.redirect(new URL(next.startsWith("/") ? next : "/student", url.origin));
  } catch (err) {
    if (err instanceof AuthBridgeError) {
      const target = role === "PARTNER_AGENT" ? "/partner/login" : "/student/login";
      const redirect = new URL(target, url.origin);
      redirect.searchParams.set("error", err.code);
      return NextResponse.redirect(redirect);
    }
    if (isSupabaseAuthUnavailable(err)) {
      const redirect = new URL(role === "PARTNER_AGENT" ? "/partner/login" : "/student/login", url.origin);
      redirect.searchParams.set("error", "supabase_unavailable");
      return NextResponse.redirect(redirect);
    }
    console.error("[GET /auth/callback]", err);
    return NextResponse.redirect(new URL("/student/login?error=internal", url.origin));
  }
}
