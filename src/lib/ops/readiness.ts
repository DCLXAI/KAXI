import { canWriteRuntimeDatabase } from "@/lib/db";
import { getKnowledgeSourceAudit } from "@/lib/data/knowledge";
import { getSchoolSourceAudit } from "@/lib/schools/repository";

export type ReadinessStatus = "ready" | "degraded";

export interface ReadinessCheck {
  key: string;
  label: string;
  ok: boolean;
  severity: "required" | "warning";
  detail: string;
  metadata?: Record<string, unknown>;
}

export interface ReadinessPayload {
  status: ReadinessStatus;
  environment: string;
  production: boolean;
  checkedAt: string;
  checks: ReadinessCheck[];
}

function isProductionEnv(env: NodeJS.ProcessEnv): boolean {
  return env.VERCEL_ENV === "production" || env.NODE_ENV === "production";
}

function databaseUrlKind(env: NodeJS.ProcessEnv): "missing" | "file" | "managed" {
  const databaseUrl = env.DATABASE_URL?.trim();
  if (!databaseUrl) return "missing";
  return databaseUrl.startsWith("file:") ? "file" : "managed";
}

function configured(value: string | undefined): boolean {
  const trimmed = value?.trim() || "";
  return Boolean(trimmed) && !/^replace-with-/i.test(trimmed);
}

function adminRoleValid(value: string | undefined): boolean {
  return value === "owner" || value === "admin" || value === "viewer";
}

function check(
  key: string,
  label: string,
  ok: boolean,
  detail: string,
  metadata?: Record<string, unknown>,
  severity: ReadinessCheck["severity"] = "required"
): ReadinessCheck {
  return { key, label, ok, detail, metadata, severity };
}

export async function getReadinessPayload(): Promise<ReadinessPayload> {
  const env = process.env;
  const production = isProductionEnv(env);
  const dbKind = databaseUrlKind(env);
  const writableDatabase = canWriteRuntimeDatabase();
  const rateLimitBackend = (env.RATE_LIMIT_BACKEND || "auto").trim().toLowerCase();
  const sourceAudit = getKnowledgeSourceAudit();
  const schoolAudit = await getSchoolSourceAudit();

  const managedDatabase = dbKind === "managed" && writableDatabase;
  const sharedRateLimit =
    managedDatabase && (rateLimitBackend === "auto" || rateLimitBackend === "database");

  const checks: ReadinessCheck[] = [
    check(
      "rag.review_after",
      "RAG review freshness",
      sourceAudit.expiredDocs.length === 0 && sourceAudit.activeDocs > 0,
      sourceAudit.expiredDocs.length === 0
        ? "All active RAG sources are within reviewAfter."
        : `Expired RAG docs: ${sourceAudit.expiredDocs.map((doc) => doc.id).join(", ")}`,
      {
        activeDocs: sourceAudit.activeDocs,
        totalDocs: sourceAudit.totalDocs,
        expiredDocs: sourceAudit.expiredDocs.length,
      }
    ),
    check(
      "schools.source_metadata",
      "School source metadata",
      schoolAudit.active > 0 && schoolAudit.expired === 0 && schoolAudit.missingSource === 0,
      schoolAudit.expired === 0 && schoolAudit.missingSource === 0
        ? "School rows include sourceUrl, verifiedAt, and current reviewAfter."
        : "Some school rows are expired or missing source metadata.",
      schoolAudit
    ),
    check(
      "database.managed_writable",
      "Managed writable database",
      production ? managedDatabase : writableDatabase,
      managedDatabase
        ? "DATABASE_URL points to a writable managed database."
        : production
          ? "Production must not rely on bundled file SQLite for writes."
          : "Local database is writable for development.",
      { databaseUrlKind: dbKind, writableDatabase }
    ),
    check(
      "privacy.encryption",
      "PII encryption and lookup secrets",
      configured(env.DATA_ENCRYPTION_KEY) && configured(env.PII_HASH_SECRET),
      "DATA_ENCRYPTION_KEY and PII_HASH_SECRET must be configured before production writes.",
      {
        dataEncryptionKeyConfigured: configured(env.DATA_ENCRYPTION_KEY),
        piiHashSecretConfigured: configured(env.PII_HASH_SECRET),
      }
    ),
    check(
      "privacy.retention",
      "Retention enforcement",
      configured(env.CRON_SECRET),
      "CRON_SECRET must be configured so scheduled retention enforcement can authenticate.",
      { cronSecretConfigured: configured(env.CRON_SECRET) }
    ),
    check(
      "rate_limit.shared",
      "Shared rate limit backend",
      production ? sharedRateLimit : rateLimitBackend !== "memory",
      sharedRateLimit
        ? "Rate limits can use the shared RateLimitBucket table."
        : "Production rate limits require RATE_LIMIT_BACKEND=database or auto with a managed writable DB.",
      { rateLimitBackend, managedDatabase }
    ),
    check(
      "admin.session_hash",
      "Admin hashed session login",
      configured(env.NEXTAUTH_SECRET) &&
        configured(env.ADMIN_EMAIL) &&
        configured(env.ADMIN_PASSWORD_HASH) &&
        !configured(env.ADMIN_PASSWORD),
      "Use NEXTAUTH_SECRET, ADMIN_EMAIL, and ADMIN_PASSWORD_HASH; do not use plaintext ADMIN_PASSWORD in production.",
      {
        nextAuthSecretConfigured: configured(env.NEXTAUTH_SECRET),
        adminEmailConfigured: configured(env.ADMIN_EMAIL),
        adminPasswordHashConfigured: configured(env.ADMIN_PASSWORD_HASH),
        plaintextAdminPasswordConfigured: configured(env.ADMIN_PASSWORD),
      }
    ),
    check(
      "admin.mfa_role",
      "Admin MFA and role",
      configured(env.ADMIN_MFA_TOTP_SECRET) && adminRoleValid(env.ADMIN_ROLE),
      "Production admin login should require TOTP MFA and a valid owner/admin/viewer role.",
      {
        mfaConfigured: configured(env.ADMIN_MFA_TOTP_SECRET),
        role: env.ADMIN_ROLE || null,
      }
    ),
    check(
      "admin.audit_log",
      "Admin audit persistence",
      production ? managedDatabase : writableDatabase,
      "Admin and privacy audit logs require writable database persistence.",
      { writableDatabase, managedDatabase }
    ),
  ];

  const requiredFailed = checks.some((item) => item.severity === "required" && !item.ok);

  return {
    status: requiredFailed ? "degraded" : "ready",
    environment: env.VERCEL_ENV || env.NODE_ENV || "development",
    production,
    checkedAt: new Date().toISOString(),
    checks,
  };
}
