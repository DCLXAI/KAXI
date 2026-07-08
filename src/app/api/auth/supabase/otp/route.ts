import { NextRequest, NextResponse } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { isSupabaseAuthUnavailable } from "@/lib/supabase/server";
import { loadSupabaseJs } from "@/lib/supabase/dynamic";

export const runtime = "nodejs";

function siteOrigin(req: NextRequest): string {
  const origin = req.headers.get("origin");
  if (origin) return origin;
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      email?: string;
      role?: "STUDENT" | "PARTNER_AGENT";
      inviteToken?: string;
      locale?: string;
    };
    const email = body.email?.trim().toLowerCase();
    if (!email || !email.includes("@")) return NextResponse.json({ error: "Valid email is required" }, { status: 400 });

    const config = getSupabasePublicConfig();
    if (!config) return NextResponse.json({ error: "Supabase Auth is not configured" }, { status: 503 });

    const { createClient } = await loadSupabaseJs();
    const client = createClient(config.url, config.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const role = body.role === "PARTNER_AGENT" ? "PARTNER_AGENT" : "STUDENT";
    const next = role === "PARTNER_AGENT" ? "/partner" : "/student";
    const redirect = new URL("/auth/callback", siteOrigin(req));
    redirect.searchParams.set("next", next);
    redirect.searchParams.set("role", role);
    if (body.locale) redirect.searchParams.set("locale", body.locale.slice(0, 12));
    if (body.inviteToken) redirect.searchParams.set("inviteToken", body.inviteToken);

    const result = await client.auth.signInWithOtp?.({
      email,
      options: { emailRedirectTo: redirect.toString() },
    });
    if (result?.error) return NextResponse.json({ error: result.error.message || "OTP request failed" }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isSupabaseAuthUnavailable(err)) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Supabase Auth unavailable" }, { status: 503 });
    }
    console.error("[POST /api/auth/supabase/otp]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
