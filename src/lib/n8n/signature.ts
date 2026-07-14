import { createHash, createHmac, randomUUID, timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { primarySecret, rotatingSecrets } from "@/lib/security/rotating-secret";

export const N8N_SIGNATURE_HEADER = "x-kaxi-signature";
export const N8N_TIMESTAMP_HEADER = "x-kaxi-timestamp";
export const N8N_NONCE_HEADER = "x-kaxi-nonce";
export const N8N_PURPOSE_HEADER = "x-kaxi-purpose";

export type N8nWebhookPurpose = "typebot-runtime" | "rag-ingestion" | "typebot-handoff";

export interface N8nSignatureEnvelope {
  purpose: N8nWebhookPurpose;
  timestamp: string;
  nonce: string;
  signature: string;
  payload: unknown;
}

type SignatureVerification =
  | { ok: true; requestTimestamp: Date; expiresAt: Date }
  | { ok: false; reason: "invalid" | "expired" | "future" | "misconfigured" };

type VerificationReceiptClaims = {
  version: 1;
  purpose: N8nWebhookPurpose;
  nonce: string;
  payloadHash: string;
  issuedAt: number;
  expiresAt: number;
};

type ReceiptVerification =
  | { ok: true; claims: VerificationReceiptClaims }
  | { ok: false; reason: "invalid" | "expired" | "future" | "misconfigured" };

function configured(value: string | undefined) {
  const text = value?.trim() || "";
  if (!text || /^(replace-with-|change_me)/i.test(text)) return "";
  return text;
}

function signingSecret(env: NodeJS.ProcessEnv = process.env) {
  return primarySecret(env, "N8N_WEBHOOK_SIGNING_SECRET");
}

function maxAgeSeconds(env: NodeJS.ProcessEnv = process.env) {
  const parsed = Number.parseInt(env.N8N_WEBHOOK_MAX_AGE_SECONDS || "300", 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 30), 900) : 300;
}

function receiptTtlSeconds(env: NodeJS.ProcessEnv = process.env) {
  const parsed = Number.parseInt(env.N8N_VERIFICATION_RECEIPT_TTL_SECONDS || "60", 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 15), 120) : 60;
}

function stableJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") return Number.isFinite(value) ? JSON.stringify(value) : "null";
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`;
  }
  return "null";
}

function canonicalRequest(envelope: Omit<N8nSignatureEnvelope, "signature">) {
  return [envelope.purpose, envelope.timestamp, envelope.nonce, stableJson(envelope.payload)].join("\n");
}

function digest(secret: string, envelope: Omit<N8nSignatureEnvelope, "signature">) {
  return createHmac("sha256", secret).update(canonicalRequest(envelope)).digest("hex");
}

function payloadHash(payload: unknown) {
  return createHash("sha256").update(stableJson(payload)).digest("hex");
}

function receiptDigest(secret: string, encodedClaims: string) {
  return createHmac("sha256", secret)
    .update(`n8n-verification-receipt\n${encodedClaims}`)
    .digest("hex");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function typebotTokenDigest(secret: string, sessionId: string, timestamp: string) {
  return createHmac("sha256", secret).update(`typebot-handoff\n${sessionId}\n${timestamp}`).digest("hex");
}

export function createTypebotHandoffToken(sessionId: string, options: { now?: number; env?: NodeJS.ProcessEnv } = {}) {
  const env = options.env || process.env;
  const secret = signingSecret(env);
  if (!secret) throw new Error("N8N_WEBHOOK_NOT_CONFIGURED");
  const timestamp = String(options.now ?? Date.now());
  return `${timestamp}.${typebotTokenDigest(secret, sessionId, timestamp)}`;
}

export function verifyTypebotHandoffToken(
  sessionId: string,
  token: string,
  options: { now?: number; env?: NodeJS.ProcessEnv } = {},
) {
  const env = options.env || process.env;
  const secrets = rotatingSecrets(env, "N8N_WEBHOOK_SIGNING_SECRET");
  if (secrets.length === 0) return false;
  const [timestamp, signature, ...rest] = token.split(".");
  if (rest.length > 0 || !/^\d{13}$/.test(timestamp || "") || !/^[a-f0-9]{64}$/i.test(signature || "")) {
    return false;
  }
  const timestampMs = Number(timestamp);
  const now = options.now ?? Date.now();
  if (timestampMs > now + 30_000 || now - timestampMs > 24 * 60 * 60 * 1000) return false;
  return secrets.some((secret) =>
    safeEqual(signature.toLowerCase(), typebotTokenDigest(secret, sessionId, timestamp))
  );
}

export function getN8nWebhookConfig(purpose: N8nWebhookPurpose, env: NodeJS.ProcessEnv = process.env) {
  const urlKey =
    purpose === "typebot-runtime"
      ? "N8N_TYPEBOT_RAG_WEBHOOK_URL"
      : purpose === "rag-ingestion"
        ? "N8N_RAG_INGESTION_WEBHOOK_URL"
        : "N8N_TYPEBOT_HANDOFF_WEBHOOK_URL";
  const url = configured(env[urlKey]);
  const secret = signingSecret(env);
  if (!url || !secret) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
      return null;
    }
  } catch {
    return null;
  }

  return { url, secret };
}

export function signN8nPayload(
  purpose: N8nWebhookPurpose,
  payload: unknown,
  options: { now?: number; nonce?: string; env?: NodeJS.ProcessEnv } = {},
) {
  const env = options.env || process.env;
  const config = getN8nWebhookConfig(purpose, env);
  if (!config) throw new Error("N8N_WEBHOOK_NOT_CONFIGURED");

  const unsigned = {
    purpose,
    timestamp: String(options.now ?? Date.now()),
    nonce: options.nonce || randomUUID(),
    payload,
  };
  const signature = `sha256=${digest(config.secret, unsigned)}`;

  return {
    url: config.url,
    body: JSON.stringify(payload),
    envelope: { ...unsigned, signature } satisfies N8nSignatureEnvelope,
    headers: {
      "Content-Type": "application/json",
      [N8N_SIGNATURE_HEADER]: signature,
      [N8N_TIMESTAMP_HEADER]: unsigned.timestamp,
      [N8N_NONCE_HEADER]: unsigned.nonce,
      [N8N_PURPOSE_HEADER]: purpose,
    },
  };
}

export function verifyN8nSignature(
  envelope: N8nSignatureEnvelope,
  options: { now?: number; env?: NodeJS.ProcessEnv } = {},
): SignatureVerification {
  const env = options.env || process.env;
  const secrets = rotatingSecrets(env, "N8N_WEBHOOK_SIGNING_SECRET");
  if (secrets.length === 0) return { ok: false, reason: "misconfigured" };
  if (!/^[a-z0-9-]{16,128}$/i.test(envelope.nonce)) return { ok: false, reason: "invalid" };
  if (!/^sha256=[a-f0-9]{64}$/i.test(envelope.signature)) return { ok: false, reason: "invalid" };

  const timestampMs = Number(envelope.timestamp);
  if (!Number.isSafeInteger(timestampMs) || timestampMs <= 0) return { ok: false, reason: "invalid" };

  const now = options.now ?? Date.now();
  const maxAgeMs = maxAgeSeconds(env) * 1000;
  if (timestampMs > now + 30_000) return { ok: false, reason: "future" };
  if (now - timestampMs > maxAgeMs) return { ok: false, reason: "expired" };

  const unsigned = {
    purpose: envelope.purpose,
    timestamp: envelope.timestamp,
    nonce: envelope.nonce,
    payload: envelope.payload,
  };
  const valid = secrets.some((secret) =>
    safeEqual(envelope.signature.slice("sha256=".length).toLowerCase(), digest(secret, unsigned))
  );
  if (!valid) {
    return { ok: false, reason: "invalid" };
  }

  return {
    ok: true,
    requestTimestamp: new Date(timestampMs),
    expiresAt: new Date(timestampMs + maxAgeMs),
  };
}

export function createN8nVerificationReceipt(
  purpose: N8nWebhookPurpose,
  payload: unknown,
  nonce: string,
  options: { now?: number; env?: NodeJS.ProcessEnv } = {},
) {
  const env = options.env || process.env;
  const secret = signingSecret(env);
  if (!secret) throw new Error("N8N_WEBHOOK_NOT_CONFIGURED");
  if (!/^[a-z0-9-]{16,128}$/i.test(nonce)) throw new Error("N8N_RECEIPT_INVALID_NONCE");

  const issuedAt = options.now ?? Date.now();
  const claims: VerificationReceiptClaims = {
    version: 1,
    purpose,
    nonce,
    payloadHash: payloadHash(payload),
    issuedAt,
    expiresAt: issuedAt + receiptTtlSeconds(env) * 1000,
  };
  const encodedClaims = Buffer.from(stableJson(claims)).toString("base64url");
  return `${encodedClaims}.${receiptDigest(secret, encodedClaims)}`;
}

export function verifyN8nVerificationReceipt(
  token: string,
  purpose: N8nWebhookPurpose,
  payload: unknown,
  options: { now?: number; env?: NodeJS.ProcessEnv } = {},
): ReceiptVerification {
  const env = options.env || process.env;
  const secrets = rotatingSecrets(env, "N8N_WEBHOOK_SIGNING_SECRET");
  if (secrets.length === 0) return { ok: false, reason: "misconfigured" };

  const [encodedClaims, signature, ...rest] = token.split(".");
  if (
    rest.length > 0
    || !/^[a-z0-9_-]{16,4096}$/i.test(encodedClaims || "")
    || !/^[a-f0-9]{64}$/i.test(signature || "")
  ) {
    return { ok: false, reason: "invalid" };
  }
  const signatureValid = secrets.some((secret) =>
    safeEqual(signature.toLowerCase(), receiptDigest(secret, encodedClaims))
  );
  if (!signatureValid) return { ok: false, reason: "invalid" };

  let claims: VerificationReceiptClaims;
  try {
    claims = JSON.parse(Buffer.from(encodedClaims, "base64url").toString("utf8")) as VerificationReceiptClaims;
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (
    claims?.version !== 1
    || claims.purpose !== purpose
    || !/^[a-z0-9-]{16,128}$/i.test(claims.nonce || "")
    || !/^[a-f0-9]{64}$/i.test(claims.payloadHash || "")
    || !Number.isSafeInteger(claims.issuedAt)
    || !Number.isSafeInteger(claims.expiresAt)
    || claims.expiresAt <= claims.issuedAt
    || claims.expiresAt - claims.issuedAt > 120_000
    || !safeEqual(claims.payloadHash.toLowerCase(), payloadHash(payload))
  ) {
    return { ok: false, reason: "invalid" };
  }

  const now = options.now ?? Date.now();
  if (claims.issuedAt > now + 30_000) return { ok: false, reason: "future" };
  if (now > claims.expiresAt) return { ok: false, reason: "expired" };
  return { ok: true, claims };
}

export async function verifyAndConsumeN8nSignature(envelope: N8nSignatureEnvelope) {
  const verification = verifyN8nSignature(envelope);
  if (!verification.ok) return verification;

  const url = configured(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = configured(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !serviceRoleKey) return { ok: false as const, reason: "misconfigured" as const };

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const inserted = await supabase.from("webhook_nonces").insert({
    nonce: envelope.nonce,
    purpose: envelope.purpose,
    request_timestamp: verification.requestTimestamp.toISOString(),
    expires_at: verification.expiresAt.toISOString(),
  });

  if (inserted.error?.code === "23505") return { ok: false as const, reason: "replayed" as const };
  if (inserted.error) throw inserted.error;
  return verification;
}
