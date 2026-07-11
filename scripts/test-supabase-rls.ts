import { readFileSync } from "fs";
import { join } from "path";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

const root = process.cwd();
const schema = readFileSync(join(root, "prisma", "postgres", "schema.prisma"), "utf8");
const migration = [
  "20260708060000_supabase_auth_rls",
  "20260708070000_supabase_auth_runtime",
  "20260708090000_visa_document_matrix",
  "20260708100000_document_verification_feedback",
]
  .map((name) => readFileSync(join(root, "prisma", "postgres", "migrations", name, "migration.sql"), "utf8"))
  .join("\n");
const n8nSecurityMigration = readFileSync(
  join(root, "prisma", "postgres", "migrations", "20260710100000_n8n_security_baseline", "migration.sql"),
  "utf8",
);
const ragServingMigration = readFileSync(
  join(root, "prisma", "postgres", "migrations", "20260710120000_rag_serving_projection", "migration.sql"),
  "utf8",
);
const chatTurnMigration = readFileSync(
  join(root, "prisma", "postgres", "migrations", "20260710130000_chat_turn_contract", "migration.sql"),
  "utf8",
);
const chatAttachmentMigration = readFileSync(
  join(root, "prisma", "postgres", "migrations", "20260710140000_chat_attachment_processing", "migration.sql"),
  "utf8",
);
const opsObservabilityMigration = readFileSync(
  join(root, "prisma", "postgres", "migrations", "20260710150000_ops_observability", "migration.sql"),
  "utf8",
);
const legacyRagQuarantineMigration = readFileSync(
  join(root, "prisma", "postgres", "migrations", "20260710160000_legacy_rag_quarantine", "migration.sql"),
  "utf8",
);
const legacyRagCutoverMigration = readFileSync(
  join(root, "prisma", "postgres", "migrations", "20260710161000_legacy_rag_cutover_gate", "migration.sql"),
  "utf8",
);
const legacyRagSafeDeleteMigration = readFileSync(
  join(root, "prisma", "postgres", "migrations", "20260711223000_legacy_rag_cutover_safe_delete", "migration.sql"),
  "utf8",
);
const chatAttachmentJobsMigration = readFileSync(
  join(root, "prisma", "postgres", "migrations", "20260710170000_chat_attachment_jobs", "migration.sql"),
  "utf8",
);
const chatContentPrivacyMigration = readFileSync(
  join(root, "prisma", "postgres", "migrations", "20260710173000_chat_content_privacy", "migration.sql"),
  "utf8",
);
const funnelNotificationMigration = readFileSync(
  join(root, "prisma", "postgres", "migrations", "20260711110000_partner_request_assignment_notifications", "migration.sql"),
  "utf8",
);

assert(
  /authUserId\s+String\?\s+@unique\s+@db\.Uuid/.test(schema),
  "User model must include nullable unique authUserId @db.Uuid for Supabase auth.users.id"
);
assert(
  chatTurnMigration.includes("public.retrieval_runs ENABLE ROW LEVEL SECURITY;"),
  "missing server-only RLS enablement for public.retrieval_runs",
);
assert(
  chatTurnMigration.includes("public.retrieval_runs FROM PUBLIC;"),
  "missing PUBLIC grant revocation for public.retrieval_runs",
);
assert(
  chatAttachmentMigration.includes("public.chat_attachment_extractions ENABLE ROW LEVEL SECURITY;") &&
    chatAttachmentMigration.includes("public.chat_attachment_extractions FROM PUBLIC;"),
  "chat attachment extraction must be server-only with RLS",
);
assert(
  chatAttachmentJobsMigration.includes("public.chat_attachment_jobs ENABLE ROW LEVEL SECURITY;") &&
    chatAttachmentJobsMigration.includes("public.chat_attachment_jobs FROM PUBLIC;") &&
    chatAttachmentJobsMigration.includes("FOR UPDATE SKIP LOCKED") &&
    chatAttachmentJobsMigration.includes("kaxi_claim_chat_attachment_jobs") &&
    chatAttachmentJobsMigration.includes("REVOKE EXECUTE ON FUNCTION public.kaxi_claim_chat_attachment_jobs"),
  "chat attachment jobs must use a server-only leased queue with atomic claims",
);
for (const column of [
  "question_ciphertext",
  "answer_ciphertext",
  "query_ciphertext",
  "lead_note_ciphertext",
  "retention_until",
  "delete_requested_at",
]) {
  assert(chatContentPrivacyMigration.includes(column), `chat content privacy migration must include ${column}`);
}
assert(
  chatContentPrivacyMigration.includes("kaxi_extend_chat_session_retention") &&
    chatContentPrivacyMigration.includes("chat_sessions_extend_retention"),
  "chat session retention must extend from recent conversation activity",
);
for (const table of ["ops_events", "system_health_runs", "rag_evaluation_cases", "rag_evaluation_runs", "rag_evaluation_results"]) {
  assert(
    opsObservabilityMigration.includes(`'${table}'`),
    `ops observability RLS loop must include ${table}`,
  );
}
assert(
  legacyRagQuarantineMigration.includes("public.legacy_rag_chunks_quarantine ENABLE ROW LEVEL SECURITY;") &&
    legacyRagQuarantineMigration.includes("public.legacy_rag_chunks_quarantine FROM PUBLIC;"),
  "legacy RAG rows must be copied into a server-only quarantine",
);
assert(
  legacyRagCutoverMigration.includes("FUNCTION public.kaxi_finalize_legacy_rag_cutover") &&
    legacyRagCutoverMigration.includes("RAG cutover blocked") &&
    legacyRagCutoverMigration.includes("DELETE FROM public.knowledge_chunks") &&
    legacyRagCutoverMigration.includes("FROM PUBLIC;"),
  "legacy deletion must be readiness-gated and unavailable to public roles",
);
assert(
  legacyRagSafeDeleteMigration.includes("USING public.legacy_rag_chunks_quarantine") &&
    legacyRagSafeDeleteMigration.includes("WHERE quarantine.original_id = legacy.id") &&
    legacyRagSafeDeleteMigration.includes("RAG cutover blocked"),
  "legacy deletion must remove only rows copied into quarantine and remain readiness-gated",
);
assert(/ADD COLUMN IF NOT EXISTS "authUserId" UUID/.test(migration), "migration must add User.authUserId UUID");

