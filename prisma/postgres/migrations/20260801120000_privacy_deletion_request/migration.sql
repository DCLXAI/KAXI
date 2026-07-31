-- P0-1b. Records a deletion request and the proof that it belongs to the
-- requester, so a person who cannot prove ownership at request time is no longer
-- dropped on the floor.
--
-- No column here holds a reversible identifier. "subject_hash" is an HMAC of the
-- contact and "verification_token_hash" is a digest of a token that exists only
-- in the email that was sent; neither the address nor the token is stored.

CREATE TABLE "PrivacyDeletionRequest" (
    "id" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectHash" TEXT NOT NULL,
    "verificationChannel" TEXT NOT NULL,
    "verificationTokenHash" TEXT,
    "status" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "scopeSummary" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivacyDeletionRequest_pkey" PRIMARY KEY ("id")
);

-- A token may be redeemed once. The unique index is what makes that a database
-- guarantee rather than an application convention.
CREATE UNIQUE INDEX "PrivacyDeletionRequest_verificationTokenHash_key"
    ON "PrivacyDeletionRequest"("verificationTokenHash");

-- "is there already an open request for this subject" — asked on every request.
CREATE INDEX "PrivacyDeletionRequest_subjectHash_status_idx"
    ON "PrivacyDeletionRequest"("subjectHash", "status");

-- The expiry sweep.
CREATE INDEX "PrivacyDeletionRequest_status_expiresAt_idx"
    ON "PrivacyDeletionRequest"("status", "expiresAt");

CREATE INDEX "PrivacyDeletionRequest_createdAt_idx"
    ON "PrivacyDeletionRequest"("createdAt");
