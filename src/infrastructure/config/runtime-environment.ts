/**
 * Sole raw server-runtime environment boundary.
 *
 * Feature modules may parse values into their own typed configuration, but
 * they must obtain the raw source through this function so startup/readiness
 * and runtime consumers cannot silently drift to different environment maps.
 */
export type RuntimeEnvironment = NodeJS.ProcessEnv;

export interface RuntimeEnvironmentIssue {
  key: string;
  code: "invalid_positive_integer" | "invalid_boolean";
}

export function runtimeEnvironment(source: NodeJS.ProcessEnv = process.env): RuntimeEnvironment {
  return source;
}

/** Explicit mutation hooks for bootstrapping and test-database selection. */
export function setRuntimeEnvironmentValue(key: string, value: string): void {
  process.env[key] = value;
}

export function setRuntimeEnvironmentDefault(key: string, value: string): string {
  process.env[key] ||= value;
  return process.env[key]!;
}

export const RUNTIME_SECRET_KEYS = Object.freeze([
  "ADMIN_API_KEY",
  "ADMIN_API_KEY_PREVIOUS",
  "ANTHROPIC_API_KEY",
  "ATTACHMENT_MALWARE_SCAN_TOKEN",
  "BLOB_READ_WRITE_TOKEN",
  "CHAT_SESSION_SIGNING_SECRET",
  "CHAT_SESSION_SIGNING_SECRET_PREVIOUS",
  "CRON_SECRET",
  "CRON_SECRET_PREVIOUS",
  "DATA_ENCRYPTION_KEY",
  "DATABASE_URL",
  "DOCUMENT_UPLOAD_SIGNING_SECRET",
  "KNOWLEDGE_MONITOR_ALERT_SIGNING_SECRET",
  "KNOWLEDGE_MONITOR_ALERT_WEBHOOK_URL",
  "N8N_ERROR_REPORTING_SECRET",
  "N8N_RAG_INGESTION_WEBHOOK_URL",
  "N8N_TYPEBOT_HANDOFF_WEBHOOK_URL",
  "N8N_TYPEBOT_RAG_WEBHOOK_URL",
  "N8N_WEBHOOK_SIGNING_SECRET",
  "N8N_WEBHOOK_SIGNING_SECRET_PREVIOUS",
  "OPENAI_API_KEY",
  "OPENAI_EMBEDDING_API_KEY",
  "PII_HASH_SECRET",
  "POSTGRES_URL",
  "PRISMA_DATABASE_URL",
  "RESEND_API_KEY",
  "SMTP_PASS",
  "SUPABASE_DATABASE_URL",
  "SUPABASE_DIRECT_URL",
  "SUPABASE_POOLER_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "TENANT_CONTEXT_SIGNING_SECRET",
  "TEST_DATABASE_URL",
  "TYPEBOT_API_TOKEN",
  "TYPEBOT_GATEWAY_SECRET",
  "TYPEBOT_GATEWAY_SECRET_PREVIOUS",
  "OPS_ALERT_SIGNING_SECRET",
  "OPS_ALERT_SLACK_WEBHOOK_URL",
  "OPS_ALERT_WEBHOOK_URL",
] as const);

