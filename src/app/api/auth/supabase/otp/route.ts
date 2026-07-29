import { NextRequest, NextResponse } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { isSupabaseAuthUnavailable } from "@/lib/supabase/server";
import { loadSupabaseJs } from "@/lib/supabase/dynamic";
import { siteBaseUrl } from "@/lib/config/site-url";
import { parseLimit, rateLimit } from "@/lib/api/security";

export const runtime = "nodejs";

// The magic-link target used to be whatever Origin the caller sent, so the
// address in a login email was attacker-influenced. Keep honouring the real
// origin — a user on karxy.com must come back to karxy.com, not to whichever
// host siteBaseUrl() names — but only when it is one of ours.
function siteOrigin(req: NextRequest): string {
  const fallback = siteBaseUrl();
  const origin = req.headers.get("origin");
  if (!origin) return fallback;

  try {
    const url = new URL(origin);
    const allowed = url.hostname === "localhost"
      || url.hostname === "127.0.0.1"
      || url.hostname === "karxy.com"
      || url.hostname === "www.karxy.com"
      || url.hostname.endsWith(".vercel.app")
      || url.origin === new URL(fallback).origin;
    return allowed ? url.origin : fallback;
  } catch {
    return fallback;
  }
}

export async function POST(req: NextRequest) {
  try {
    // This was the only public POST in the app with no throttling at all, so it
    // could be scripted to send unlimited login emails to arbitrary addresses
    // on the operator's Supabase quota and sending-domain reputation.
    const limited = await rateLimit(req, {
      key: "auth:otp",
      limit: parseLimit(process.env.AUTH_OTP_RATE_LIMIT, 5),
      windowMs: 60 * 60 * 1000,
    });
    if (limited) return limited;

    const body = (await req.json().catch(() => ({}))) as {
      email?: string;
      inviteToken?: string;
      locale?: string;
      next?: string;
    };
    const email = body.email?.trim().toLowerCase();
    if (!email || !email.includes("@")) return NextResponse.json({ error: "Valid email is required" }, { status: 400 });

    const config = getSupabasePublicConfig();
    if (!config) return NextResponse.json({ error: "Supabase Auth is not configured" }, { status: 503 });

    const { createClient } = await loadSupabaseJs();
    const client = createClient(config.url, config.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const redirect = new URL("/auth/complete", siteOrigin(req));
    if (body.inviteToken) redirect.searchParams.set("inviteToken", body.inviteToken.slice(0, 512));
    if (body.next?.startsWith("/") && !body.next.startsWith("//")) {
      redirect.searchParams.set("next", body.next);
    }
    if (body.locale) redirect.searchParams.set("locale", body.locale.slice(0, 12));

    const result = await client.auth.signInWithOtp?.({
      email,
      options: { emailRedirectTo: redirect.toString(), shouldCreateUser: false },
    });
    // shouldCreateUser:false makes Supabase answer differently for registered
    // and unregistered addresses, and this used to hand that answer straight
    // back — an account-enumeration oracle. Reply identically either way and
    // keep the reason in the server log.
    if (result?.error) {
      console.warn("[POST /api/auth/supabase/otp] sign-in request rejected", result.error.message);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isSupabaseAuthUnavailable(err)) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Supabase Auth unavailable" }, { status: 503 });
    }
    console.error("[POST /api/auth/supabase/otp]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
