import { NextRequest, NextResponse } from "next/server";
import { AuthBridgeError, upsertKaxiUserForAuth } from "@/lib/supabase/auth";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { loadSupabaseJs } from "@/lib/supabase/dynamic";
import { isSupabaseAuthUnavailable } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
      mode?: "sign_up" | "sign_in";
      role?: "STUDENT" | "PARTNER_AGENT";
      inviteToken?: string;
      locale?: string;
    };
    const email = body.email?.trim().toLowerCase();
    const password = body.password || "";
    if (!email || !email.includes("@")) return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

    const config = getSupabasePublicConfig();
    if (!config) return NextResponse.json({ error: "Supabase Auth is not configured" }, { status: 503 });

    const { createClient } = await loadSupabaseJs();
    const client = createClient(config.url, config.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const result =
      body.mode === "sign_in"
        ? await client.auth.signInWithPassword?.({ email, password })
        : await client.auth.signUp?.({ email, password });
    if (!result || result.error) {
      return NextResponse.json({ error: result?.error?.message || "Supabase password auth failed" }, { status: 400 });
    }

    const authUser = result.data.user;
    if (authUser) {
      const role = body.role === "PARTNER_AGENT" ? "PARTNER_AGENT" : "STUDENT";
      await upsertKaxiUserForAuth({
        authUserId: authUser.id,
        email: authUser.email || email,
        role,
        inviteToken: body.inviteToken || null,
        locale: body.locale || "ko",
      });
    }

    return NextResponse.json({
      ok: true,
      hasSession: Boolean(result.data.session),
      message: result.data.session
        ? "Supabase authenticated. Browser clients should persist the returned session."
        : "Check email verification or sign in after confirmation.",
    });
  } catch (err) {
    if (err instanceof AuthBridgeError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    if (isSupabaseAuthUnavailable(err)) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Supabase Auth unavailable" }, { status: 503 });
    }
    console.error("[POST /api/auth/supabase/password]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
