import { NextResponse } from "next/server";
import { getCurrentKaxiSession } from "@/lib/supabase/auth";
import { isSupabaseAuthUnavailable } from "@/lib/supabase/server";
import type { KaxiSessionPayload } from "@/lib/supabase/session-types";
import { isAdminAal2Session } from "@/lib/supabase/policy";

export const runtime = "nodejs";

const ANONYMOUS_SESSION: KaxiSessionPayload = {
  available: true,
  authenticated: false,
  user: null,
  currentAal: null,
  nextAal: null,
  mfaRequired: false,
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
      currentAal: session.currentAal,
      nextAal: session.nextAal,
      mfaRequired: session.user?.role === "PLATFORM_ADMIN" && !isAdminAal2Session(session.user.role, session.currentAal),
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
