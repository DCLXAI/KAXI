-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT,
    "role" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "zaloUid" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'vi',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "nationality" TEXT NOT NULL DEFAULT 'VN',
    "visaType" TEXT,
    "visaExpiryDate" DATETIME,
    "alienRegistrationNo" TEXT,
    "alienRegistrationHash" TEXT,
    "passportNo" TEXT,
    "passportHash" TEXT,
    "schoolName" TEXT,
    "programType" TEXT,
    "semesterStatus" TEXT,
    "topikLevel" INTEGER,
    "partTimePermitStatus" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Consent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GRANTED',
    "version" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'vi',
    "grantedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" DATETIME,
    "expiresAt" DATETIME,
    "evidenceJson" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Consent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JourneyState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentProfileId" TEXT NOT NULL,
    "primaryStage" TEXT NOT NULL,
    "modules" JSONB NOT NULL,
    "completionScore" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JourneyState_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentProfileId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'NOT_UPLOADED',
    "expiresAt" DATETIME,
    "fileId" TEXT,
    "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DocumentItem_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocumentItem_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "UploadedFile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UploadedFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerUserId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "piiClass" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "UploadedFile_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ComplianceRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "visaType" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ComplianceRuleVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "effectiveFrom" DATETIME NOT NULL,
    "effectiveTo" DATETIME,
    "conditionAst" JSONB NOT NULL,
    "outputAst" JSONB NOT NULL,
    "requiredInputs" JSONB NOT NULL,
    "sourceRefs" JSONB NOT NULL,
    "fallbackPolicy" TEXT NOT NULL,
    "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ComplianceRuleVersion_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "ComplianceRule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ComplianceRuleTest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleVersionId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "expected" JSONB NOT NULL,
    "lastResult" JSONB,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ComplianceRuleTest_ruleVersionId_fkey" FOREIGN KEY ("ruleVersionId") REFERENCES "ComplianceRuleVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ComplianceEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentProfileId" TEXT NOT NULL,
    "ruleVersionId" TEXT NOT NULL,
    "inputSnapshot" JSONB NOT NULL,
    "outputSnapshot" JSONB NOT NULL,
    "riskLevel" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "inputHash" TEXT NOT NULL,
    "outputHash" TEXT NOT NULL,
    "evaluatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ComplianceEvaluation_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ComplianceEvaluation_ruleVersionId_fkey" FOREIGN KEY ("ruleVersionId") REFERENCES "ComplianceRuleVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KnowledgeDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "docId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL DEFAULT 'KR',
    "topic" TEXT NOT NULL,
    "validFrom" DATETIME NOT NULL,
    "validTo" DATETIME,
    "lastCheckedAt" DATETIME NOT NULL,
    "checkedBy" TEXT NOT NULL,
    "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "supersedes" JSONB,
    "supersededBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "embeddingJson" JSONB,
    "embeddingModel" TEXT,
    "embeddingDim" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "KnowledgeChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EscalationCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT,
    "studentProfileId" TEXT NOT NULL,
    "assignedUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "riskLevel" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "category" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "conversationSummary" TEXT,
    "ruleSnapshot" JSONB,
    "aiDraft" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "closedAt" DATETIME,
    CONSTRAINT "EscalationCase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EscalationCase_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EscalationCase_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "escalationCaseId" TEXT NOT NULL,
    "reviewerUserId" TEXT,
    "decision" TEXT NOT NULL,
    "note" TEXT,
    "responseDraft" TEXT,
    "reviewedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentReview_escalationCaseId_fkey" FOREIGN KEY ("escalationCaseId") REFERENCES "EscalationCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgentReview_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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

