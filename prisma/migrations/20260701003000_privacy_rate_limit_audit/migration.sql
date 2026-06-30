ALTER TABLE "Lead" ADD COLUMN "contactCiphertext" TEXT;
ALTER TABLE "Lead" ADD COLUMN "contactHash" TEXT;
ALTER TABLE "Lead" ADD COLUMN "contactRedacted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Lead" ADD COLUMN "deleteRequestedAt" DATETIME;
ALTER TABLE "Lead" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "Lead" ADD COLUMN "retentionUntil" DATETIME;

ALTER TABLE "PartnerRequest" ADD COLUMN "questionCiphertext" TEXT;
ALTER TABLE "PartnerRequest" ADD COLUMN "questionHash" TEXT;
ALTER TABLE "PartnerRequest" ADD COLUMN "questionRedacted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PartnerRequest" ADD COLUMN "deleteRequestedAt" DATETIME;
ALTER TABLE "PartnerRequest" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "PartnerRequest" ADD COLUMN "retentionUntil" DATETIME;

ALTER TABLE "ChatLog" ADD COLUMN "questionCiphertext" TEXT;
ALTER TABLE "ChatLog" ADD COLUMN "questionHash" TEXT;
ALTER TABLE "ChatLog" ADD COLUMN "questionRedacted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ChatLog" ADD COLUMN "deleteRequestedAt" DATETIME;
ALTER TABLE "ChatLog" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "ChatLog" ADD COLUMN "retentionUntil" DATETIME;

CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL DEFAULT 'admin',
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "metadata" TEXT
);

CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "Lead_contactHash_idx" ON "Lead"("contactHash");
CREATE INDEX "Lead_deleteRequestedAt_idx" ON "Lead"("deleteRequestedAt");
CREATE INDEX "Lead_retentionUntil_idx" ON "Lead"("retentionUntil");
CREATE INDEX "PartnerRequest_questionHash_idx" ON "PartnerRequest"("questionHash");
CREATE INDEX "PartnerRequest_deleteRequestedAt_idx" ON "PartnerRequest"("deleteRequestedAt");
CREATE INDEX "PartnerRequest_retentionUntil_idx" ON "PartnerRequest"("retentionUntil");
CREATE INDEX "ChatLog_questionHash_idx" ON "ChatLog"("questionHash");
CREATE INDEX "ChatLog_deleteRequestedAt_idx" ON "ChatLog"("deleteRequestedAt");
CREATE INDEX "ChatLog_retentionUntil_idx" ON "ChatLog"("retentionUntil");
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");
CREATE INDEX "AdminAuditLog_actor_idx" ON "AdminAuditLog"("actor");
CREATE INDEX "AdminAuditLog_action_idx" ON "AdminAuditLog"("action");
CREATE INDEX "AdminAuditLog_targetType_idx" ON "AdminAuditLog"("targetType");
CREATE INDEX "RateLimitBucket_resetAt_idx" ON "RateLimitBucket"("resetAt");
