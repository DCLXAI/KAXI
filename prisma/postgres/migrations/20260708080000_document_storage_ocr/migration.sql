-- Phase 3 final slice: document OCR result storage.
-- Extracted sensitive fields are encrypted before persistence; redacted JSON is
-- for admin display only and must not contain full passport numbers or names.

ALTER TABLE "DocumentItem"
  ADD COLUMN "ocrExtractedCiphertext" TEXT,
  ADD COLUMN "ocrExtractedRedacted" JSONB,
  ADD COLUMN "ocrValidation" JSONB,
  ADD COLUMN "ocrModel" TEXT,
  ADD COLUMN "ocrProcessedAt" TIMESTAMP(3);

CREATE INDEX "DocumentItem_ocrProcessedAt_idx" ON "DocumentItem"("ocrProcessedAt");
