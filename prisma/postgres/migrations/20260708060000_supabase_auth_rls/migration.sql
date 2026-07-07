-- Phase 4 slice: Supabase Auth identity bridge and row-level security baseline.
--
-- Server-side Prisma keeps using the trusted PostgreSQL runtime user and is not
-- forced through RLS. Browser/direct Supabase clients are constrained by the
-- policies below. Mutations remain server-owned unless a later slice explicitly
-- opens narrow write policies.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "authUserId" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "User_authUserId_key"
  ON "User"("authUserId");

CREATE OR REPLACE FUNCTION public.kaxi_auth_uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.kaxi_current_user_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id
  FROM "User" u
  WHERE u."authUserId" = public.kaxi_auth_uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.kaxi_current_user_role()
RETURNS "UserRole"
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.role
  FROM "User" u
  WHERE u."authUserId" = public.kaxi_auth_uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.kaxi_current_organization_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u."organizationId"
  FROM "User" u
  WHERE u."authUserId" = public.kaxi_auth_uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.kaxi_is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.kaxi_current_user_role() = 'PLATFORM_ADMIN'::"UserRole";
$$;

CREATE OR REPLACE FUNCTION public.kaxi_is_partner_agent()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.kaxi_current_user_role() = 'PARTNER_AGENT'::"UserRole";
$$;

