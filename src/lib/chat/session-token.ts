import { createHmac, randomUUID, timingSafeEqual } from "crypto";

export const CHAT_SESSION_COOKIE = "kaxi_chat_session";
export const CHAT_SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

type ChatSessionTokenPayload = {
  v: 1;
  sessionId: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

function secret(env: NodeJS.ProcessEnv = process.env) {
  const value = env.CHAT_SESSION_SIGNING_SECRET?.trim() || "";
  if (value.length < 32 || /^replace-with-/i.test(value)) {
    throw new Error("CHAT_SESSION_SIGNING_SECRET_NOT_CONFIGURED");
  }
  return value;
}

function equal(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isKaxiSessionId(value: string) {
  return /^kaxi-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function createKaxiSessionId() {
  return `kaxi-${randomUUID()}`;
}

export function issueChatSessionToken(sessionId: string, now = Date.now()) {
  if (!isKaxiSessionId(sessionId)) throw new Error("INVALID_CHAT_SESSION_ID");
  const issuedAt = Math.floor(now / 1000);
  const payload: ChatSessionTokenPayload = {
    v: 1,
    sessionId,
    issuedAt,
    expiresAt: issuedAt + CHAT_SESSION_MAX_AGE_SECONDS,
    nonce: randomUUID(),
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", secret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyChatSessionToken(token: string | undefined | null, expectedSessionId?: string, now = Date.now()) {
  const [encoded, signature] = String(token || "").split(".");
  if (!encoded || !signature) return null;

  let expected: string;
  try {
    expected = createHmac("sha256", secret()).update(encoded).digest("base64url");
  } catch {
    return null;
  }
  if (!equal(signature, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as ChatSessionTokenPayload;
    const nowSeconds = Math.floor(now / 1000);
    if (
      payload.v !== 1 ||
      !isKaxiSessionId(payload.sessionId) ||
      !Number.isInteger(payload.issuedAt) ||
      !Number.isInteger(payload.expiresAt) ||
      payload.issuedAt > nowSeconds + 60 ||
      payload.expiresAt <= nowSeconds ||
      payload.expiresAt - payload.issuedAt > CHAT_SESSION_MAX_AGE_SECONDS ||
      (expectedSessionId && payload.sessionId !== expectedSessionId)
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
