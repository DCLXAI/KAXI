import { NextRequest, NextResponse } from "next/server";
import { parseLimit, rateLimit } from "@/lib/api/security";
import { db } from "@/lib/db";
import { getCurrentKaxiUser } from "@/lib/supabase/auth";
import { CHAT_SESSION_COOKIE, verifyChatSessionToken } from "@/lib/chat/session-token";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, {
    key: "chat-session-claim",
    limit: parseLimit(process.env.CHAT_SESSION_CLAIM_RATE_LIMIT, 10),
    windowMs: 60 * 1000,
  });
  if (limited) return limited;

  const user = await getCurrentKaxiUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const session = verifyChatSessionToken(req.cookies.get(CHAT_SESSION_COOKIE)?.value);
  if (!session?.sessionId) return NextResponse.json({ claimed: false }, { status: 200 });

  // Claim only the caller's own cookie-proven session, and only while it is
  // still unowned — a claimed session never changes hands.
  const result = await db.chatSession.updateMany({
    where: { sessionKey: session.sessionId, userId: null },
    data: { userId: user.id },
  });
  return NextResponse.json({ claimed: result.count > 0 });
}
