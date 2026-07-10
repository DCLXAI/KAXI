-- CreateTable
CREATE TABLE "VisaDocumentRequirement" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "visaType" TEXT NOT NULL,
    "stayAction" TEXT NOT NULL,
    "applicantContext" TEXT NOT NULL DEFAULT 'general',
    "documentType" TEXT NOT NULL,
    "labelKo" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "validityDays" INTEGER,
    "issuer" TEXT NOT NULL,
    "requiredFields" JSONB NOT NULL,
    "validationRules" JSONB NOT NULL,
    "sourceRefs" JSONB NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL,
    "checkedBy" TEXT NOT NULL,
    "reviewStatus" "LegalReviewStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisaDocumentRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VisaDocumentRequirement_code_key" ON "VisaDocumentRequirement"("code");

-- CreateIndex
CREATE UNIQUE INDEX "VisaDocumentRequirement_visaType_stayAction_applicantContext_documentType_key"
    ON "VisaDocumentRequirement"("visaType", "stayAction", "applicantContext", "documentType");

-- CreateIndex
CREATE INDEX "VisaDocumentRequirement_visaType_idx" ON "VisaDocumentRequirement"("visaType");

-- CreateIndex
CREATE INDEX "VisaDocumentRequirement_stayAction_idx" ON "VisaDocumentRequirement"("stayAction");

-- CreateIndex
CREATE INDEX "VisaDocumentRequirement_documentType_idx" ON "VisaDocumentRequirement"("documentType");

-- CreateIndex
CREATE INDEX "VisaDocumentRequirement_issuer_idx" ON "VisaDocumentRequirement"("issuer");

-- CreateIndex
CREATE INDEX "VisaDocumentRequirement_reviewStatus_idx" ON "VisaDocumentRequirement"("reviewStatus");

-- CreateIndex
CREATE INDEX "VisaDocumentRequirement_lastCheckedAt_idx" ON "VisaDocumentRequirement"("lastCheckedAt");

-- RLS baseline: this matrix is non-PII, but direct browser reads should only see approved rows.
ALTER TABLE "VisaDocumentRequirement" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kaxi_visa_document_requirement_public_read ON "VisaDocumentRequirement";
CREATE POLICY kaxi_visa_document_requirement_public_read ON "VisaDocumentRequirement"
  FOR SELECT
  USING ("reviewStatus" = 'APPROVED'::"LegalReviewStatus");
