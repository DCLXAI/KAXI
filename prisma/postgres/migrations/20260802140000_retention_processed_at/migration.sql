-- P0-2. Separate "the display plaintext is redacted" from "the retention policy
-- has processed this row".
--
-- The retention sweep selected rows with `questionRedacted = false` /
-- `contactRedacted = false`. preparePiiField() sets that flag at WRITE time
-- whenever encryption succeeds, and production has DATA_ENCRYPTION_KEY set — so
-- every row was written with the flag already true, the sweep matched nothing,
-- and ciphertext plus lookup hashes survived past their retention window while
-- the job reported zero rows due.
--
-- Additive and nullable on purpose. Existing rows stay NULL, which means "not
-- yet processed", so the first sweep after this migration picks up the backlog
-- that the old query could never see. No data is rewritten here.

ALTER TABLE "ChatLog"        ADD COLUMN "retentionProcessedAt" TIMESTAMP(3);
ALTER TABLE "ChatLog"        ADD COLUMN "retentionVersion"     TEXT;
ALTER TABLE "PartnerRequest" ADD COLUMN "retentionProcessedAt" TIMESTAMP(3);
ALTER TABLE "PartnerRequest" ADD COLUMN "retentionVersion"     TEXT;
ALTER TABLE "diagnosis_leads" ADD COLUMN "retentionProcessedAt" TIMESTAMP(3);
ALTER TABLE "diagnosis_leads" ADD COLUMN "retentionVersion"     TEXT;

-- The sweep's new selector is "retentionProcessedAt IS NULL AND <expired>", so
-- this is the column it scans on every run.
CREATE INDEX "ChatLog_retentionProcessedAt_idx"        ON "ChatLog"("retentionProcessedAt");
CREATE INDEX "PartnerRequest_retentionProcessedAt_idx" ON "PartnerRequest"("retentionProcessedAt");
CREATE INDEX "diagnosis_leads_retentionProcessedAt_idx" ON "diagnosis_leads"("retentionProcessedAt");
