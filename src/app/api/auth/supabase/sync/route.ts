import { NextRequest, NextResponse } from "next/server";
import { AuthBridgeError, upsertKaxiUserForAuth } from "@/lib/supabase/auth";
import { createSupabaseServerClient, isSupabaseAuthUnavailable } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      role?: "STUDENT" | "PARTNER_AGENT";
      inviteToken?: string;
      locale?: string;
    };
    const role = body.role === "PARTNER_AGENT" ? "PARTNER_AGENT" : "STUDENT";
    const client = await createSupabaseServerClient();
    const auth = await client.auth.getUser();
    const authUser = auth.data?.user || null;
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await upsertKaxiUserForAuth({
      authUserId: authUser.id,
      email: authUser.email,
      role,
      inviteToken: body.inviteToken || null,
      locale: body.locale || "ko",
    });
    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        role: user.role,
        organizationId: user.organizationId,
        email: user.email,
      },
    });
  } catch (err) {
    if (err instanceof AuthBridgeError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    if (isSupabaseAuthUnavailable(err)) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Supabase Auth unavailable" }, { status: 503 });
    }
    console.error("[POST /api/auth/supabase/sync]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