const POSITIVE_INTEGER_RUNTIME_KEYS = Object.freeze([
  "ADMIN_AUTH_FAILURE_RATE_LIMIT",
  "AI_AGENT_CONTEXT_MAX_CHARS",
  "AI_AGENT_DAILY_QUOTA",
  "AI_AGENT_GROUNDED_QUESTION_MAX_CHARS",
  "AI_AGENT_MAX_CHARS",
  "AI_AGENT_PREFLIGHT_TIMEOUT_MS",
  "AI_AGENT_RATE_LIMIT",
  "AI_AGENT_REQUEST_DEADLINE_MS",
  "AI_AGENT_TIMEOUT_MS",
  "AI_CHAT_DAILY_QUOTA",
  "AI_CHAT_MAX_CHARS",
  "AI_CHAT_RATE_LIMIT",
  "AI_CONSULT_DAILY_QUOTA",
  "AI_CONSULT_MAX_CHARS",
  "AI_CONSULT_RATE_LIMIT",
  "AI_CONSULT_REQUEST_DEADLINE_MS",
  "AI_EMBEDDING_INIT_TIMEOUT_MS",
  "AI_LLM_TIMEOUT_MS",
  "AI_UNIFIED_REQUEST_DEADLINE_MS",
  "AUTH_OTP_RATE_LIMIT",
  "ATTACHMENT_MALWARE_SCAN_TIMEOUT_MS",
  "CHAT_ATTACHMENT_RATE_LIMIT",
  "CHAT_SESSION_CLAIM_RATE_LIMIT",
  "CHAT_SESSION_HISTORY_RATE_LIMIT",
  "CHAT_SESSION_RATE_LIMIT",
  "DOCUMENT_UPLOAD_MAX_BYTES",
  "KAXI_DIRECT_RAG_TIMEOUT_MS",
  "KNOWLEDGE_MONITOR_CONCURRENCY",
  "KNOWLEDGE_MONITOR_FETCH_TIMEOUT_MS",
  "KNOWLEDGE_MONITOR_MAX_SOURCES",
  "KNOWLEDGE_REVIEW_AFTER_DAYS",
  "N8N_ERROR_REPORT_RATE_LIMIT",
  "N8N_HANDOFF_CORE_RATE_LIMIT",
  "N8N_RAG_CORE_RATE_LIMIT",
  "N8N_RAG_INGESTION_RATE_LIMIT",
  "N8N_RAG_TIMEOUT_MS",
  "N8N_VERIFICATION_RECEIPT_TTL_SECONDS",
  "N8N_VERIFY_RATE_LIMIT",
  "N8N_WEBHOOK_MAX_AGE_SECONDS",
  "OPENAI_EMBEDDING_TIMEOUT_MS",
  "PORT",
  "PRIVACY_CHATLOG_RETENTION_DAYS",
  "PRIVACY_CHAT_ATTACHMENT_RETENTION_DAYS",
  "PRIVACY_LEAD_RETENTION_DAYS",
  "PRIVACY_PARTNER_REQUEST_RETENTION_DAYS",
  "PRIVACY_PRODUCT_ANALYTICS_RETENTION_DAYS",
  "RAG_GROUNDED_ANSWER_TIMEOUT_MS",
  "SECURITY_CREDENTIAL_ROTATION_DAYS",
  "SMTP_PORT",
  "TYPEBOT_HANDOFF_RATE_LIMIT",
  "TYPEBOT_RAG_RATE_LIMIT",
  "TYPEBOT_RESULT_RETENTION_DAYS",
  "UNIFIED_AI_STREAM_TIMEOUT_MS",
  "WORKER_POLL_MS",
] as const);

const BOOLEAN_RUNTIME_KEYS = Object.freeze([
  "AI_AGENT_LEDGER_ENABLED",
  "AI_AGENT_LOGGING_ENABLED",
  "AI_AGENT_PREFLIGHT_ENABLED",
  "AI_AGENT_USE_TRANSFORMER_RAG",
  "AI_ALLOW_LLM_FALLBACK",
  "AI_CONSULT_USE_TRANSFORMER_RAG",
  "AI_LLM_PROVIDER_FAILOVER_ENABLED",
  "AI_REQUIRE_LLM",
  "AI_REQUIRE_PROVIDER_FAILOVER",
  "ATTACHMENT_MALWARE_SCAN_REQUIRED",
  "CHAT_ATTACHMENTS_ENABLED",
  "DOCUMENT_UPLOAD_STORE_BYTES",
  "KAXI_QUERY_EMBEDDINGS_ENABLED",
  "KAXI_QUERY_EMBEDDING_REQUIRED",
  "KAXI_STORED_VECTOR_EXPANSION_ENABLED",
  "KNOWLEDGE_MONITOR_PERSIST_CANDIDATES",
  "PII_ALLOW_UNENCRYPTED_PLAINTEXT",
  "OPS_ALERT_REQUIRED",
  "RESTORE_MODEL_CACHE_ON_INSTALL",
  "SMTP_SECURE",
  "TRANSFORMERS_ALLOW_LOCAL",
  "TRANSFORMERS_ALLOW_REMOTE",
] as const);

const BOOLEAN_VALUES = new Set(["1", "0", "true", "false", "yes", "no", "on", "off"]);

export function runtimeEnvironmentIssues(
  source: NodeJS.ProcessEnv = runtimeEnvironment(),
): RuntimeEnvironmentIssue[] {
  const issues: RuntimeEnvironmentIssue[] = [];
  for (const key of POSITIVE_INTEGER_RUNTIME_KEYS) {
    const value = source[key]?.trim();
    if (!value) continue;
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      issues.push({ key, code: "invalid_positive_integer" });
    }
  }
  for (const key of BOOLEAN_RUNTIME_KEYS) {
    const value = source[key]?.trim().toLowerCase();
    if (value && !BOOLEAN_VALUES.has(value)) issues.push({ key, code: "invalid_boolean" });
  }
  return issues;
}

export function assertProductionRuntimeEnvironment(
  source: NodeJS.ProcessEnv = runtimeEnvironment(),
): void {
  if (source.VERCEL_ENV !== "production" && source.NODE_ENV !== "production") return;
  const issues = runtimeEnvironmentIssues(source);
  if (issues.length === 0) return;
  throw new Error(`Invalid server runtime configuration: ${issues.map((issue) => issue.key).join(", ")}`);
}
