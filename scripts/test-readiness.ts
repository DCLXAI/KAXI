import { getReadinessPayload } from "../src/lib/ops/readiness";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function restoreEnv(snapshot: NodeJS.ProcessEnv) {
  for (const key of Object.keys(process.env)) {
    if (!(key in snapshot)) delete process.env[key];
  }
  Object.assign(process.env, snapshot);
}

async function testProductionReadinessFlagsMissingOpsConfig() {
  const snapshot = { ...process.env };
  try {
    Object.assign(process.env, {
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      VERCEL: "1",
      DATABASE_URL: "file:./db/custom.db",
      RATE_LIMIT_BACKEND: "auto",
    });
    delete process.env.DATA_ENCRYPTION_KEY;
    delete process.env.PII_HASH_SECRET;
    delete process.env.CRON_SECRET;
    delete process.env.ADMIN_MFA_TOTP_SECRET;
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.ADMIN_PASSWORD_HASH = "scrypt:salt:hash";
    process.env.ADMIN_PASSWORD = "";
    process.env.ADMIN_ROLE = "owner";
    process.env.NEXTAUTH_SECRET = "test-secret";

    const payload = await getReadinessPayload();
    if (payload.status !== "degraded" || !payload.production) {
      fail(`production file DB should be degraded: ${JSON.stringify(payload)}`);
    }

    const byKey = new Map(payload.checks.map((item) => [item.key, item]));
    for (const key of [
      "rag.review_after",
      "schools.source_metadata",
      "database.managed_writable",
      "privacy.encryption",
      "privacy.retention",
      "rate_limit.shared",
      "admin.session_hash",
      "admin.mfa_role",
      "admin.audit_log",
    ]) {
      if (!byKey.has(key)) fail(`missing readiness check: ${key}`);
    }

    if (byKey.get("database.managed_writable")?.ok) fail("file SQLite should not pass managed DB check");
    if (byKey.get("privacy.encryption")?.ok) fail("missing PII secrets should not pass encryption check");
    if (byKey.get("admin.mfa_role")?.ok) fail("missing MFA should not pass admin MFA check");
  } finally {
    restoreEnv(snapshot);
  }
}

await testProductionReadinessFlagsMissingOpsConfig();
console.log("PASS readiness guards");
