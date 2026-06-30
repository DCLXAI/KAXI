import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "crypto";

const VERSION = "v1";

function normalizeSecret(value: string): Buffer {
  const trimmed = value.trim();
  if (/^[a-f0-9]{64}$/i.test(trimmed)) return Buffer.from(trimmed, "hex");

  try {
    const decoded = Buffer.from(trimmed, "base64");
    if (decoded.length === 32) return decoded;
  } catch {}

  return createHash("sha256").update(trimmed).digest();
}

function encryptionKey(): Buffer | null {
  const secret = process.env.DATA_ENCRYPTION_KEY?.trim();
  return secret ? normalizeSecret(secret) : null;
}

function hashSecret(): Buffer {
  return normalizeSecret(process.env.PII_HASH_SECRET || process.env.DATA_ENCRYPTION_KEY || "kaxi-local-pii-hash");
}

function normalizeForHash(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isPiiEncryptionConfigured(): boolean {
  return Boolean(encryptionKey());
}

export function requiresPiiEncryption(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

export function canPersistPiiValue(value: string | null | undefined): boolean {
  const text = value?.trim();
  if (!text) return true;
  if (isPiiEncryptionConfigured()) return true;
  return !requiresPiiEncryption();
}

function canStoreUnencryptedPlaintext(): boolean {
  return process.env.PII_ALLOW_UNENCRYPTED_PLAINTEXT === "true" && process.env.NODE_ENV !== "production";
}

export function hashPii(value: string | null | undefined): string | null {
  const normalized = value ? normalizeForHash(value) : "";
  if (!normalized) return null;
  return createHmac("sha256", hashSecret()).update(normalized).digest("hex");
}

export function encryptPii(value: string | null | undefined): string | null {
  const key = encryptionKey();
  const text = value?.trim();
  if (!key || !text) return null;

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptPii(ciphertext: string | null | undefined): string | null {
  const key = encryptionKey();
  if (!key || !ciphertext) return null;

  const [version, iv64, tag64, encrypted64] = ciphertext.split(":");
  if (version !== VERSION || !iv64 || !tag64 || !encrypted64) return null;

  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv64, "base64"));
    decipher.setAuthTag(Buffer.from(tag64, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

export function redactSensitiveText(value: string | null | undefined): string {
  const text = value || "";
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, "[redacted-phone]")
    .replace(/\b(?:zalo|wechat|telegram|kakao|line)\s*[:：]?\s*[\w@.+-]{3,}/gi, "[redacted-contact]");
}

export function redactContact(value: string | null | undefined): string | null {
  const text = value?.trim();
  if (!text) return null;
  if (text.includes("@")) {
    const [name, domain] = text.split("@");
    return `${name.slice(0, 2)}***@${domain || "***"}`;
  }
  return text.length <= 4 ? "***" : `${text.slice(0, 2)}***${text.slice(-2)}`;
}

export function preparePiiField(
  value: string | null | undefined,
  options: { kind?: "contact" | "text"; maxPlainLength?: number } = {}
) {
  const trimmed = value?.trim() || "";
  if (!trimmed) {
    return {
      plaintext: null,
      ciphertext: null,
      hash: null,
      redacted: false,
    };
  }

  const ciphertext = encryptPii(trimmed);
  const encrypted = Boolean(ciphertext);
  const redactedPlaintext = options.kind === "contact"
    ? redactContact(trimmed)
    : redactSensitiveText(trimmed).slice(0, options.maxPlainLength || 240);
  const safePlaintext = encrypted || canStoreUnencryptedPlaintext()
    ? redactedPlaintext
    : options.kind === "contact"
      ? redactedPlaintext
      : "[redacted-unencrypted]";

  return {
    plaintext: safePlaintext,
    ciphertext,
    hash: hashPii(trimmed),
    redacted: encrypted || safePlaintext !== trimmed,
  };
}

export function readPiiField(
  plaintext: string | null | undefined,
  ciphertext: string | null | undefined
): string | null {
  return decryptPii(ciphertext) || plaintext || null;
}

export function retentionUntil(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
