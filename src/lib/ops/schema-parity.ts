import { db } from "@/lib/db";

export const REQUIRED_PRODUCTION_MIGRATION = "20260721210000_chat_session_user_link";

const REQUIRED_SCHEMA_OBJECTS = [
  "migration_ledger",
  "attachment_jobs",
  "session_retention",
  "message_ciphertext",
  "retrieval_ciphertext",
  "handoff_content_ciphertext",
  "handoff_source_message",
  "audit_hashes",
  "attachment_claim_function",
  "session_retention_function",
  "handoff_content_function",
  "audit_sanitizer_function",
  "handoff_consent_evidence",
  "partner_request_assignment",
  "user_notifications",
  "rag_strict_locale_search",
  "rag_lexical_fallback_function",
  "rag_provenance_columns",
  "legacy_cutover_function",
  "operator_review_feedback",
  "operator_review_function",
  "retrieval_review_trigger",
  "product_analytics_events",
  "rag_confidence_policy",
  "rag_provider_independent_hybrid",
] as const;

type RequiredSchemaObject = (typeof REQUIRED_SCHEMA_OBJECTS)[number];
type SchemaParityRow = Record<RequiredSchemaObject, boolean>;

export interface SchemaParityResult {
  ok: boolean;
  latestMigration: string;
  missing: RequiredSchemaObject[];
  detail: string;
}

function safeError(error: unknown) {
  return (error instanceof Error ? error.message : String(error)).replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[database-url]").slice(0, 240);
}

export async function checkProductionSchemaParity(): Promise<SchemaParityResult> {
  try {
    const rows = await db.$queryRaw<SchemaParityRow[]>`
      SELECT
        EXISTS (
          SELECT 1
          FROM public._prisma_migrations
          WHERE migration_name = ${REQUIRED_PRODUCTION_MIGRATION}
            AND finished_at IS NOT NULL
            AND rolled_back_at IS NULL
        ) AS migration_ledger,
        to_regclass('public.chat_attachment_jobs') IS NOT NULL AS attachment_jobs,
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'chat_sessions' AND column_name = 'retention_until'
        ) AS session_retention,
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'chat_messages' AND column_name = 'question_ciphertext'
        ) AS message_ciphertext,
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'retrieval_runs' AND column_name = 'query_ciphertext'
        ) AS retrieval_ciphertext,
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'handoff_updates' AND column_name = 'question_ciphertext'
        ) AS handoff_content_ciphertext,
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'handoff_tasks' AND column_name = 'source_chat_message_id'
        ) AS handoff_source_message,
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'n8n_audit_messages' AND column_name = 'question_hash'
        ) AS audit_hashes,
        to_regprocedure('public.kaxi_claim_chat_attachment_jobs(integer,integer)') IS NOT NULL AS attachment_claim_function,
        to_regprocedure('public.kaxi_extend_chat_session_retention()') IS NOT NULL AS session_retention_function,
        to_regprocedure('public.kaxi_propagate_handoff_content_privacy()') IS NOT NULL AS handoff_content_function,
        to_regprocedure('public.kaxi_sanitize_n8n_audit_content()') IS NOT NULL AS audit_sanitizer_function,
        to_regclass('public.handoff_consent_evidence') IS NOT NULL AS handoff_consent_evidence,
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'PartnerRequest' AND column_name = 'organizationId'
        ) AS partner_request_assignment,
        to_regclass('public."UserNotification"') IS NOT NULL AS user_notifications,
        to_regprocedure('public.kaxi_rag_category_allowed(text,text)') IS NOT NULL
          AND to_regprocedure('public.kaxi_extract_rag_locale_sections(text,text)') IS NOT NULL
          AND to_regprocedure('public.match_rag_documents(vector,integer,jsonb)') IS NOT NULL
          AND position(
            'v_category_mode' IN pg_get_functiondef(
              to_regprocedure('public.match_rag_documents(vector,integer,jsonb)')
            )
          ) > 0 AS rag_strict_locale_search,
        to_regprocedure('public.match_rag_documents_lexical(integer,jsonb)') IS NOT NULL
          AND position(
            'exact_doc_id_score' IN pg_get_functiondef(
              to_regprocedure('public.match_rag_documents_lexical(integer,jsonb)')
            )
          ) > 0 AS rag_lexical_fallback_function,
        (
          SELECT count(*) = 24
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name IN (
              'chat_messages', 'retrieval_runs', 'n8n_audit_messages',
              'ops_events', 'system_health_runs', 'rag_evaluation_runs'
            )
            AND column_name IN (
              'workflow_id', 'workflow_version_id', 'model_version', 'prompt_version'
            )
        ) AS rag_provenance_columns,
        to_regprocedure('public.kaxi_finalize_legacy_rag_cutover(integer)') IS NOT NULL
          AND position(
            'USING public.legacy_rag_chunks_quarantine' IN pg_get_functiondef(
              to_regprocedure('public.kaxi_finalize_legacy_rag_cutover(integer)')
            )
          ) > 0 AS legacy_cutover_function,
        to_regclass('public.rag_review_feedback') IS NOT NULL AS operator_review_feedback,
        to_regprocedure('public.kaxi_resolve_handoff_review(bigint,text,text)') IS NOT NULL AS operator_review_function,
        EXISTS (
          SELECT 1 FROM pg_trigger
          WHERE tgname = 'retrieval_runs_queue_review'
            AND NOT tgisinternal
        ) AS retrieval_review_trigger,
        to_regclass('public.product_events') IS NOT NULL AS product_analytics_events,
        position(
          'below_calibrated_threshold' IN pg_get_functiondef(
            to_regprocedure('public.kaxi_queue_retrieval_review()')
          )
        ) > 0 AS rag_confidence_policy,
        to_regprocedure('public.match_rag_documents_hybrid_v3(vector,integer,jsonb)') IS NOT NULL
          AND position(
            'lexical-centroid' IN pg_get_functiondef(
              to_regprocedure('public.match_rag_documents_hybrid_v3(vector,integer,jsonb)')
            )
          ) > 0 AS rag_provider_independent_hybrid
    `;
    const row = rows[0];
    const missing = REQUIRED_SCHEMA_OBJECTS.filter((key) => row?.[key] !== true);
    return {
      ok: missing.length === 0,
      latestMigration: REQUIRED_PRODUCTION_MIGRATION,
      missing,
      detail:
        missing.length === 0
          ? `Migration ${REQUIRED_PRODUCTION_MIGRATION} and all canonical runtime objects are present.`
          : `Database schema is missing required runtime objects: ${missing.join(", ")}.`,
    };
  } catch (error) {
    return {
      ok: false,
      latestMigration: REQUIRED_PRODUCTION_MIGRATION,
      missing: [...REQUIRED_SCHEMA_OBJECTS],
      detail: `Database schema parity could not be verified: ${safeError(error)}`,
    };
  }
}
