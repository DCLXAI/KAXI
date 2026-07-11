-- Connect diagnosis/AI consultation requests to partner workspaces and add
-- durable in-app notifications for case and document lifecycle changes.

ALTER TABLE "PartnerRequest"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "organizationId" TEXT,
  ADD COLUMN "assignedUserId" TEXT,
  ADD COLUMN "matchedAt" TIMESTAMP(3),
  ADD COLUMN "acceptedAt" TIMESTAMP(3),
  ADD COLUMN "closedAt" TIMESTAMP(3);

CREATE INDEX "PartnerRequest_organizationId_idx" ON "PartnerRequest"("organizationId");
CREATE INDEX "PartnerRequest_assignedUserId_idx" ON "PartnerRequest"("assignedUserId");
CREATE INDEX "PartnerRequest_matchedAt_idx" ON "PartnerRequest"("matchedAt");

ALTER TABLE "PartnerRequest"
  ADD CONSTRAINT "PartnerRequest_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PartnerRequest"
  ADD CONSTRAINT "PartnerRequest_assignedUserId_fkey"
  FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "UserNotification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "href" TEXT,
  "metadata" JSONB,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserNotification_userId_createdAt_idx" ON "UserNotification"("userId", "createdAt" DESC);
CREATE INDEX "UserNotification_userId_readAt_idx" ON "UserNotification"("userId", "readAt");
CREATE INDEX "UserNotification_eventKey_idx" ON "UserNotification"("eventKey");
CREATE UNIQUE INDEX "UserNotification_userId_eventKey_key" ON "UserNotification"("userId", "eventKey");

ALTER TABLE "UserNotification"
  ADD CONSTRAINT "UserNotification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserNotification" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kaxi_user_notification_select_own ON "UserNotification";
CREATE POLICY kaxi_user_notification_select_own ON "UserNotification"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."id" = "UserNotification"."userId"
        AND u."authUserId" = public.kaxi_auth_uid()
    )
  );

DROP POLICY IF EXISTS kaxi_user_notification_update_own ON "UserNotification";
CREATE POLICY kaxi_user_notification_update_own ON "UserNotification"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."id" = "UserNotification"."userId"
        AND u."authUserId" = public.kaxi_auth_uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."id" = "UserNotification"."userId"
        AND u."authUserId" = public.kaxi_auth_uid()
    )
  );
