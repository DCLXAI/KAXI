import { createHmac, scryptSync, timingSafeEqual } from "crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const ADMIN_ROLES = new Set(["owner", "admin", "viewer"]);

export type AdminRole = "owner" | "admin" | "viewer";

function configured(value: string | undefined): boolean {
  const trimmed = value?.trim() || "";
  return Boolean(trimmed) && !/replace-with-/i.test(trimmed);
}

export function isSecureAdminAuthRequired(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === "production" || env.VERCEL === "1" || Boolean(env.VERCEL_ENV);
}

export function getConfiguredAdminRole(env: NodeJS.ProcessEnv = process.env): AdminRole | null {
  const role = env.ADMIN_ROLE?.trim();
  if (role && ADMIN_ROLES.has(role)) return role as AdminRole;
  return isSecureAdminAuthRequired(env) ? null : "owner";
}

export function isAdminLoginConfigurationReady(env: NodeJS.ProcessEnv = process.env): boolean {
  const secure = isSecureAdminAuthRequired(env);
  const hashConfigured = configured(env.ADMIN_PASSWORD_HASH);
  const plainConfigured = configured(env.ADMIN_PASSWORD);

  if (!configured(env.ADMIN_EMAIL) || !getConfiguredAdminRole(env)) return false;

  if (secure) {
    return (
      configured(env.NEXTAUTH_SECRET) &&
      hashConfigured &&
      !plainConfigured &&
      configured(env.ADMIN_MFA_TOTP_SECRET)
    );
  }

  return hashConfigured || plainConfigured;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function decodeBase32(value: string): Buffer {
  const clean = value.toUpperCase().replace(/=+$/g, "").replace(/\s+/g, "");
  let bits = "";
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx < 0) continue;
    bits += idx.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number): string {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secret).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, "0");
}

export function verifyTotp(code: string | undefined, secret: string | undefined): boolean {
  if (!secret) return true;
  const normalized = (code || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;

  const key = decodeBase32(secret);
  const counter = Math.floor(Date.now() / 30_000);
  for (const offset of [-1, 0, 1]) {
    if (safeEqual(hotp(key, counter + offset), normalized)) return true;
  }
  return false;
}

export function verifyAdminMfa(code: string | undefined, env: NodeJS.ProcessEnv = process.env): boolean {
  const secret = env.ADMIN_MFA_TOTP_SECRET;
  if (isSecureAdminAuthRequired(env) && !configured(secret)) return false;
  return verifyTotp(code, secret);
}

export function verifyPasswordHash(password: string, encodedHash: string): boolean {
  if (encodedHash.startsWith("sha256:")) {
    const expected = encodedHash.slice("sha256:".length);
    const actual = createHmac("sha256", process.env.ADMIN_PASSWORD_PEPPER || "kaxi-admin")
      .update(password)
      .digest("hex");
    return safeEqual(actual, expected);
  }

  if (encodedHash.startsWith("scrypt:")) {
    const [, salt, expected] = encodedHash.split(":");
    if (!salt || !expected) return false;
    const actual = scryptSync(password, salt, 64).toString("hex");
    return safeEqual(actual, expected);
  }

  return false;
}

export function verifyAdminPassword(password: string, env: NodeJS.ProcessEnv = process.env): boolean {
  const hash = env.ADMIN_PASSWORD_HASH?.trim();
  const plain = env.ADMIN_PASSWORD || "";

  if (isSecureAdminAuthRequired(env)) {
    if (!hash || !configured(hash) || configured(plain)) return false;
    return verifyPasswordHash(password, hash);
  }

  if (hash && configured(hash)) return verifyPasswordHash(password, hash);

  return Boolean(plain) && safeEqual(password, plain);
}
