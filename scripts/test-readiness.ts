import { getReadinessPayload } from "../src/lib/ops/readiness";
import { getRuntimeDatabaseInfo } from "../src/lib/db";
import { NextRequest } from "next/server";
import { rateLimit } from "../src/lib/api/security";
import { KNOWLEDGE_DOCS } from "../src/lib/data/knowledge";

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
    delete process.env.TURSO_DATABASE_URL;
    delete process.env.TURSO_AUTH_TOKEN;
    delete process.env.DATABASE_AUTH_TOKEN;
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

function testDatabaseRuntimeInfo() {
  const snapshot = { ...process.env };
  try {
    Object.assign(process.env, {
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      VERCEL: "1",
      DATABASE_URL: "postgresql://example.invalid/kaxi",
    });
    delete process.env.TURSO_DATABASE_URL;
    delete process.env.TURSO_AUTH_TOKEN;

    const unsupported = getRuntimeDatabaseInfo();
    if (unsupported.kind !== "unsupported-managed" || unsupported.writable) {
      fail(`postgres URL should not pass sqlite-provider runtime check: ${JSON.stringify(unsupported)}`);
    }

    process.env.TURSO_DATABASE_URL = "libsql://kaxi-example.turso.io";
    process.env.TURSO_AUTH_TOKEN = "test-token";
    const libsql = getRuntimeDatabaseInfo();
    if (libsql.kind !== "libsql" || !libsql.sharedWritable || !libsql.libSqlAuthConfigured) {
      fail(`libSQL config should be recognized as shared writable: ${JSON.stringify(libsql)}`);
    }
  } finally {
    restoreEnv(snapshot);
  }
}

async function testProductionRateLimitFailsClosedWithoutSharedBackend() {
  const snapshot = { ...process.env };
  try {
    Object.assign(process.env, {
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      VERCEL: "1",
      DATABASE_URL: "file:./db/custom.db",
      RATE_LIMIT_BACKEND: "auto",
    });
    delete process.env.TURSO_DATABASE_URL;
    delete process.env.TURSO_AUTH_TOKEN;
    delete process.env.DATABASE_AUTH_TOKEN;

    const req = new NextRequest("https://kaxi.local/api/guard", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    });
    const res = await rateLimit(req, { key: "readiness:guard", limit: 1, windowMs: 60_000 });
    if (!res || res.status !== 503) {
      fail(`production rate limit without shared backend should fail closed, got ${res?.status || "pass"}`);
    }

    const disabled = await rateLimit(req, { key: "readiness:disabled", limit: 0, windowMs: 60_000 });
    if (disabled) {
      fail(`disabled production rate limit should pass, got ${disabled.status}`);
    }
  } finally {
    restoreEnv(snapshot);
  }
}

async function testReadinessFailsMissingRagMetadata() {
  const missingSourceDoc = {
    id: "__readiness_missing_source__",
    category: "warning" as const,
    title: { ko: "누락 출처", vi: "Missing source", mn: "Missing source", en: "Missing source" },
    keywords: ["missing-source"],
    content: {
      ko: "출처 메타데이터가 없는 문서는 readiness를 통과하면 안 됩니다.",
      vi: "Documents without source metadata must not pass readiness.",
      mn: "Documents without source metadata must not pass readiness.",
      en: "Documents without source metadata must not pass readiness.",
    },
    source: "__unregistered_readiness_source__",
  };
  KNOWLEDGE_DOCS.push(missingSourceDoc);
  try {
    const payload = await getReadinessPayload();
    const rag = payload.checks.find((item) => item.key === "rag.review_after");
    if (!rag || rag.ok || rag.metadata?.missingMetadata !== 1) {
      fail(`missing RAG source metadata should fail readiness: ${JSON.stringify(rag)}`);
    }
  } finally {
    KNOWLEDGE_DOCS.pop();
  }
}

await testProductionReadinessFlagsMissingOpsConfig();
testDatabaseRuntimeInfo();
await testProductionRateLimitFailsClosedWithoutSharedBackend();
await testReadinessFailsMissingRagMetadata();
console.log("PASS readiness guards");