CREATE OR REPLACE FUNCTION public.kaxi_can_access_student_profile(student_profile_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "StudentProfile" sp
    WHERE sp.id = student_profile_id
      AND (
        public.kaxi_is_platform_admin()
        OR sp."userId" = public.kaxi_current_user_id()
        OR EXISTS (
          SELECT 1
          FROM "EscalationCase" ec
          WHERE ec."studentProfileId" = sp.id
            AND ec."organizationId" = public.kaxi_current_organization_id()
            AND public.kaxi_is_partner_agent()
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.kaxi_can_access_case(case_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "EscalationCase" ec
    JOIN "StudentProfile" sp ON sp.id = ec."studentProfileId"
    WHERE ec.id = case_id
      AND (
        public.kaxi_is_platform_admin()
        OR sp."userId" = public.kaxi_current_user_id()
        OR (
          public.kaxi_is_partner_agent()
          AND ec."organizationId" = public.kaxi_current_organization_id()
        )
      )
  );
$$;

ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Consent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JourneyState" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UploadedFile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentFileBlob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PartnerRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "School" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentRequestLedger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Synonym" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminAuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RateLimitBucket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ComplianceRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ComplianceRuleVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ComplianceRuleTest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ComplianceEvaluation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KnowledgeDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KnowledgeChunk" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EscalationCase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CaseTimelineEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CaseDocumentLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentReview" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditEvent" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kaxi_school_public_read ON "School";
CREATE POLICY kaxi_school_public_read ON "School"
  FOR SELECT
  USING ("reviewAfter" >= now());

DROP POLICY IF EXISTS kaxi_knowledge_document_public_read ON "KnowledgeDocument";
CREATE POLICY kaxi_knowledge_document_public_read ON "KnowledgeDocument"
  FOR SELECT
  USING (
    "reviewStatus" = 'APPROVED'::"LegalReviewStatus"
    AND "supersededBy" IS NULL
    AND "validFrom" <= now()
    AND ("validTo" IS NULL OR "validTo" > now())
  );

DROP POLICY IF EXISTS kaxi_knowledge_chunk_public_read ON "KnowledgeChunk";
CREATE POLICY kaxi_knowledge_chunk_public_read ON "KnowledgeChunk"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM "KnowledgeDocument" d
      WHERE d.id = "KnowledgeChunk"."documentId"
        AND d."reviewStatus" = 'APPROVED'::"LegalReviewStatus"
        AND d."supersededBy" IS NULL
        AND d."validFrom" <= now()
        AND (d."validTo" IS NULL OR d."validTo" > now())
    )
  );

DROP POLICY IF EXISTS kaxi_organization_member_read ON "Organization";
CREATE POLICY kaxi_organization_member_read ON "Organization"
  FOR SELECT
  USING (
    public.kaxi_is_platform_admin()
    OR id = public.kaxi_current_organization_id()
  );

DROP POLICY IF EXISTS kaxi_user_self_or_org_read ON "User";
CREATE POLICY kaxi_user_self_or_org_read ON "User"
  FOR SELECT
  USING (
    public.kaxi_is_platform_admin()
    OR id = public.kaxi_current_user_id()
    OR (
      public.kaxi_is_partner_agent()
      AND "organizationId" = public.kaxi_current_organization_id()
    )
  );

DROP POLICY IF EXISTS kaxi_student_profile_scoped_read ON "StudentProfile";
CREATE POLICY kaxi_student_profile_scoped_read ON "StudentProfile"
  FOR SELECT
  USING (public.kaxi_can_access_student_profile(id));

DROP POLICY IF EXISTS kaxi_consent_owner_read ON "Consent";
CREATE POLICY kaxi_consent_owner_read ON "Consent"
  FOR SELECT
  USING (
    public.kaxi_is_platform_admin()
    OR "userId" = public.kaxi_current_user_id()
  );

DROP POLICY IF EXISTS kaxi_journey_state_owner_read ON "JourneyState";
CREATE POLICY kaxi_journey_state_owner_read ON "JourneyState"
  FOR SELECT
  USING (public.kaxi_can_access_student_profile("studentProfileId"));

DROP POLICY IF EXISTS kaxi_document_item_scoped_read ON "DocumentItem";
CREATE POLICY kaxi_document_item_scoped_read ON "DocumentItem"
  FOR SELECT
  USING (
    public.kaxi_can_access_student_profile("studentProfileId")
    OR EXISTS (
      SELECT 1
      FROM "CaseDocumentLink" cdl
      WHERE cdl."documentItemId" = "DocumentItem".id
        AND public.kaxi_can_access_case(cdl."escalationCaseId")
    )
  );

DROP POLICY IF EXISTS kaxi_uploaded_file_scoped_read ON "UploadedFile";
CREATE POLICY kaxi_uploaded_file_scoped_read ON "UploadedFile"
  FOR SELECT
  USING (
    public.kaxi_is_platform_admin()
    OR "ownerUserId" = public.kaxi_current_user_id()
    OR EXISTS (
      SELECT 1
      FROM "DocumentItem" di
      JOIN "CaseDocumentLink" cdl ON cdl."documentItemId" = di.id
      WHERE di."fileId" = "UploadedFile".id
        AND public.kaxi_can_access_case(cdl."escalationCaseId")
    )
  );

DROP POLICY IF EXISTS kaxi_escalation_case_scoped_read ON "EscalationCase";
CREATE POLICY kaxi_escalation_case_scoped_read ON "EscalationCase"
  FOR SELECT
  USING (public.kaxi_can_access_case(id));

DROP POLICY IF EXISTS kaxi_case_timeline_scoped_read ON "CaseTimelineEvent";
CREATE POLICY kaxi_case_timeline_scoped_read ON "CaseTimelineEvent"
  FOR SELECT
  USING (public.kaxi_can_access_case("escalationCaseId"));

DROP POLICY IF EXISTS kaxi_case_document_link_scoped_read ON "CaseDocumentLink";
CREATE POLICY kaxi_case_document_link_scoped_read ON "CaseDocumentLink"
  FOR SELECT
  USING (public.kaxi_can_access_case("escalationCaseId"));

DROP POLICY IF EXISTS kaxi_agent_review_scoped_read ON "AgentReview";
CREATE POLICY kaxi_agent_review_scoped_read ON "AgentReview"
  FOR SELECT
  USING (public.kaxi_can_access_case("escalationCaseId"));

DROP POLICY IF EXISTS kaxi_compliance_evaluation_scoped_read ON "ComplianceEvaluation";
CREATE POLICY kaxi_compliance_evaluation_scoped_read ON "ComplianceEvaluation"
  FOR SELECT
  USING (public.kaxi_can_access_student_profile("studentProfileId"));

DROP POLICY IF EXISTS kaxi_audit_event_scoped_read ON "AuditEvent";
CREATE POLICY kaxi_audit_event_scoped_read ON "AuditEvent"
  FOR SELECT
  USING (
    public.kaxi_is_platform_admin()
    OR "actorUserId" = public.kaxi_current_user_id()
    OR (
      public.kaxi_is_partner_agent()
      AND "organizationId" = public.kaxi_current_organization_id()
    )
  );

DROP POLICY IF EXISTS kaxi_compliance_rule_admin_read ON "ComplianceRule";
CREATE POLICY kaxi_compliance_rule_admin_read ON "ComplianceRule"
  FOR SELECT
  USING (public.kaxi_is_platform_admin());

DROP POLICY IF EXISTS kaxi_compliance_rule_version_admin_read ON "ComplianceRuleVersion";
CREATE POLICY kaxi_compliance_rule_version_admin_read ON "ComplianceRuleVersion"
  FOR SELECT
  USING (public.kaxi_is_platform_admin());

DROP POLICY IF EXISTS kaxi_compliance_rule_test_admin_read ON "ComplianceRuleTest";
CREATE POLICY kaxi_compliance_rule_test_admin_read ON "ComplianceRuleTest"
  FOR SELECT
  USING (public.kaxi_is_platform_admin());

DROP POLICY IF EXISTS kaxi_synonym_admin_read ON "Synonym";
CREATE POLICY kaxi_synonym_admin_read ON "Synonym"
  FOR SELECT
  USING (public.kaxi_is_platform_admin());

DROP POLICY IF EXISTS kaxi_admin_audit_log_admin_read ON "AdminAuditLog";
CREATE POLICY kaxi_admin_audit_log_admin_read ON "AdminAuditLog"
  FOR SELECT
  USING (public.kaxi_is_platform_admin());

COMMENT ON COLUMN "User"."authUserId" IS 'Supabase auth.users.id. Nullable during migration; unique when present.';
COMMENT ON TABLE "DocumentFileBlob" IS 'RLS enabled with no direct-client policies. Original document bytes remain server/service-role only.';
