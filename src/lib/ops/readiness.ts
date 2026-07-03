import { checkRuntimeDatabaseConnectivity, getRuntimeDatabaseInfo } from "@/lib/db";
import { getKnowledgeSourceAudit } from "@/lib/data/knowledge";
import { getDocumentUploadSigningSecret } from "@/lib/documents/crypto";
import { getDocumentStorageInfo } from "@/lib/documents/storage";
import { getPrivacyRuntimeReadiness } from "@/lib/privacy/config";
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
  const databaseInfo = getRuntimeDatabaseInfo(env);
  const databaseConnectivity = await checkRuntimeDatabaseConnectivity();
  const documentStorage = getDocumentStorageInfo(env);
  const documentSigningConfigured = Boolean(getDocumentUploadSigningSecret(env));
  const rateLimitBackend = (env.RATE_LIMIT_BACKEND || "auto").trim().toLowerCase();
  const sourceAudit = getKnowledgeSourceAudit();
  const schoolAudit = await getSchoolSourceAudit();
  const privacyReadiness = getPrivacyRuntimeReadiness(env);

  const managedDatabase = databaseInfo.sharedWritable && databaseConnectivity.ok;
  const postgresqlOperationalUrl = databaseInfo.kind === "postgresql" && databaseInfo.postgresqlConfigured;
  const sharedRateLimit =
    managedDatabase && (rateLimitBackend === "auto" || rateLimitBackend === "database");
  const documentUploadWorkspaceReady = production
    ? documentStorage.writable && documentStorage.durable && documentSigningConfigured
    : documentStorage.writable && documentSigningConfigured;
  const ragReviewReady =
    sourceAudit.missingMetadata.length === 0 &&
    sourceAudit.expiredDocs.length === 0 &&
    sourceAudit.activeDocs > 0;
  const schoolMetadataReady =
    schoolAudit.active > 0 &&
    schoolAudit.expired === 0 &&
    schoolAudit.missingSource === 0 &&
    (!production || schoolAudit.source === "db");

  const checks: ReadinessCheck[] = [
    check(
      "rag.review_after",
      "RAG review freshness",
      ragReviewReady,
      sourceAudit.missingMetadata.length > 0
        ? `RAG sources missing metadata: ${sourceAudit.missingMetadata.join(", ")}`
        : sourceAudit.expiredDocs.length === 0
        ? "All active RAG sources are within reviewAfter."
        : `Expired RAG docs: ${sourceAudit.expiredDocs.map((doc) => doc.id).join(", ")}`,
      {
        activeDocs: sourceAudit.activeDocs,
        totalDocs: sourceAudit.totalDocs,
        expiredDocs: sourceAudit.expiredDocs.length,
        missingMetadata: sourceAudit.missingMetadata.length,
      }
    ),
    check(
      "schools.source_metadata",
      "School source metadata",
      schoolMetadataReady,
      schoolMetadataReady
        ? "School rows include sourceUrl, verifiedAt, and current reviewAfter."
        : production && schoolAudit.source !== "db"
          ? "Production must serve school metadata from the operational School table, not seed fallback."
          : "Some school rows are expired or missing source metadata.",
      schoolAudit
    ),
    check(
      "database.postgresql_operational",
      "PostgreSQL operational database target",
      production ? postgresqlOperationalUrl : true,
      postgresqlOperationalUrl
        ? "DATABASE_URL is configured with a PostgreSQL URL for the operational database target."
        : production
          ? "Production must target PostgreSQL for the operational database; bundled SQLite/libSQL is only a transition/demo path."
          : "Local development may still use SQLite-compatible artifacts while PostgreSQL cutover is prepared.",
      {
        databaseUrlKind: databaseInfo.kind,
        databaseUrlSource: databaseInfo.source,
        postgresqlConfigured: databaseInfo.postgresqlConfigured,
        activePrismaProvider: databaseInfo.activePrismaProvider,
      }
    ),
    check(
      "database.managed_writable",
      "Managed writable database",
      production ? managedDatabase : databaseInfo.writable,
      managedDatabase
        ? "A shared managed runtime database is writable and reachable."
        : production
          ? "Production writes require a reachable managed operational database; bundled file SQLite is read-only/demo only."
          : databaseInfo.reason,
      {
        databaseUrlKind: databaseInfo.kind,
        databaseUrlSource: databaseInfo.source,
        writableDatabase: databaseInfo.writable,
        sharedWritableDatabase: databaseInfo.sharedWritable,
        libSqlAuthConfigured: databaseInfo.libSqlAuthConfigured,
        postgresqlConfigured: databaseInfo.postgresqlConfigured,
        activePrismaProvider: databaseInfo.activePrismaProvider,
        connectivity: databaseConnectivity.ok,
      }
    ),
    check(
      "privacy.encryption",
      "PII encryption and lookup secrets",
      privacyReadiness.encryptionOk,
      privacyReadiness.encryptionOk
        ? "DATA_ENCRYPTION_KEY and PII_HASH_SECRET are strong, non-placeholder, and separate."
        : "DATA_ENCRYPTION_KEY and PII_HASH_SECRET must be strong, non-placeholder, and separate before production writes.",
      privacyReadiness.metadata
    ),
    check(
      "privacy.plaintext_override",
      "PII plaintext override",
      privacyReadiness.plaintextOverrideOk,
      privacyReadiness.plaintextOverrideOk
        ? "PII_ALLOW_UNENCRYPTED_PLAINTEXT is not enabled in production."
        : "PII_ALLOW_UNENCRYPTED_PLAINTEXT must not be enabled in production.",
      {
        production,
        unencryptedPlaintextAllowed: privacyReadiness.unencryptedPlaintextAllowed,
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
      "documents.upload_workspace",
      "Document upload workspace",
      documentUploadWorkspaceReady,
      documentUploadWorkspaceReady
        ? "Document uploads have signing and writable byte storage."
        : production
          ? "Production document uploads require signing plus durable object storage such as Vercel Blob."
          : documentStorage.reason,
      {
        storageKind: documentStorage.kind,
        storageWritable: documentStorage.writable,
        storageDurable: documentStorage.durable,
        blobTokenConfigured: documentStorage.blobTokenConfigured,
        uploadSigningConfigured: documentSigningConfigured,
      }
    ),
    check(
      "rate_limit.shared",
      "Shared rate limit backend",
      production ? sharedRateLimit : rateLimitBackend !== "memory",
      sharedRateLimit
        ? "Rate limits can use the shared RateLimitBucket table."
        : "Production rate limits require RATE_LIMIT_BACKEND=database or auto with a reachable managed DB.",
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
      production ? managedDatabase : databaseInfo.writable,
      "Admin and privacy audit logs require writable database persistence.",
      { writableDatabase: databaseInfo.writable, managedDatabase }
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
