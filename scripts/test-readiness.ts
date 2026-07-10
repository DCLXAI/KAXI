import { createHmac } from "crypto";
import { NextRequest } from "next/server";
import { prepareTestDb } from "./prepare-test-db";

prepareTestDb("readiness guards");

const { getReadinessPayload } = await import("../src/lib/ops/readiness");
const { getRuntimeDatabaseInfo } = await import("../src/lib/db");
const { shouldUsePgvector } = await import("../src/lib/embeddings/pgvector-rag");
const { rateLimit } = await import("../src/lib/api/security");
const { KNOWLEDGE_DOCS } = await import("../src/lib/data/knowledge");
const { canUseSchoolSeedFallback } = await import("../src/lib/schools/repository");
const { sendOpsAlert } = await import("../src/lib/ops/alerts");
const { summarizeRagSystemHealth } = await import("../src/lib/ops/rag-system-health");
const {
  getConfiguredAdminRole,
  isAdminLoginConfigurationReady,
  isSecureAdminAuthRequired,
  verifyAdminMfa,
  verifyAdminPassword,
} = await import("../src/lib/auth/password");

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
      DATABASE_URL: "https://not-a-postgres-database.example",
      RATE_LIMIT_BACKEND: "auto",
      AI_PROVIDER: "kimi",
      OPENAI_API_KEY: "",
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
      fail(`production non-Postgres DB should be degraded: ${JSON.stringify(payload)}`);
    }

    const byKey = new Map(payload.checks.map((item) => [item.key, item]));
    for (const key of [
      "rag.gateway_security",
      "typebot.public_endpoint",
      "typebot.gateway_auth",
      "chat.attachments_storage",
      "chat.attachment_ocr_provider",
      "chat.attachment_malware_scanner",
      "rag.review_after",
      "schools.source_metadata",
      "database.postgresql_operational",
      "database.managed_writable",
      "database.schema_parity",
      "privacy.encryption",
      "privacy.plaintext_override",
      "privacy.retention",
      "documents.upload_workspace",
      "embeddings.cache",
      "ai.backend_policy",
      "rate_limit.shared",
      "admin.session_hash",
      "admin.mfa_role",
      "admin.audit_log",
    ]) {
      if (!byKey.has(key)) fail(`missing readiness check: ${key}`);
    }

    if (byKey.get("database.postgresql_operational")?.ok) fail("non-Postgres DB should not pass PostgreSQL operational check");
    if (byKey.get("database.managed_writable")?.ok) fail("non-Postgres DB should not pass managed DB check");
    if (byKey.get("database.schema_parity")?.ok) fail("non-Postgres DB should not pass schema parity check");
    if (byKey.get("privacy.encryption")?.ok) fail("missing PII secrets should not pass encryption check");
    if (!byKey.get("privacy.plaintext_override")?.ok) fail("missing plaintext override should pass plaintext override check");
    if (byKey.get("documents.upload_workspace")?.ok) fail("hosted local document storage should not pass upload workspace check");
    if (byKey.get("chat.attachment_ocr_provider")?.ok) fail("missing image OCR provider should not pass production readiness");
    if (byKey.get("chat.attachment_ocr_provider")?.severity !== "required") {
      fail("image OCR provider should be required in production while image uploads are enabled");
    }
    const attachmentScanner = byKey.get("chat.attachment_malware_scanner");
    if (!attachmentScanner?.ok || attachmentScanner.severity !== "warning") {
      fail(`disabled production attachments should be a passing warning: ${JSON.stringify(attachmentScanner)}`);
    }
    if (attachmentScanner.metadata?.uploadsEnabled !== false) {
      fail(`production attachment uploads should remain disabled without a scanner: ${JSON.stringify(attachmentScanner)}`);
    }
    if (byKey.get("admin.mfa_role")?.ok) fail("missing MFA should not pass admin MFA check");
    if (byKey.get("embeddings.cache")?.severity !== "warning") {
      fail(`embedding cache readiness should be warning severity: ${JSON.stringify(byKey.get("embeddings.cache"))}`);
    }
    if (!byKey.get("ai.backend_policy")?.metadata) {
      fail(`AI backend readiness should expose safe backend metadata: ${JSON.stringify(byKey.get("ai.backend_policy"))}`);
    }
    const embeddingSerialized = JSON.stringify(byKey.get("embeddings.cache"));
    if (embeddingSerialized.includes(process.cwd()) || (process.env.HOME && embeddingSerialized.includes(process.env.HOME))) {
      fail(`embedding readiness metadata should not expose absolute local paths: ${embeddingSerialized}`);
    }
    const schoolMetadata = byKey.get("schools.source_metadata")?.metadata;
    if (schoolMetadata?.source === "seed" || schoolMetadata?.fallbackAllowed !== false) {
      fail(`production readiness must not allow seed school fallback: ${JSON.stringify(schoolMetadata)}`);
    }
  } finally {
    restoreEnv(snapshot);
  }
}

