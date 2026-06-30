-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
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
    "contactType" TEXT
);

-- CreateTable
CREATE TABLE "PartnerRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadId" TEXT NOT NULL,
    "partnerType" TEXT NOT NULL,
    "question" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    CONSTRAINT "PartnerRequest_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
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
    "notesKo" TEXT NOT NULL,
    "notesVi" TEXT NOT NULL,
    "notesMn" TEXT NOT NULL,
    "notesEn" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ChatLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lang" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "retrievedDocs" TEXT
);

-- CreateTable
CREATE TABLE "Synonym" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "source" TEXT NOT NULL,
    "targets" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "origin" TEXT NOT NULL DEFAULT 'manual',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "autoMeta" TEXT
);

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "Lead_nationality_idx" ON "Lead"("nationality");

-- CreateIndex
CREATE INDEX "Lead_pathKey_idx" ON "Lead"("pathKey");

-- CreateIndex
CREATE INDEX "PartnerRequest_leadId_idx" ON "PartnerRequest"("leadId");

-- CreateIndex
CREATE INDEX "PartnerRequest_partnerType_idx" ON "PartnerRequest"("partnerType");

-- CreateIndex
CREATE INDEX "PartnerRequest_status_idx" ON "PartnerRequest"("status");

-- CreateIndex
CREATE INDEX "School_region_idx" ON "School"("region");

-- CreateIndex
CREATE INDEX "School_program_idx" ON "School"("program");

-- CreateIndex
CREATE INDEX "School_accreditation_idx" ON "School"("accreditation");

-- CreateIndex
CREATE INDEX "ChatLog_createdAt_idx" ON "ChatLog"("createdAt");

-- CreateIndex
CREATE INDEX "ChatLog_lang_idx" ON "ChatLog"("lang");

-- CreateIndex
CREATE UNIQUE INDEX "Synonym_source_key" ON "Synonym"("source");

-- CreateIndex
CREATE INDEX "Synonym_category_idx" ON "Synonym"("category");

-- CreateIndex
CREATE INDEX "Synonym_enabled_idx" ON "Synonym"("enabled");

-- CreateIndex
CREATE INDEX "Synonym_origin_idx" ON "Synonym"("origin");

