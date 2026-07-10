import { NextRequest, NextResponse } from "next/server";
import { parseLimit, rateLimit } from "@/lib/api/security";
import { JsonBodyError, readJsonBody } from "@/lib/api/json-body";
import { loadChatSessionSnapshot } from "@/lib/chat/history";
import { endChatSession, ensureChatSession } from "@/lib/chat/persistence";
import { getChatAttachmentSecurityDiagnostics } from "@/lib/chat/attachment-security";
import {
  CHAT_SESSION_COOKIE,
  CHAT_SESSION_MAX_AGE_SECONDS,
  createKaxiSessionId,
  issueChatSessionToken,
  verifyChatSessionToken,
} from "@/lib/chat/session-token";

export const runtime = "nodejs";

const LOCALES = new Set(["ko", "en", "vi", "mn"]);

function markPrivate(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Cookie");
  return response;
}

function privateJson(body: unknown, init?: ResponseInit) {
  return markPrivate(NextResponse.json(body, init));
}

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, {
    key: "chat-session-history",
    limit: parseLimit(process.env.CHAT_SESSION_HISTORY_RATE_LIMIT, 30),
    windowMs: 60 * 1000,
  });
  if (limited) return markPrivate(limited);

  const current = verifyChatSessionToken(req.cookies.get(CHAT_SESSION_COOKIE)?.value);
  if (!current?.sessionId) {
    return privateJson({ error: "Invalid or expired chat session" }, { status: 401 });
  }

  try {
    const snapshot = await loadChatSessionSnapshot(current.sessionId);
    if (!snapshot) return privateJson({ error: "Chat session not found" }, { status: 404 });
    return privateJson({ sessionId: current.sessionId, ...snapshot });
  } catch (error) {
    console.error("[GET /api/chat-session]", error);
    return privateJson({ error: "Unable to restore chat session" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, {
    key: "chat-session",
    limit: parseLimit(process.env.CHAT_SESSION_RATE_LIMIT, 30),
    windowMs: 60 * 1000,
  });
  if (limited) return markPrivate(limited);

  try {
    const body = await readJsonBody<{ forceNew?: unknown; locale?: unknown }>(req, 4 * 1024);
    const forceNew = body?.forceNew === true;
    const current = verifyChatSessionToken(req.cookies.get(CHAT_SESSION_COOKIE)?.value);
    if (forceNew && current?.sessionId) {
      await endChatSession(current.sessionId).catch((error) => {
        console.warn("[POST /api/chat-session] unable to close previous session", error);
      });
    }
    const sessionId = !forceNew && current?.sessionId ? current.sessionId : createKaxiSessionId();
    const locale = typeof body?.locale === "string" && LOCALES.has(body.locale) ? body.locale : "ko";

    await ensureChatSession({
      sessionKey: sessionId,
      tenantId: "default",
      locale,
      source: "kaxi-site",
      metadata: { ownership: "signed-http-only-cookie" },
    });

    const response = privateJson({
      sessionId,
      expiresIn: CHAT_SESSION_MAX_AGE_SECONDS,
      capabilities: {
        attachments: getChatAttachmentSecurityDiagnostics().uploadsEnabled,
      },
    });
    response.cookies.set(CHAT_SESSION_COOKIE, issueChatSessionToken(sessionId), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: CHAT_SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    if (error instanceof JsonBodyError) {
      return privateJson({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error && error.message === "CHAT_SESSION_SIGNING_SECRET_NOT_CONFIGURED") {
      return privateJson({ error: "Chat session signing is not configured" }, { status: 503 });
    }
    console.error("[POST /api/chat-session]", error);
    return privateJson({ error: "Unable to create chat session" }, { status: 500 });
  }
}
