-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('PLATFORM', 'PARTNER_AGENT_OFFICE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'PARTNER_AGENT', 'PLATFORM_ADMIN');

-- CreateEnum
CREATE TYPE "ConsentScope" AS ENUM ('TERMS', 'PRIVACY', 'THIRD_PARTY_PROVISION', 'PROCESSING_CONSIGNMENT', 'OVERSEAS_TRANSFER', 'MARKETING');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('GRANTED', 'WITHDRAWN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('NOT_UPLOADED', 'UPLOADED', 'OCR_PROCESSING', 'OCR_DONE', 'MISSING', 'EXPIRED', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_HUMAN_REVIEW');

-- CreateEnum
CREATE TYPE "RuleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LegalReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EscalationStatus" AS ENUM ('NEW', 'NEEDS_MORE_DOCUMENTS', 'HIGH_RISK', 'APPROVED', 'REJECTED', 'CLOSED', 'STOPPED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'UNKNOWN');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrgType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "role" "UserRole" NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "zaloUid" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'vi',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nationality" TEXT NOT NULL DEFAULT 'VN',
    "visaType" TEXT,
    "visaExpiryDate" TIMESTAMP(3),
    "alienRegistrationNo" TEXT,
    "alienRegistrationHash" TEXT,
    "passportNo" TEXT,
    "passportHash" TEXT,
    "schoolName" TEXT,
    "programType" TEXT,
    "semesterStatus" TEXT,
    "topikLevel" INTEGER,
    "partTimePermitStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" "ConsentScope" NOT NULL,
    "status" "ConsentStatus" NOT NULL DEFAULT 'GRANTED',
    "version" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'vi',
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "evidenceJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JourneyState" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "primaryStage" TEXT NOT NULL,
    "modules" JSONB NOT NULL,
    "completionScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JourneyState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentItem" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "status" "DocumentStatus" NOT NULL DEFAULT 'NOT_UPLOADED',
    "expiresAt" TIMESTAMP(3),
    "fileId" TEXT,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadedFile" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "piiClass" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "UploadedFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nickname" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "education" TEXT NOT NULL,
    "koreanLevel" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "budget" INTEGER NOT NULL,
    "region" TEXT NOT NULL,
    "usingBroker" BOOLEAN NOT NULL DEFAULT false,
    "brokerCost" INTEGER NOT NULL DEFAULT 0,
    "hasHistory" BOOLEAN NOT NULL DEFAULT false,
    "pathKey" TEXT NOT NULL,
    "estimatedCost" INTEGER NOT NULL,
    "prepTime" TEXT NOT NULL,
    "requiredDocs" TEXT NOT NULL,
    "warningsJson" TEXT NOT NULL,
    "nextActionsJson" TEXT NOT NULL,
    "contact" TEXT,
    "contactType" TEXT,
    "contactCiphertext" TEXT,
    "contactHash" TEXT,
    "contactRedacted" BOOLEAN NOT NULL DEFAULT false,
    "deleteRequestedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "retentionUntil" TIMESTAMP(3),

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerRequest" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadId" TEXT NOT NULL,
    "partnerType" TEXT NOT NULL,
    "question" TEXT,
    "questionCiphertext" TEXT,
    "questionHash" TEXT,
    "questionRedacted" BOOLEAN NOT NULL DEFAULT false,
    "deleteRequestedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "retentionUntil" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "PartnerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nameKo" TEXT NOT NULL,
    "nameVi" TEXT NOT NULL,
    "nameMn" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "program" TEXT NOT NULL,
    "tuitionPerSemester" INTEGER NOT NULL,
    "dormitoryAvailable" BOOLEAN NOT NULL DEFAULT false,
    "dormitoryCost" INTEGER,
    "koreanRequirement" TEXT NOT NULL,
    "accreditation" TEXT NOT NULL,
    "topikLevel" INTEGER,
    "intake" TEXT NOT NULL,
    "officialUrl" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL DEFAULT '',
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notesKo" TEXT NOT NULL,
    "notesVi" TEXT NOT NULL,
    "notesMn" TEXT NOT NULL,
    "notesEn" TEXT NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lang" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "questionCiphertext" TEXT,
    "questionHash" TEXT,
    "questionRedacted" BOOLEAN NOT NULL DEFAULT false,
    "deleteRequestedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "retentionUntil" TIMESTAMP(3),
    "answer" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "retrievedDocs" TEXT,

    CONSTRAINT "ChatLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRequestLedger" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userId" TEXT,
    "questionChars" INTEGER NOT NULL,
    "answerChars" INTEGER NOT NULL DEFAULT 0,
    "backend" TEXT NOT NULL,
    "codexMode" TEXT,
    "durationMs" INTEGER,
    "tokenEstimate" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorType" TEXT,
    "errorMessage" TEXT,
    "grounded" BOOLEAN NOT NULL DEFAULT false,
    "toolCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AgentRequestLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Synonym" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "targets" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "origin" TEXT NOT NULL DEFAULT 'manual',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "autoMeta" TEXT,

    CONSTRAINT "Synonym_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL DEFAULT 'admin',
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "metadata" TEXT,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ComplianceRule" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "visaType" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "status" "RuleStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceRuleVersion" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "conditionAst" JSONB NOT NULL,
    "outputAst" JSONB NOT NULL,
    "requiredInputs" JSONB NOT NULL,
    "sourceRefs" JSONB NOT NULL,
    "fallbackPolicy" TEXT NOT NULL,
    "reviewStatus" "LegalReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceRuleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceRuleTest" (
    "id" TEXT NOT NULL,
    "ruleVersionId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "expected" JSONB NOT NULL,
    "lastResult" JSONB,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceRuleTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceEvaluation" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "ruleVersionId" TEXT NOT NULL,
    "inputSnapshot" JSONB NOT NULL,
    "outputSnapshot" JSONB NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'UNKNOWN',
    "inputHash" TEXT NOT NULL,
    "outputHash" TEXT NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeDocument" (
    "id" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL DEFAULT 'KR',
    "topic" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3) NOT NULL,
    "checkedBy" TEXT NOT NULL,
    "reviewStatus" "LegalReviewStatus" NOT NULL DEFAULT 'PENDING',
    "supersedes" JSONB,
    "supersededBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "embeddingJson" JSONB,
    "embeddingModel" TEXT,
    "embeddingDim" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscalationCase" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "studentProfileId" TEXT NOT NULL,
    "assignedUserId" TEXT,
    "status" "EscalationStatus" NOT NULL DEFAULT 'NEW',
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'UNKNOWN',
    "category" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "conversationSummary" TEXT,
    "ruleSnapshot" JSONB,
    "aiDraft" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "EscalationCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentReview" (
    "id" TEXT NOT NULL,
    "escalationCaseId" TEXT NOT NULL,
    "reviewerUserId" TEXT,
    "decision" "ReviewStatus" NOT NULL,
    "note" TEXT,
    "responseDraft" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "actorUserId" TEXT,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "caseId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Organization_type_idx" ON "Organization"("type");

-- CreateIndex
CREATE INDEX "Organization_createdAt_idx" ON "Organization"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_zaloUid_key" ON "User"("zaloUid");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE INDEX "StudentProfile_nationality_idx" ON "StudentProfile"("nationality");

-- CreateIndex
CREATE INDEX "StudentProfile_visaType_idx" ON "StudentProfile"("visaType");

-- CreateIndex
CREATE INDEX "StudentProfile_visaExpiryDate_idx" ON "StudentProfile"("visaExpiryDate");

-- CreateIndex
CREATE INDEX "StudentProfile_alienRegistrationHash_idx" ON "StudentProfile"("alienRegistrationHash");

-- CreateIndex
CREATE INDEX "StudentProfile_passportHash_idx" ON "StudentProfile"("passportHash");

-- CreateIndex
CREATE INDEX "Consent_userId_idx" ON "Consent"("userId");

-- CreateIndex
CREATE INDEX "Consent_scope_idx" ON "Consent"("scope");

-- CreateIndex
CREATE INDEX "Consent_status_idx" ON "Consent"("status");

-- CreateIndex
CREATE INDEX "Consent_grantedAt_idx" ON "Consent"("grantedAt");

-- CreateIndex
CREATE UNIQUE INDEX "JourneyState_studentProfileId_key" ON "JourneyState"("studentProfileId");

-- CreateIndex
CREATE INDEX "DocumentItem_studentProfileId_idx" ON "DocumentItem"("studentProfileId");

-- CreateIndex
CREATE INDEX "DocumentItem_documentType_idx" ON "DocumentItem"("documentType");

-- CreateIndex
CREATE INDEX "DocumentItem_status_idx" ON "DocumentItem"("status");

-- CreateIndex
CREATE INDEX "DocumentItem_reviewStatus_idx" ON "DocumentItem"("reviewStatus");

-- CreateIndex
CREATE INDEX "DocumentItem_expiresAt_idx" ON "DocumentItem"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "UploadedFile_storageKey_key" ON "UploadedFile"("storageKey");

-- CreateIndex
CREATE INDEX "UploadedFile_ownerUserId_idx" ON "UploadedFile"("ownerUserId");

-- CreateIndex
CREATE INDEX "UploadedFile_sha256_idx" ON "UploadedFile"("sha256");

-- CreateIndex
CREATE INDEX "UploadedFile_piiClass_idx" ON "UploadedFile"("piiClass");

-- CreateIndex
CREATE INDEX "UploadedFile_createdAt_idx" ON "UploadedFile"("createdAt");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "Lead_nationality_idx" ON "Lead"("nationality");

-- CreateIndex
CREATE INDEX "Lead_pathKey_idx" ON "Lead"("pathKey");

-- CreateIndex
CREATE INDEX "Lead_contactHash_idx" ON "Lead"("contactHash");

-- CreateIndex
CREATE INDEX "Lead_deleteRequestedAt_idx" ON "Lead"("deleteRequestedAt");

-- CreateIndex
CREATE INDEX "Lead_retentionUntil_idx" ON "Lead"("retentionUntil");

-- CreateIndex
CREATE INDEX "PartnerRequest_leadId_idx" ON "PartnerRequest"("leadId");

-- CreateIndex
CREATE INDEX "PartnerRequest_partnerType_idx" ON "PartnerRequest"("partnerType");

-- CreateIndex
CREATE INDEX "PartnerRequest_status_idx" ON "PartnerRequest"("status");

-- CreateIndex
CREATE INDEX "PartnerRequest_questionHash_idx" ON "PartnerRequest"("questionHash");

-- CreateIndex
CREATE INDEX "PartnerRequest_deleteRequestedAt_idx" ON "PartnerRequest"("deleteRequestedAt");

-- CreateIndex
CREATE INDEX "PartnerRequest_retentionUntil_idx" ON "PartnerRequest"("retentionUntil");

-- CreateIndex
CREATE INDEX "School_region_idx" ON "School"("region");

-- CreateIndex
CREATE INDEX "School_program_idx" ON "School"("program");

-- CreateIndex
CREATE INDEX "School_accreditation_idx" ON "School"("accreditation");

-- CreateIndex
CREATE INDEX "School_reviewAfter_idx" ON "School"("reviewAfter");

-- CreateIndex
CREATE INDEX "ChatLog_createdAt_idx" ON "ChatLog"("createdAt");

-- CreateIndex
CREATE INDEX "ChatLog_lang_idx" ON "ChatLog"("lang");

-- CreateIndex
CREATE INDEX "ChatLog_questionHash_idx" ON "ChatLog"("questionHash");

-- CreateIndex
CREATE INDEX "ChatLog_deleteRequestedAt_idx" ON "ChatLog"("deleteRequestedAt");

-- CreateIndex
CREATE INDEX "ChatLog_retentionUntil_idx" ON "ChatLog"("retentionUntil");

-- CreateIndex
CREATE INDEX "AgentRequestLedger_createdAt_idx" ON "AgentRequestLedger"("createdAt");

-- CreateIndex
CREATE INDEX "AgentRequestLedger_ip_idx" ON "AgentRequestLedger"("ip");

-- CreateIndex
CREATE INDEX "AgentRequestLedger_backend_idx" ON "AgentRequestLedger"("backend");

-- CreateIndex
CREATE INDEX "AgentRequestLedger_success_idx" ON "AgentRequestLedger"("success");

-- CreateIndex
CREATE UNIQUE INDEX "Synonym_source_key" ON "Synonym"("source");

-- CreateIndex
CREATE INDEX "Synonym_category_idx" ON "Synonym"("category");

-- CreateIndex
CREATE INDEX "Synonym_enabled_idx" ON "Synonym"("enabled");

-- CreateIndex
CREATE INDEX "Synonym_origin_idx" ON "Synonym"("origin");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_actor_idx" ON "AdminAuditLog"("actor");

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_idx" ON "AdminAuditLog"("action");

-- CreateIndex
CREATE INDEX "AdminAuditLog_targetType_idx" ON "AdminAuditLog"("targetType");

-- CreateIndex
CREATE INDEX "RateLimitBucket_resetAt_idx" ON "RateLimitBucket"("resetAt");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceRule_code_key" ON "ComplianceRule"("code");

-- CreateIndex
CREATE INDEX "ComplianceRule_domain_idx" ON "ComplianceRule"("domain");

-- CreateIndex
CREATE INDEX "ComplianceRule_visaType_idx" ON "ComplianceRule"("visaType");

-- CreateIndex
CREATE INDEX "ComplianceRule_ruleType_idx" ON "ComplianceRule"("ruleType");

-- CreateIndex
CREATE INDEX "ComplianceRule_status_idx" ON "ComplianceRule"("status");

-- CreateIndex
CREATE INDEX "ComplianceRuleVersion_effectiveFrom_idx" ON "ComplianceRuleVersion"("effectiveFrom");

-- CreateIndex
CREATE INDEX "ComplianceRuleVersion_effectiveTo_idx" ON "ComplianceRuleVersion"("effectiveTo");

-- CreateIndex
CREATE INDEX "ComplianceRuleVersion_reviewStatus_idx" ON "ComplianceRuleVersion"("reviewStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceRuleVersion_ruleId_version_key" ON "ComplianceRuleVersion"("ruleId", "version");

-- CreateIndex
CREATE INDEX "ComplianceRuleTest_passed_idx" ON "ComplianceRuleTest"("passed");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceRuleTest_ruleVersionId_caseId_key" ON "ComplianceRuleTest"("ruleVersionId", "caseId");

-- CreateIndex
CREATE INDEX "ComplianceEvaluation_studentProfileId_idx" ON "ComplianceEvaluation"("studentProfileId");

-- CreateIndex
CREATE INDEX "ComplianceEvaluation_ruleVersionId_idx" ON "ComplianceEvaluation"("ruleVersionId");

-- CreateIndex
CREATE INDEX "ComplianceEvaluation_riskLevel_idx" ON "ComplianceEvaluation"("riskLevel");

-- CreateIndex
CREATE INDEX "ComplianceEvaluation_evaluatedAt_idx" ON "ComplianceEvaluation"("evaluatedAt");

-- CreateIndex
CREATE INDEX "ComplianceEvaluation_inputHash_idx" ON "ComplianceEvaluation"("inputHash");

-- CreateIndex
CREATE INDEX "ComplianceEvaluation_outputHash_idx" ON "ComplianceEvaluation"("outputHash");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeDocument_docId_key" ON "KnowledgeDocument"("docId");

-- CreateIndex
CREATE INDEX "KnowledgeDocument_sourceType_idx" ON "KnowledgeDocument"("sourceType");

-- CreateIndex
CREATE INDEX "KnowledgeDocument_language_idx" ON "KnowledgeDocument"("language");

-- CreateIndex
CREATE INDEX "KnowledgeDocument_topic_idx" ON "KnowledgeDocument"("topic");

-- CreateIndex
CREATE INDEX "KnowledgeDocument_validFrom_idx" ON "KnowledgeDocument"("validFrom");

-- CreateIndex
CREATE INDEX "KnowledgeDocument_validTo_idx" ON "KnowledgeDocument"("validTo");

-- CreateIndex
CREATE INDEX "KnowledgeDocument_lastCheckedAt_idx" ON "KnowledgeDocument"("lastCheckedAt");

-- CreateIndex
CREATE INDEX "KnowledgeDocument_reviewStatus_idx" ON "KnowledgeDocument"("reviewStatus");

-- CreateIndex
CREATE INDEX "KnowledgeDocument_supersededBy_idx" ON "KnowledgeDocument"("supersededBy");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_contentHash_idx" ON "KnowledgeChunk"("contentHash");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_embeddingModel_idx" ON "KnowledgeChunk"("embeddingModel");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeChunk_documentId_chunkIndex_key" ON "KnowledgeChunk"("documentId", "chunkIndex");

-- CreateIndex
CREATE INDEX "EscalationCase_organizationId_idx" ON "EscalationCase"("organizationId");

-- CreateIndex
CREATE INDEX "EscalationCase_studentProfileId_idx" ON "EscalationCase"("studentProfileId");

-- CreateIndex
CREATE INDEX "EscalationCase_assignedUserId_idx" ON "EscalationCase"("assignedUserId");

-- CreateIndex
CREATE INDEX "EscalationCase_status_idx" ON "EscalationCase"("status");

-- CreateIndex
CREATE INDEX "EscalationCase_riskLevel_idx" ON "EscalationCase"("riskLevel");

-- CreateIndex
CREATE INDEX "EscalationCase_category_idx" ON "EscalationCase"("category");

-- CreateIndex
CREATE INDEX "EscalationCase_createdAt_idx" ON "EscalationCase"("createdAt");

-- CreateIndex
CREATE INDEX "AgentReview_escalationCaseId_idx" ON "AgentReview"("escalationCaseId");

-- CreateIndex
CREATE INDEX "AgentReview_reviewerUserId_idx" ON "AgentReview"("reviewerUserId");

-- CreateIndex
CREATE INDEX "AgentReview_decision_idx" ON "AgentReview"("decision");

-- CreateIndex
CREATE INDEX "AgentReview_reviewedAt_idx" ON "AgentReview"("reviewedAt");

-- CreateIndex
CREATE INDEX "AuditEvent_organizationId_idx" ON "AuditEvent"("organizationId");

-- CreateIndex
CREATE INDEX "AuditEvent_actorUserId_idx" ON "AuditEvent"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditEvent_action_idx" ON "AuditEvent"("action");

-- CreateIndex
CREATE INDEX "AuditEvent_targetType_idx" ON "AuditEvent"("targetType");

-- CreateIndex
CREATE INDEX "AuditEvent_targetId_idx" ON "AuditEvent"("targetId");

-- CreateIndex
CREATE INDEX "AuditEvent_caseId_idx" ON "AuditEvent"("caseId");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyState" ADD CONSTRAINT "JourneyState_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentItem" ADD CONSTRAINT "DocumentItem_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentItem" ADD CONSTRAINT "DocumentItem_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerRequest" ADD CONSTRAINT "PartnerRequest_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRuleVersion" ADD CONSTRAINT "ComplianceRuleVersion_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "ComplianceRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRuleTest" ADD CONSTRAINT "ComplianceRuleTest_ruleVersionId_fkey" FOREIGN KEY ("ruleVersionId") REFERENCES "ComplianceRuleVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceEvaluation" ADD CONSTRAINT "ComplianceEvaluation_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceEvaluation" ADD CONSTRAINT "ComplianceEvaluation_ruleVersionId_fkey" FOREIGN KEY ("ruleVersionId") REFERENCES "ComplianceRuleVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalationCase" ADD CONSTRAINT "EscalationCase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalationCase" ADD CONSTRAINT "EscalationCase_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalationCase" ADD CONSTRAINT "EscalationCase_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentReview" ADD CONSTRAINT "AgentReview_escalationCaseId_fkey" FOREIGN KEY ("escalationCaseId") REFERENCES "EscalationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentReview" ADD CONSTRAINT "AgentReview_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