async function testImageOcrReadiness() {
  const snapshot = { ...process.env };
  try {
    Object.assign(process.env, {
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      VERCEL: "1",
      AI_PROVIDER: "kimi",
      OPENAI_API_KEY: "kimi-production-key",
      OPENAI_BASE_URL: "https://api.moonshot.ai/v1",
      OPENAI_MODEL: "kimi-k2.6",
    });
    const payload = await getReadinessPayload();
    const check = payload.checks.find((item) => item.key === "chat.attachment_ocr_provider");
    if (!check?.ok || check.severity !== "required") {
      fail(`configured image OCR provider should pass production readiness: ${JSON.stringify(check)}`);
    }
  } finally {
    restoreEnv(snapshot);
  }
}

async function testProductionReadinessRejectsWeakPrivacyConfig() {
  const snapshot = { ...process.env };
  try {
    Object.assign(process.env, {
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      VERCEL: "1",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/kaxi",
      DATA_ENCRYPTION_KEY: "short",
      PII_HASH_SECRET: "short",
      PII_ALLOW_UNENCRYPTED_PLAINTEXT: " true ",
      RATE_LIMIT_BACKEND: "auto",
    });

    let payload = await getReadinessPayload();
    let byKey = new Map(payload.checks.map((item) => [item.key, item]));
    const weakPrivacy = byKey.get("privacy.encryption");
    const plaintextOverride = byKey.get("privacy.plaintext_override");

    if (!weakPrivacy || weakPrivacy.ok) {
      fail(`weak PII secrets should fail readiness: ${JSON.stringify(weakPrivacy)}`);
    }
    if (weakPrivacy.metadata?.dataEncryptionKeyStrong !== false || weakPrivacy.metadata?.piiHashSecretStrong !== false) {
      fail(`weak PII metadata should report strength failure: ${JSON.stringify(weakPrivacy)}`);
    }
    if (!plaintextOverride || plaintextOverride.ok) {
      fail(`production plaintext override should fail readiness: ${JSON.stringify(plaintextOverride)}`);
    }

    process.env.DATA_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    process.env.PII_HASH_SECRET = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
    process.env.PII_ALLOW_UNENCRYPTED_PLAINTEXT = "false";

    payload = await getReadinessPayload();
    byKey = new Map(payload.checks.map((item) => [item.key, item]));
    const strongPrivacy = byKey.get("privacy.encryption");
    const closedPlaintextOverride = byKey.get("privacy.plaintext_override");

    if (!strongPrivacy?.ok) {
      fail(`strong, separate PII secrets should pass privacy check: ${JSON.stringify(strongPrivacy)}`);
    }
    if (!closedPlaintextOverride?.ok) {
      fail(`disabled plaintext override should pass privacy check: ${JSON.stringify(closedPlaintextOverride)}`);
    }
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

    const postgres = getRuntimeDatabaseInfo();
    if (
      postgres.kind !== "postgresql" ||
      !postgres.postgresqlConfigured ||
      !postgres.writable ||
      !postgres.sharedWritable ||
      postgres.activePrismaProvider !== "postgresql"
    ) {
      fail(`postgres URL should be detected as PostgreSQL writable runtime: ${JSON.stringify(postgres)}`);
    }

    const localDevelopment = getRuntimeDatabaseInfo({
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:5433/kaxi",
    } as NodeJS.ProcessEnv);
    if (!localDevelopment.writable || localDevelopment.sharedWritable) {
      fail(`loopback PostgreSQL should be local-writable but not shared: ${JSON.stringify(localDevelopment)}`);
    }
    const hostedLoopback = getRuntimeDatabaseInfo({
      NODE_ENV: "production",
      VERCEL: "1",
      VERCEL_ENV: "production",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5433/kaxi",
    } as NodeJS.ProcessEnv);
    if (hostedLoopback.writable || hostedLoopback.sharedWritable) {
      fail(`hosted loopback PostgreSQL must fail closed: ${JSON.stringify(hostedLoopback)}`);
    }

    process.env.DATABASE_URL = "https://not-a-postgres-database.example";
    delete process.env.POSTGRES_URL;
    process.env.SUPABASE_DATABASE_URL = "postgresql://postgres:password@db.example.supabase.co:5432/postgres";
    const supabase = getRuntimeDatabaseInfo();
    if (
      supabase.kind !== "postgresql" ||
      supabase.source !== "SUPABASE_DATABASE_URL" ||
      !supabase.sharedWritable ||
      supabase.activePrismaProvider !== "postgresql" ||
      !shouldUsePgvector()
    ) {
      fail(`Supabase database URL should enable PostgreSQL/pgvector runtime: ${JSON.stringify(supabase)}`);
    }

    process.env.SUPABASE_DATABASE_URL = "";
    process.env.SUPABASE_POOLER_URL = "postgresql://postgres.example:password@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres";
    const supabasePooler = getRuntimeDatabaseInfo();
    if (
      supabasePooler.kind !== "postgresql" ||
      supabasePooler.source !== "SUPABASE_POOLER_URL" ||
      !supabasePooler.postgresqlConfigured ||
      !shouldUsePgvector()
    ) {
      fail(`Supabase pooler URL should enable PostgreSQL/pgvector runtime: ${JSON.stringify(supabasePooler)}`);
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
      DATABASE_URL: "https://not-a-postgres-database.example",
      RATE_LIMIT_BACKEND: "auto",
    });

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

function testSchoolSeedFallbackIsLocalOnly() {
  if (!canUseSchoolSeedFallback({ NODE_ENV: "development" } as NodeJS.ProcessEnv)) {
    fail("school seed fallback should be available in local development");
  }

  for (const env of [
    { NODE_ENV: "production" },
    { VERCEL: "1" },
    { VERCEL_ENV: "preview" },
  ]) {
    if (canUseSchoolSeedFallback(env as NodeJS.ProcessEnv)) {
      fail(`school seed fallback must be disabled for hosted/production env: ${JSON.stringify(env)}`);
    }
  }
}

function sha256AdminHash(password: string): string {
  return `sha256:${createHmac("sha256", process.env.ADMIN_PASSWORD_PEPPER || "kaxi-admin")
    .update(password)
    .digest("hex")}`;
}

function testProductionAdminAuthFailsClosed() {
  const snapshot = { ...process.env };
  try {
    Object.assign(process.env, {
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      VERCEL: "1",
      NEXTAUTH_SECRET: "test-nextauth-secret",
      ADMIN_EMAIL: "admin@example.com",
      ADMIN_ROLE: "owner",
      ADMIN_PASSWORD: "plain-password",
      ADMIN_PASSWORD_HASH: "",
      ADMIN_MFA_TOTP_SECRET: "JBSWY3DPEHPK3PXP",
    });

    if (!isSecureAdminAuthRequired()) fail("production admin auth should require secure mode");
    if (isAdminLoginConfigurationReady()) fail("production plaintext ADMIN_PASSWORD should not be login-ready");
    if (verifyAdminPassword("plain-password")) fail("production plaintext ADMIN_PASSWORD should not verify");

    process.env.ADMIN_PASSWORD = "";
    process.env.ADMIN_PASSWORD_HASH = sha256AdminHash("plain-password");
    delete process.env.ADMIN_MFA_TOTP_SECRET;
    if (isAdminLoginConfigurationReady()) fail("production admin login should require MFA secret");
    if (verifyAdminMfa(undefined)) fail("production admin MFA should fail without a secret");

    process.env.ADMIN_PASSWORD_HASH = "scrypt:replace-with-generated-salt:replace-with-generated-hash";
    process.env.ADMIN_MFA_TOTP_SECRET = "JBSWY3DPEHPK3PXP";
    if (isAdminLoginConfigurationReady()) fail("production placeholder admin hash should not be login-ready");

    process.env.ADMIN_PASSWORD_HASH = sha256AdminHash("plain-password");
    process.env.ADMIN_MFA_TOTP_SECRET = "JBSWY3DPEHPK3PXP";
    if (!isAdminLoginConfigurationReady()) fail("production hashed password + MFA should be login-ready");
    if (!verifyAdminPassword("plain-password")) fail("production ADMIN_PASSWORD_HASH should verify");

    process.env.ADMIN_ROLE = "superuser";
    if (getConfiguredAdminRole()) fail("production invalid admin role should not resolve");
    if (isAdminLoginConfigurationReady()) fail("production invalid admin role should not be login-ready");
  } finally {
    restoreEnv(snapshot);
  }
}

function testLocalAdminPasswordFallbackStillWorks() {
  const snapshot = { ...process.env };
  try {
    Object.assign(process.env, {
      NODE_ENV: "development",
      ADMIN_EMAIL: "admin@example.com",
      ADMIN_PASSWORD: "local-password",
      ADMIN_PASSWORD_HASH: "scrypt:replace-with-generated-salt:replace-with-generated-hash",
      ADMIN_ROLE: "",
    });
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.ADMIN_MFA_TOTP_SECRET;

    if (isSecureAdminAuthRequired()) fail("local admin auth should not require secure mode");
    if (getConfiguredAdminRole() !== "owner") fail("local missing ADMIN_ROLE should default to owner");
    if (!isAdminLoginConfigurationReady()) fail("local plaintext ADMIN_PASSWORD should remain login-ready");
    if (!verifyAdminPassword("local-password")) fail("local plaintext ADMIN_PASSWORD should verify");
    if (!verifyAdminMfa(undefined)) fail("local admin MFA should be optional");
  } finally {
    restoreEnv(snapshot);
  }
}

async function testAuthSessionFailsClosedWhenAdminConfigMissing() {
  const snapshot = { ...process.env };
  try {
    Object.assign(process.env, {
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      VERCEL: "1",
      ADMIN_EMAIL: "",
      ADMIN_PASSWORD: "",
      ADMIN_PASSWORD_HASH: "",
      ADMIN_ROLE: "",
      ADMIN_MFA_TOTP_SECRET: "",
    });
    delete process.env.NEXTAUTH_SECRET;

    const route = await import("../src/app/api/auth/[...nextauth]/route");
    const res = await route.GET(
      new NextRequest("https://kaxi.local/api/auth/session"),
      {} as never
    );
    const body = await res.json();

    if (res.status !== 200 || Object.keys(body).length !== 0) {
      fail(`auth session should fail closed with empty session when admin config is missing: ${res.status} ${JSON.stringify(body)}`);
    }
  } finally {
    restoreEnv(snapshot);
  }
}

async function testOpsAlertDeliveryContract() {
  const baseEnv = { NODE_ENV: "test" } as NodeJS.ProcessEnv;
  const payload = {
    kind: "kaxi_ops_alert" as const,
    source: "readiness-test",
    severity: "error" as const,
    eventType: "test_failure",
    message: "Synthetic operations failure",
    occurredAt: "2026-07-10T00:00:00.000Z",
    details: { failedKey: "test" },
  };

  const skipped = await sendOpsAlert(payload, { env: baseEnv });
  if (skipped.skippedReason !== "not_configured") fail("missing ops alert URL should skip delivery");

  let capturedInit: RequestInit | undefined;
  const delivered = await sendOpsAlert(payload, {
    env: {
      NODE_ENV: "test",
      OPS_ALERT_WEBHOOK_URL: "https://ops.example.test/kaxi",
      OPS_ALERT_FORMAT: "json",
      OPS_ALERT_SIGNING_SECRET: "ops-alert-signing-secret-for-readiness-test",
    } as NodeJS.ProcessEnv,
    fetchImpl: async (_input, init) => {
      capturedInit = init;
      return new Response("accepted", { status: 202 });
    },
  });
  if (!delivered.sent || delivered.status !== 202) fail(`ops alert should report delivery: ${JSON.stringify(delivered)}`);
  const headers = new Headers(capturedInit?.headers);
  if (!headers.get("x-kaxi-signature")?.startsWith("sha256=")) fail("ops alert should sign configured JSON webhook bodies");
  const body = JSON.parse(String(capturedInit?.body));
  if (body.kind !== "kaxi_ops_alert" || body.eventType !== "test_failure") fail("ops alert should preserve the normalized event contract");

  const failedDelivery = await sendOpsAlert(payload, {
    env: { NODE_ENV: "test", OPS_ALERT_WEBHOOK_URL: "https://ops.example.test/kaxi" } as NodeJS.ProcessEnv,
    fetchImpl: async () => new Response("down", { status: 503 }),
  });
  if (failedDelivery.sent || failedDelivery.status !== 503) fail("ops alert HTTP failures must be observable without throwing");
}

function testRagSystemHealthSummary() {
  const healthyCheck = { key: "healthy", ok: true, required: true, detail: "ok", latencyMs: 1 };
  const warningCheck = { key: "queue", ok: false, required: false, detail: "stale", latencyMs: 2 };
  const requiredCheck = { key: "database", ok: false, required: true, detail: "down", latencyMs: 3 };

  const healthy = summarizeRagSystemHealth([healthyCheck]);
  if (healthy.status !== "healthy" || healthy.severity !== null || healthy.failed.length !== 0) {
    fail(`healthy RAG summary is incorrect: ${JSON.stringify(healthy)}`);
  }

  const warning = summarizeRagSystemHealth([healthyCheck, warningCheck]);
  if (warning.status !== "warning" || warning.severity !== "warning" || warning.warningFailed.length !== 1) {
    fail(`warning RAG summary is incorrect: ${JSON.stringify(warning)}`);
  }

  const degraded = summarizeRagSystemHealth([healthyCheck, warningCheck, requiredCheck]);
  if (degraded.status !== "degraded" || degraded.severity !== "error" || degraded.requiredFailed.length !== 1) {
    fail(`degraded RAG summary is incorrect: ${JSON.stringify(degraded)}`);
  }
}

await testProductionReadinessFlagsMissingOpsConfig();
await testImageOcrReadiness();
await testProductionReadinessRejectsWeakPrivacyConfig();
testDatabaseRuntimeInfo();
await testProductionRateLimitFailsClosedWithoutSharedBackend();
await testReadinessFailsMissingRagMetadata();
testSchoolSeedFallbackIsLocalOnly();
testProductionAdminAuthFailsClosed();
testLocalAdminPasswordFallbackStillWorks();
await testAuthSessionFailsClosedWhenAdminConfigMissing();
await testOpsAlertDeliveryContract();
testRagSystemHealthSummary();
console.log("PASS readiness guards");
