-- Phase 3 slice 2: Supabase Auth runtime bridge support.
-- Invite tokens are stored as SHA-256 hashes only. Plain invite tokens must
-- never be committed, logged, or stored in the database.

CREATE TABLE "PartnerAgentInvite" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "email" TEXT,
  "tokenHash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "acceptedUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PartnerAgentInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PartnerAgentInvite_tokenHash_key" ON "PartnerAgentInvite"("tokenHash");
CREATE INDEX "PartnerAgentInvite_organizationId_idx" ON "PartnerAgentInvite"("organizationId");
CREATE INDEX "PartnerAgentInvite_email_idx" ON "PartnerAgentInvite"("email");
CREATE INDEX "PartnerAgentInvite_status_idx" ON "PartnerAgentInvite"("status");
CREATE INDEX "PartnerAgentInvite_expiresAt_idx" ON "PartnerAgentInvite"("expiresAt");
CREATE INDEX "PartnerAgentInvite_acceptedUserId_idx" ON "PartnerAgentInvite"("acceptedUserId");

ALTER TABLE "PartnerAgentInvite"
  ADD CONSTRAINT "PartnerAgentInvite_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PartnerAgentInvite"
  ADD CONSTRAINT "PartnerAgentInvite_acceptedUserId_fkey"
  FOREIGN KEY ("acceptedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PartnerAgentInvite" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kaxi_partner_agent_invite_admin_read ON "PartnerAgentInvite";
CREATE POLICY kaxi_partner_agent_invite_admin_read ON "PartnerAgentInvite"
  FOR SELECT
  USING (public.kaxi_is_platform_admin());

COMMENT ON TABLE "PartnerAgentInvite" IS 'Partner agent onboarding invites. tokenHash stores SHA-256 only; plaintext tokens are operator-delivered secrets.';
