import { checkRuntimeDatabaseConnectivity, db, getRuntimeDatabaseInfo } from "@/lib/db";
import { getAiBackendDiagnostics } from "@/lib/ai/backend-selector";
import { getKnowledgeSourceAudit } from "@/lib/data/knowledge";
import { getDocumentUploadSigningSecret } from "@/lib/documents/crypto";
import { getDocumentStorageInfo } from "@/lib/documents/storage";
import { getPgvectorStats } from "@/lib/embeddings/pgvector-rag";
import { getStoreStats } from "@/lib/embeddings/vector-store";
import { getPrivacyRuntimeReadiness } from "@/lib/privacy/config";
import { getSchoolSourceAudit } from "@/lib/schools/repository";
import { isTypebotGatewayAuthConfigured } from "@/lib/typebot/gateway-auth";
import { checkProductionSchemaParity } from "@/lib/ops/schema-parity";
import { getChatAttachmentSecurityDiagnostics } from "@/lib/chat/attachment-security";

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

function strongSecret(value: string | undefined) {
  const text = value?.trim() || "";
  return text.length >= 32 && !/^replace-with-/i.test(text);
}

function httpsUrl(value: string | undefined) {
  try {
    return new URL(value || "").protocol === "https:";
  } catch {
    return false;
  }
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

function schoolReadinessDetail({
  ready,
  production,
  source,
  active,
  missingSource,
}: {
  ready: boolean;
  production: boolean;
  source: string;
  active: number;
  missingSource: number;
}): string {
  if (ready) return "School rows include sourceUrl, verifiedAt, and current reviewAfter.";
  if (production && source !== "db") {
    return "Production must serve school metadata from the operational School table, not seed fallback.";
  }
  if (source === "db" && active === 0) {
    return "Operational School table has no active rows. Run db:seed:schools or review expired rows.";
  }
  if (missingSource > 0) {
    return "Some school rows are missing sourceUrl, verifiedAt, or reviewAfter metadata.";
  }
  return "Some school rows are expired or missing source metadata.";
}

export async function getReadinessPayload(): Promise<ReadinessPayload> {
  const env = process.env;
  const production = isProductionEnv(env);
  const databaseInfo = getRuntimeDatabaseInfo(env);
  const databaseConnectivity = await checkRuntimeDatabaseConnectivity();
  const schemaParity =
    databaseInfo.kind === "postgresql" && databaseConnectivity.ok
      ? await checkProductionSchemaParity()
      : {
          ok: false,
          latestMigration: null,
          missing: ["database_connection"],
          detail: "Schema parity requires a reachable PostgreSQL operational database.",
        };
  const documentStorage = getDocumentStorageInfo(env);
  const documentSigningConfigured = Boolean(getDocumentUploadSigningSecret(env));
  const rateLimitBackend = (env.RATE_LIMIT_BACKEND || "auto").trim().toLowerCase();
  const sourceAudit = getKnowledgeSourceAudit();
  const schoolAudit = await getSchoolSourceAudit();
  const privacyReadiness = getPrivacyRuntimeReadiness(env);
  const embeddingStats = getStoreStats();
  const pgvectorStats = await getPgvectorStats().catch((error) => ({
    error: error instanceof Error ? error.message.slice(0, 240) : String(error).slice(0, 240),
  }));
  const aiBackendDiagnostics = getAiBackendDiagnostics(env);
  const n8nUrlsReady = [
    env.N8N_TYPEBOT_RAG_WEBHOOK_URL,
    env.N8N_RAG_INGESTION_WEBHOOK_URL,
    env.N8N_TYPEBOT_HANDOFF_WEBHOOK_URL,
  ].every(httpsUrl);
  const chatGatewaySecurityReady = strongSecret(env.N8N_WEBHOOK_SIGNING_SECRET) && strongSecret(env.CHAT_SESSION_SIGNING_SECRET);
  const chatImageOcrReady = aiBackendDiagnostics.llm.apiKeyConfigured;
  const attachmentSecurity = getChatAttachmentSecurityDiagnostics(env);

  const managedDatabase = databaseInfo.sharedWritable && databaseConnectivity.ok;
  const linkedAdminCount = databaseConnectivity.ok
    ? await db.user.count({
        where: { role: "PLATFORM_ADMIN", authUserId: { not: null } },
      }).catch(() => 0)
    : 0;
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
      "rag.gateway_security",
      "RAG gateway signing and endpoints",
      n8nUrlsReady && chatGatewaySecurityReady,
      n8nUrlsReady && chatGatewaySecurityReady
        ? "All n8n entry points use HTTPS and KAXI owns strong webhook/session signing secrets."
        : "Configure all n8n HTTPS webhook URLs plus separate 32-byte webhook and chat-session signing secrets.",
      { n8nUrlsReady, webhookSigningReady: strongSecret(env.N8N_WEBHOOK_SIGNING_SECRET), chatSessionSigningReady: strongSecret(env.CHAT_SESSION_SIGNING_SECRET) },
    ),
    check(
      "typebot.public_endpoint",
      "Published Typebot endpoint",
      httpsUrl(env.TYPEBOT_PUBLIC_URL) && configured(env.TYPEBOT_PUBLIC_ID),
      "TYPEBOT_PUBLIC_URL and TYPEBOT_PUBLIC_ID identify the published customer flow for daily health checks.",
      { publicUrlConfigured: httpsUrl(env.TYPEBOT_PUBLIC_URL), publicIdConfigured: configured(env.TYPEBOT_PUBLIC_ID) },
    ),
    check(
      "typebot.gateway_auth",
      "Typebot gateway authentication",
      isTypebotGatewayAuthConfigured(env),
      isTypebotGatewayAuthConfigured(env)
        ? "Typebot server-side webhooks authenticate to the KAXI gateway with a separate strong secret."
        : "Configure a separate 32-byte TYPEBOT_GATEWAY_SECRET in KAXI and both Typebot webhook headers.",
      { gatewaySecretConfigured: isTypebotGatewayAuthConfigured(env) },
    ),
    check(
      "chat.attachments_storage",
      "Chat attachment private storage",
      configured(env.NEXT_PUBLIC_SUPABASE_URL) && configured(env.SUPABASE_SERVICE_ROLE_KEY) && configured(env.SUPABASE_CHAT_ATTACHMENTS_BUCKET || env.SUPABASE_STORAGE_BUCKET),
      "Chat attachment processing requires the Supabase service role and a private bucket.",
      { supabaseUrlConfigured: configured(env.NEXT_PUBLIC_SUPABASE_URL), serviceRoleConfigured: configured(env.SUPABASE_SERVICE_ROLE_KEY), bucketConfigured: configured(env.SUPABASE_CHAT_ATTACHMENTS_BUCKET || env.SUPABASE_STORAGE_BUCKET) },
    ),
    check(
      "chat.attachment_ocr_provider",
      "Chat image OCR provider",
      chatImageOcrReady,
      chatImageOcrReady
        ? `${aiBackendDiagnostics.llm.backend} vision is configured for JPEG, PNG, and WebP chat attachment extraction.`
        : "The selected managed LLM API key is required to process image attachments.",
      { provider: aiBackendDiagnostics.llm.backend, configured: chatImageOcrReady },
      production ? "required" : "warning"
    ),
    check(
      "chat.attachment_malware_scanner",
      "Chat attachment malware scanning",
      attachmentSecurity.ready,
      !attachmentSecurity.uploadsRequested
        ? "Chat attachment uploads are disabled until a managed malware scanner is configured and explicitly enabled."
        : attachmentSecurity.externalScannerConfigured
        ? "Managed malware scanning runs before private storage; images are also decoded and re-encoded, and active PDF content is rejected."
        : "The configured managed malware scanner is unavailable, so attachment uploads fail closed.",
      attachmentSecurity,
      attachmentSecurity.uploadsRequested && attachmentSecurity.externalScannerRequired ? "required" : "warning",
    ),
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
      schoolReadinessDetail({
        ready: schoolMetadataReady,
        production,
        source: schoolAudit.source,
        active: schoolAudit.active,
        missingSource: schoolAudit.missingSource,
      }),
      schoolAudit
    ),
    check(
      "database.postgresql_operational",
      "PostgreSQL operational database target",
      production ? postgresqlOperationalUrl : true,
      postgresqlOperationalUrl
        ? "DATABASE_URL is configured with a PostgreSQL URL for the operational database target."
        : production
          ? "Production must target Supabase/PostgreSQL for the operational database."
          : "Local development requires a Supabase/PostgreSQL database URL.",
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
          ? "Production writes require a reachable Supabase/PostgreSQL operational database."
          : databaseInfo.reason,
      {
        databaseUrlKind: databaseInfo.kind,
        databaseUrlSource: databaseInfo.source,
        writableDatabase: databaseInfo.writable,
        sharedWritableDatabase: databaseInfo.sharedWritable,
        postgresqlConfigured: databaseInfo.postgresqlConfigured,
        activePrismaProvider: databaseInfo.activePrismaProvider,
        connectivity: databaseConnectivity.ok,
      }
    ),
    check(
      "database.schema_parity",
      "Canonical database schema parity",
      schemaParity.ok,
      schemaParity.detail,
      {
        latestMigration: schemaParity.latestMigration,
        missing: schemaParity.missing,
      },
      production ? "required" : "warning",
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
      "embeddings.cache",
      "Embedding and vector index",
      "approvedEmbeddedChunks" in pgvectorStats
        ? pgvectorStats.approvedEmbeddedChunks > 0
        : !production || embeddingStats.vectorCache.exists || embeddingStats.transformerRuntime.cache.exists,
      "approvedEmbeddedChunks" in pgvectorStats && pgvectorStats.approvedEmbeddedChunks > 0
        ? "pgvector knowledge embeddings are present."
        : embeddingStats.vectorCache.exists
          ? "Vector embedding cache artifact is present."
          : production
            ? "Production RAG should have pgvector embeddings before serving grounded answers."
            : "Local development can rebuild pgvector/model cache artifacts on demand.",
      {
        pgvector: pgvectorStats,
        storeReady: embeddingStats.ready,
        method: embeddingStats.method,
        knowledgeSource: embeddingStats.knowledgeSource,
        transformerAvailable: embeddingStats.transformerAvailable,
        transformerCoverage: embeddingStats.transformerCoverage,
        vectorCache: embeddingStats.vectorCache,
        transformerRuntime: embeddingStats.transformerRuntime,
      },
      "warning"
    ),
    check(
      "ai.backend_policy",
      "AI backend policy",
      aiBackendDiagnostics.issues.length === 0,
      aiBackendDiagnostics.issues.length === 0
        ? "AI backend selection is observable and does not have strict blocking configuration issues."
        : aiBackendDiagnostics.issues.join(" "),
      {
        runtime: aiBackendDiagnostics.runtime,
        agent: aiBackendDiagnostics.agent,
        consult: aiBackendDiagnostics.consult,
        llm: aiBackendDiagnostics.llm,
        kimi: aiBackendDiagnostics.kimi,
        claude: aiBackendDiagnostics.claude,
        fallbackPolicy: aiBackendDiagnostics.fallbackPolicy,
        warningCount: aiBackendDiagnostics.warnings.length,
        issueCount: aiBackendDiagnostics.issues.length,
      },
      production && (aiBackendDiagnostics.agent.requireLlm || aiBackendDiagnostics.consult.requireLlm)
        ? "required"
        : "warning"
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
      "admin.supabase_auth",
      "Supabase admin authentication",
      configured(env.NEXT_PUBLIC_SUPABASE_URL) && configured(env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      "Admin sessions use Supabase Auth and server-side User.role authorization.",
      {
        supabaseUrlConfigured: configured(env.NEXT_PUBLIC_SUPABASE_URL),
        supabaseAnonKeyConfigured: configured(env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      }
    ),
    check(
      "admin.mfa_role",
      "Admin MFA and linked role",
      production ? linkedAdminCount > 0 : true,
      "Admin API access requires a linked PLATFORM_ADMIN user and a Supabase aal2 session.",
      {
        linkedAdminCount,
        aalRequired: "aal2",
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
