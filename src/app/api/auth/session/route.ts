import { NextResponse } from "next/server";
import { getCurrentKaxiSession } from "@/lib/supabase/auth";
import { createSupabaseServerClient, isSupabaseAuthUnavailable } from "@/lib/supabase/server";
import type { KaxiSessionPayload } from "@/lib/supabase/session-types";

export const runtime = "nodejs";

const ANONYMOUS_SESSION: KaxiSessionPayload = {
  available: true,
  authenticated: false,
  user: null,
};

export async function GET() {
  try {
    const session = await getCurrentKaxiSession();
    if (!session) return NextResponse.json(ANONYMOUS_SESSION);

    const payload: KaxiSessionPayload = {
      available: true,
      authenticated: true,
      user: session.user
        ? {
            id: session.user.id,
            email: session.user.email,
            role: session.user.role,
            organizationId: session.user.organizationId,
          }
        : null,
    };
    return NextResponse.json(payload, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    if (isSupabaseAuthUnavailable(error)) {
      return NextResponse.json({ ...ANONYMOUS_SESSION, available: false });
    }
    console.error("[GET /api/auth/session]", error);
    return NextResponse.json({ error: "Session lookup failed" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const client = await createSupabaseServerClient();
    await client.auth.signOut?.();
    return new NextResponse(null, { status: 204, headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    if (isSupabaseAuthUnavailable(error)) return new NextResponse(null, { status: 204 });
    console.error("[DELETE /api/auth/session]", error);
    return NextResponse.json({ error: "Sign out failed" }, { status: 500 });
  }
}
