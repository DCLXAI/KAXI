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
]
  .map((name) => readFileSync(join(root, "prisma", "postgres", "migrations", name, "migration.sql"), "utf8"))
  .join("\n");

assert(
  /authUserId\s+String\?\s+@unique\s+@db\.Uuid/.test(schema),
  "User model must include nullable unique authUserId @db.Uuid for Supabase auth.users.id"
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

for (const policy of [
  "kaxi_school_public_read",
  "kaxi_knowledge_document_public_read",
  "kaxi_knowledge_chunk_public_read",
  "kaxi_user_self_or_org_read",
  "kaxi_partner_agent_invite_admin_read",
  "kaxi_student_profile_scoped_read",
  "kaxi_document_item_scoped_read",
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
  migration.includes("\"reviewStatus\" = 'APPROVED'::\"LegalReviewStatus\""),
  "knowledge public read policy must expose only approved knowledge documents"
);
assert(
  migration.includes("public.kaxi_can_access_case(\"escalationCaseId\")"),
  "case child policies must scope reads through case access helper"
);

console.log(`PASS Supabase RLS: ${rlsTables.length} tables protected and scoped policies verified`);
