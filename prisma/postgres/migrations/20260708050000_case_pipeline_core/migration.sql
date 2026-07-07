-- Phase 3 / F4 core: local-verifiable escalation case pipeline.
-- RLS/Auth/Storage policies are intentionally deferred to the Supabase project slice.

ALTER TABLE "EscalationCase"
  ADD COLUMN "matchedAt" TIMESTAMP(3),
  ADD COLUMN "acceptedAt" TIMESTAMP(3),
  ADD COLUMN "closedReason" TEXT;

CREATE TABLE "CaseTimelineEvent" (
  "id" TEXT NOT NULL,
  "escalationCaseId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorRole" TEXT,
  "eventType" TEXT NOT NULL,
  "message" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CaseTimelineEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CaseDocumentLink" (
  "id" TEXT NOT NULL,
  "escalationCaseId" TEXT NOT NULL,
  "documentItemId" TEXT NOT NULL,
  "purpose" TEXT NOT NULL DEFAULT 'shared',
  "requested" BOOLEAN NOT NULL DEFAULT false,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CaseDocumentLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EscalationCase_matchedAt_idx" ON "EscalationCase"("matchedAt");
CREATE INDEX "EscalationCase_acceptedAt_idx" ON "EscalationCase"("acceptedAt");
CREATE INDEX "EscalationCase_closedAt_idx" ON "EscalationCase"("closedAt");

CREATE INDEX "CaseTimelineEvent_escalationCaseId_idx" ON "CaseTimelineEvent"("escalationCaseId");
CREATE INDEX "CaseTimelineEvent_actorUserId_idx" ON "CaseTimelineEvent"("actorUserId");
CREATE INDEX "CaseTimelineEvent_eventType_idx" ON "CaseTimelineEvent"("eventType");
CREATE INDEX "CaseTimelineEvent_createdAt_idx" ON "CaseTimelineEvent"("createdAt");

CREATE UNIQUE INDEX "CaseDocumentLink_escalationCaseId_documentItemId_key"
  ON "CaseDocumentLink"("escalationCaseId", "documentItemId");
CREATE INDEX "CaseDocumentLink_escalationCaseId_idx" ON "CaseDocumentLink"("escalationCaseId");
CREATE INDEX "CaseDocumentLink_documentItemId_idx" ON "CaseDocumentLink"("documentItemId");
CREATE INDEX "CaseDocumentLink_requested_idx" ON "CaseDocumentLink"("requested");
CREATE INDEX "CaseDocumentLink_createdAt_idx" ON "CaseDocumentLink"("createdAt");

ALTER TABLE "CaseTimelineEvent"
  ADD CONSTRAINT "CaseTimelineEvent_escalationCaseId_fkey"
  FOREIGN KEY ("escalationCaseId") REFERENCES "EscalationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CaseTimelineEvent"
  ADD CONSTRAINT "CaseTimelineEvent_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CaseDocumentLink"
  ADD CONSTRAINT "CaseDocumentLink_escalationCaseId_fkey"
  FOREIGN KEY ("escalationCaseId") REFERENCES "EscalationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CaseDocumentLink"
  ADD CONSTRAINT "CaseDocumentLink_documentItemId_fkey"
  FOREIGN KEY ("documentItemId") REFERENCES "DocumentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
