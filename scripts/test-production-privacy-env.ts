import { getProductionPrivacyEnvReport } from "./check-production-privacy-env";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string): void {
  if (!condition) fail(message);
}

function byKey(report: ReturnType<typeof getProductionPrivacyEnvReport>) {
  return new Map(report.checks.map((item) => [item.key, item]));
}

const strongDataKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const strongHashSecret = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
const strongCronSecret = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";

const missing = getProductionPrivacyEnvReport({});
let checks = byKey(missing);
assert(!missing.ok, "missing production privacy env should fail");
assert(checks.get("DATA_ENCRYPTION_KEY")?.ok === false, "missing DATA_ENCRYPTION_KEY should fail");
assert(checks.get("PII_HASH_SECRET")?.ok === false, "missing PII_HASH_SECRET should fail");
assert(checks.get("CRON_SECRET")?.ok === false, "missing CRON_SECRET should fail");

const weak = getProductionPrivacyEnvReport({
  DATA_ENCRYPTION_KEY: "short",
  PII_HASH_SECRET: "short",
  CRON_SECRET: "short",
  PII_ALLOW_UNENCRYPTED_PLAINTEXT: " true ",
});
checks = byKey(weak);
assert(!weak.ok, "weak production privacy env should fail");
assert(checks.get("PII_ALLOW_UNENCRYPTED_PLAINTEXT")?.ok === false, "plaintext override should fail");
assert(checks.get("PII_HASH_SECRET_SEPARATE")?.ok === false, "identical weak secrets should fail separation");

const invalidRetention = getProductionPrivacyEnvReport({
  DATA_ENCRYPTION_KEY: strongDataKey,
  PII_HASH_SECRET: strongHashSecret,
  CRON_SECRET: strongCronSecret,
  PII_ALLOW_UNENCRYPTED_PLAINTEXT: "false",
  PRIVACY_CHATLOG_RETENTION_DAYS: "0",
});
checks = byKey(invalidRetention);
assert(!invalidRetention.ok, "invalid retention window should fail");
assert(checks.get("PRIVACY_CHATLOG_RETENTION_DAYS")?.ok === false, "zero retention days should fail");

const strong = getProductionPrivacyEnvReport({
  DATA_ENCRYPTION_KEY: strongDataKey,
  PII_HASH_SECRET: strongHashSecret,
  CRON_SECRET: strongCronSecret,
  PII_ALLOW_UNENCRYPTED_PLAINTEXT: "false",
  PRIVACY_CHATLOG_RETENTION_DAYS: "90",
  PRIVACY_PARTNER_REQUEST_RETENTION_DAYS: "180",
  PRIVACY_LEAD_RETENTION_DAYS: "365",
});
checks = byKey(strong);
assert(strong.ok, `strong production privacy env should pass: ${JSON.stringify(strong)}`);
assert(checks.get("DATA_ENCRYPTION_KEY")?.metadata?.materialBytes === 32, "hex data key should report 32 bytes");
assert(checks.get("PII_HASH_SECRET_SEPARATE")?.ok === true, "separate strong secrets should pass");

const serialized = JSON.stringify(strong);
for (const secret of [strongDataKey, strongHashSecret, strongCronSecret]) {
  assert(!serialized.includes(secret), "privacy env report must not include secret material");
}

console.log("PASS production privacy env check");
