import { timingSafeEqual } from "crypto";

function configured(value: string | undefined, minLength: number) {
  const text = value?.trim() || "";
  if (text.length < minLength || /^(replace-with-|change_me)/i.test(text)) return "";
  return text;
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function primarySecret(
  env: NodeJS.ProcessEnv,
  key: string,
  minLength = 32,
) {
  return configured(env[key], minLength);
}

export function rotatingSecrets(
  env: NodeJS.ProcessEnv,
  key: string,
  previousKey = `${key}_PREVIOUS`,
  minLength = 32,
) {
  return Array.from(new Set([
    configured(env[key], minLength),
    configured(env[previousKey], minLength),
  ].filter(Boolean)));
}

export function matchesRotatingSecret(
  provided: string | undefined | null,
  env: NodeJS.ProcessEnv,
  key: string,
  previousKey = `${key}_PREVIOUS`,
  minLength = 32,
) {
  const candidate = provided?.trim() || "";
  if (!candidate) return false;
  return rotatingSecrets(env, key, previousKey, minLength)
    .some((expected) => safeEqual(candidate, expected));
}

export function bearerToken(headers: Pick<Headers, "get">) {
  return headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
}

export function getCredentialRotationDiagnostics(env: NodeJS.ProcessEnv = process.env) {
  const raw = env.SECURITY_CREDENTIALS_ROTATED_AT?.trim() || "";
  const timestamp = raw ? Date.parse(raw) : Number.NaN;
  const configuredDays = Number.parseInt(env.SECURITY_CREDENTIAL_ROTATION_DAYS || "90", 10);
  const maxAgeDays = Number.isFinite(configuredDays)
    ? Math.min(Math.max(configuredDays, 30), 365)
    : 90;
  const ageDays = Number.isFinite(timestamp)
    ? Math.max(0, Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000)))
    : null;
  return {
    rotatedAtConfigured: Number.isFinite(timestamp),
    rotatedAt: Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null,
    ageDays,
    maxAgeDays,
    ready: ageDays !== null && ageDays <= maxAgeDays,
  };
}
