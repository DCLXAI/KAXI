import { getPrivacyRuntimeReadiness, validatePrivacySecret } from "../src/lib/privacy/config";

type CheckSeverity = "required" | "warning";
type EnvLike = Record<string, string | undefined>;

interface PrivacyEnvCheck {
  key: string;
  ok: boolean;
  severity: CheckSeverity;
  detail: string;
  metadata?: Record<string, unknown>;
}

interface ProductionPrivacyEnvReport {
  ok: boolean;
  checks: PrivacyEnvCheck[];
}

const RETENTION_DEFAULTS: Record<string, number> = {
  PRIVACY_CHATLOG_RETENTION_DAYS: 90,
  PRIVACY_PARTNER_REQUEST_RETENTION_DAYS: 180,
  PRIVACY_LEAD_RETENTION_DAYS: 365,
};

function isDirectRun(): boolean {
  return import.meta.path === Bun.main;
}

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function trimmed(value: string | undefined | null): string {
  return value?.trim() || "";
}

function check(
  key: string,
  ok: boolean,
  detail: string,
  metadata?: Record<string, unknown>,
  severity: CheckSeverity = "required"
): PrivacyEnvCheck {
  return { key, ok, detail, metadata, severity };
}

function parseRetentionDays(name: string, value: string | undefined): PrivacyEnvCheck {
  const raw = trimmed(value);
  if (!raw) {
    return check(
      name,
      true,
      `${name} is not set; runtime default ${RETENTION_DEFAULTS[name]} day(s) will be used.`,
      { configured: false, defaultDays: RETENTION_DEFAULTS[name] },
      "warning"
    );
  }

  const days = Number(raw);
  const ok = Number.isInteger(days) && days > 0 && days <= 3650;
  return check(
    name,
    ok,
    ok
      ? `${name} is configured with a positive retention window.`
      : `${name} must be an integer between 1 and 3650 days.`,
    { configured: true, days: Number.isFinite(days) ? days : null }
  );
}

export function getProductionPrivacyEnvReport(
  env: EnvLike = process.env
): ProductionPrivacyEnvReport {
  const productionEnv: NodeJS.ProcessEnv = {
    ...env,
    NODE_ENV: "production",
    VERCEL_ENV: "production",
  } as NodeJS.ProcessEnv;
  const privacy = getPrivacyRuntimeReadiness(productionEnv);
  const cronSecret = validatePrivacySecret(productionEnv.CRON_SECRET);

  const checks: PrivacyEnvCheck[] = [
    check(
      "DATA_ENCRYPTION_KEY",
      privacy.dataEncryptionKey.strong,
      privacy.dataEncryptionKey.strong
        ? "DATA_ENCRYPTION_KEY is strong enough for AES-256-GCM PII encryption."
        : "DATA_ENCRYPTION_KEY must be a non-placeholder secret with at least 32 bytes of material.",
      {
        configured: privacy.dataEncryptionKey.configured,
        strong: privacy.dataEncryptionKey.strong,
        materialBytes: privacy.dataEncryptionKey.materialBytes,
        reason: privacy.dataEncryptionKey.reason,
      }
    ),
    check(
      "PII_HASH_SECRET",
      privacy.piiHashSecret.strong,
      privacy.piiHashSecret.strong
        ? "PII_HASH_SECRET is strong enough for deletion lookup hashes."
        : "PII_HASH_SECRET must be a non-placeholder secret with at least 32 bytes of material.",
      {
        configured: privacy.piiHashSecret.configured,
        strong: privacy.piiHashSecret.strong,
        materialBytes: privacy.piiHashSecret.materialBytes,
        reason: privacy.piiHashSecret.reason,
      }
    ),
    check(
      "PII_HASH_SECRET_SEPARATE",
      privacy.piiHashSecretSeparate,
      privacy.piiHashSecretSeparate
        ? "PII_HASH_SECRET is separate from DATA_ENCRYPTION_KEY."
        : "PII_HASH_SECRET must be configured and must not equal DATA_ENCRYPTION_KEY.",
      { separate: privacy.piiHashSecretSeparate }
    ),
    check(
      "PII_ALLOW_UNENCRYPTED_PLAINTEXT",
      privacy.plaintextOverrideOk,
      privacy.plaintextOverrideOk
        ? "PII_ALLOW_UNENCRYPTED_PLAINTEXT is not enabled under production semantics."
        : "PII_ALLOW_UNENCRYPTED_PLAINTEXT=true is forbidden in production.",
      { unencryptedPlaintextAllowed: privacy.unencryptedPlaintextAllowed }
    ),
    check(
      "CRON_SECRET",
      cronSecret.strong,
      cronSecret.strong
        ? "CRON_SECRET is strong enough for retention and knowledge monitor cron authentication."
        : "CRON_SECRET must be a non-placeholder secret with at least 32 bytes of material.",
      {
        configured: cronSecret.configured,
        strong: cronSecret.strong,
        materialBytes: cronSecret.materialBytes,
        reason: cronSecret.reason,
      }
    ),
    ...Object.entries(RETENTION_DEFAULTS).map(([name]) => parseRetentionDays(name, productionEnv[name])),
  ];

  return {
    ok: checks.every((item) => item.ok || item.severity === "warning"),
    checks,
  };
}

if (isDirectRun()) {
  const report = getProductionPrivacyEnvReport();

  for (const item of report.checks) {
    const status = item.ok ? "PASS" : item.severity === "warning" ? "WARN" : "FAIL";
    console.log(`${status} ${item.key}: ${item.detail}`);
    if (item.metadata) console.log(`  ${JSON.stringify(item.metadata)}`);
  }

  if (!report.ok) {
    fail("production privacy environment is not ready");
  }

  console.log("PASS production privacy environment check");
}
