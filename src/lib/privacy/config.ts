import { isEnvTrue } from "@/lib/env";

const MIN_SECRET_BYTES = 32;

export interface PrivacySecretValidation {
  configured: boolean;
  strong: boolean;
  materialBytes: number;
  reason: "missing" | "placeholder" | "too_short" | "ok";
}

export interface PrivacyRuntimeReadiness {
  production: boolean;
  dataEncryptionKey: PrivacySecretValidation;
  piiHashSecret: PrivacySecretValidation;
  piiHashSecretSeparate: boolean;
  unencryptedPlaintextAllowed: boolean;
  plaintextOverrideOk: boolean;
  encryptionOk: boolean;
  metadata: Record<string, unknown>;
}

function trimmed(value: string | undefined | null): string {
  return value?.trim() || "";
}

function looksLikePlaceholder(value: string): boolean {
  const lower = value.toLowerCase();
  return (
    /^replace-with-/i.test(value) ||
    lower === "changeme" ||
    lower === "change-me" ||
    lower === "placeholder" ||
    lower === "example" ||
    lower === "secret" ||
    lower.includes("kaxi-local") ||
    lower.includes("local-pii") ||
    lower.includes("demo-secret") ||
    lower.includes("test-secret")
  );
}

function decodedBase64Bytes(value: string): number | null {
  if (!/^[a-z0-9+/]+={0,2}$/i.test(value) || value.length % 4 !== 0) return null;
  const decoded = Buffer.from(value, "base64");
  const normalizedInput = value.replace(/=+$/, "");
  const normalizedOutput = decoded.toString("base64").replace(/=+$/, "");
  return normalizedInput === normalizedOutput ? decoded.length : null;
}

function estimateSecretBytes(value: string): number {
  if (/^[a-f0-9]{64}$/i.test(value)) return 32;
  return decodedBase64Bytes(value) ?? Buffer.byteLength(value, "utf8");
}

export function validatePrivacySecret(value: string | undefined | null): PrivacySecretValidation {
  const secret = trimmed(value);
  if (!secret) {
    return { configured: false, strong: false, materialBytes: 0, reason: "missing" };
  }

  const materialBytes = estimateSecretBytes(secret);
  if (looksLikePlaceholder(secret)) {
    return { configured: true, strong: false, materialBytes, reason: "placeholder" };
  }

  if (materialBytes < MIN_SECRET_BYTES) {
    return { configured: true, strong: false, materialBytes, reason: "too_short" };
  }

  return { configured: true, strong: true, materialBytes, reason: "ok" };
}

export function isProductionPrivacyEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.VERCEL_ENV === "production" || env.NODE_ENV === "production";
}

export function getPrivacyRuntimeReadiness(env: NodeJS.ProcessEnv = process.env): PrivacyRuntimeReadiness {
  const production = isProductionPrivacyEnv(env);
  const dataEncryptionKey = validatePrivacySecret(env.DATA_ENCRYPTION_KEY);
  const piiHashSecret = validatePrivacySecret(env.PII_HASH_SECRET);
  const dataSecret = trimmed(env.DATA_ENCRYPTION_KEY);
  const hashSecret = trimmed(env.PII_HASH_SECRET);
  const piiHashSecretSeparate = Boolean(dataSecret && hashSecret && dataSecret !== hashSecret);
  const unencryptedPlaintextAllowed = isEnvTrue(env.PII_ALLOW_UNENCRYPTED_PLAINTEXT);
  const plaintextOverrideOk = !production || !unencryptedPlaintextAllowed;
  const encryptionOk = dataEncryptionKey.strong && piiHashSecret.strong && piiHashSecretSeparate;

  return {
    production,
    dataEncryptionKey,
    piiHashSecret,
    piiHashSecretSeparate,
    unencryptedPlaintextAllowed,
    plaintextOverrideOk,
    encryptionOk,
    metadata: {
      dataEncryptionKeyConfigured: dataEncryptionKey.configured,
      dataEncryptionKeyStrong: dataEncryptionKey.strong,
      dataEncryptionKeyMaterialBytes: dataEncryptionKey.materialBytes,
      dataEncryptionKeyReason: dataEncryptionKey.reason,
      piiHashSecretConfigured: piiHashSecret.configured,
      piiHashSecretStrong: piiHashSecret.strong,
      piiHashSecretMaterialBytes: piiHashSecret.materialBytes,
      piiHashSecretReason: piiHashSecret.reason,
      piiHashSecretSeparate,
      unencryptedPlaintextAllowed,
      plaintextOverrideOk,
    },
  };
}
