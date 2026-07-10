-- Phase 1 feedback loop for document verification quality labels.

CREATE TABLE "DocumentVerificationFeedback" (
    "id" TEXT NOT NULL,
    "documentItemId" TEXT NOT NULL,
    "reviewerUserId" TEXT,
    "reviewerActor" TEXT NOT NULL,
    "reviewerRole" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "issueCodes" JSONB NOT NULL,
    "layerStatuses" JSONB NOT NULL,
    "verificationSnapshot" JSONB,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentVerificationFeedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DocumentVerificationFeedback_documentItemId_idx" ON "DocumentVerificationFeedback"("documentItemId");
CREATE INDEX "DocumentVerificationFeedback_reviewerUserId_idx" ON "DocumentVerificationFeedback"("reviewerUserId");
CREATE INDEX "DocumentVerificationFeedback_label_idx" ON "DocumentVerificationFeedback"("label");
CREATE INDEX "DocumentVerificationFeedback_createdAt_idx" ON "DocumentVerificationFeedback"("createdAt");

ALTER TABLE "DocumentVerificationFeedback"
  ADD CONSTRAINT "DocumentVerificationFeedback_documentItemId_fkey"
  FOREIGN KEY ("documentItemId") REFERENCES "DocumentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentVerificationFeedback"
  ADD CONSTRAINT "DocumentVerificationFeedback_reviewerUserId_fkey"
  FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Feedback contains quality labels tied to user-submitted documents.
-- It is intentionally not exposed through direct browser RLS policies; server admin APIs record/read it.
ALTER TABLE "DocumentVerificationFeedback" ENABLE ROW LEVEL SECURITY;