for (const fn of [
  "kaxi_auth_uid",
  "kaxi_current_user_id",
  "kaxi_current_user_role",
  "kaxi_current_organization_id",
  "kaxi_can_access_student_profile",
  "kaxi_can_access_case",
]) {
  assert(migration.includes(`FUNCTION public.${fn}`), `missing helper function ${fn}`);
}

const rlsTables = [
  "Organization",
  "User",
  "PartnerAgentInvite",
  "StudentProfile",
  "Consent",
  "JourneyState",
  "DocumentItem",
  "DocumentVerificationFeedback",
  "VisaDocumentRequirement",
  "UploadedFile",
  "DocumentFileBlob",
  "School",
  "KnowledgeDocument",
  "KnowledgeChunk",
  "EscalationCase",
  "CaseTimelineEvent",
  "CaseDocumentLink",
  "AgentReview",
  "AuditEvent",
];

for (const table of rlsTables) {
  assert(
    migration.includes(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`),
    `missing RLS enable statement for ${table}`
  );
}

const serverOnlyN8nTables = [
  "knowledge_chunks",
  "chat_sessions",
  "chat_messages",
  "chat_attachments",
  "n8n_audit_messages",
  "handoff_tasks",
  "leads",
  "lead_contacts",
  "handoff_updates",
  "webhook_nonces",
];

for (const table of serverOnlyN8nTables) {
  assert(
    n8nSecurityMigration.includes(`public.${table} ENABLE ROW LEVEL SECURITY;`),
    `missing server-only RLS enablement for public.${table}`,
  );
  assert(
    n8nSecurityMigration.includes(`public.${table} FROM PUBLIC;`),
    `missing PUBLIC grant revocation for public.${table}`,
  );
}

assert(
  ragServingMigration.includes("public.rag_serving_chunks ENABLE ROW LEVEL SECURITY;"),
  "missing server-only RLS enablement for public.rag_serving_chunks",
);
assert(
  ragServingMigration.includes("public.rag_serving_chunks FROM PUBLIC;"),
  "missing PUBLIC grant revocation for public.rag_serving_chunks",
);
assert(
  ragServingMigration.includes(
    "REVOKE EXECUTE ON FUNCTION public.match_rag_documents(vector, integer, jsonb) FROM PUBLIC;",
  ),
  "match_rag_documents must not be executable by PUBLIC",
);

assert(
  n8nSecurityMigration.includes(
    "REVOKE EXECUTE ON FUNCTION public.match_documents(vector, integer, jsonb) FROM PUBLIC;",
  ),
  "match_documents must not be executable by PUBLIC",
);

for (const policy of [
  "kaxi_school_public_read",
  "kaxi_knowledge_document_public_read",
  "kaxi_knowledge_chunk_public_read",
  "kaxi_user_self_or_org_read",
  "kaxi_partner_agent_invite_admin_read",
  "kaxi_student_profile_scoped_read",
  "kaxi_document_item_scoped_read",
  "kaxi_visa_document_requirement_public_read",
  "kaxi_uploaded_file_scoped_read",
  "kaxi_escalation_case_scoped_read",
  "kaxi_case_timeline_scoped_read",
  "kaxi_case_document_link_scoped_read",
]) {
  assert(migration.includes(`CREATE POLICY ${policy}`), `missing RLS policy ${policy}`);
}

assert(
  migration.includes("COMMENT ON TABLE \"DocumentFileBlob\"") &&
    !migration.includes("CREATE POLICY kaxi_document_file_blob"),
  "DocumentFileBlob should have RLS enabled without direct-client read/write policy"
);
assert(
  migration.includes("ALTER TABLE \"DocumentVerificationFeedback\" ENABLE ROW LEVEL SECURITY;") &&
    !migration.includes("CREATE POLICY kaxi_document_verification_feedback"),
  "DocumentVerificationFeedback should be RLS-protected without direct-client policies"
);
assert(
  migration.includes("\"reviewStatus\" = 'APPROVED'::\"LegalReviewStatus\""),
  "knowledge public read policy must expose only approved knowledge documents"
);
assert(
  migration.includes("public.kaxi_can_access_case(\"escalationCaseId\")"),
  "case child policies must scope reads through case access helper"
);
assert(
  funnelNotificationMigration.includes('ALTER TABLE "UserNotification" ENABLE ROW LEVEL SECURITY;') &&
    funnelNotificationMigration.includes("kaxi_user_notification_select_own") &&
    funnelNotificationMigration.includes("kaxi_user_notification_update_own") &&
    funnelNotificationMigration.includes('"authUserId" = public.kaxi_auth_uid()'),
  "UserNotification must allow only the authenticated owner to read and update notifications",
);

console.log(
  `PASS Supabase RLS: ${rlsTables.length + serverOnlyN8nTables.length + 4} tables protected and scoped policies verified`,
);
