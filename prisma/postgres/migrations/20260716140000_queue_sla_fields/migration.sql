-- AlterTable
ALTER TABLE "PartnerRequest" ADD COLUMN     "slaTier" TEXT;
ALTER TABLE "PartnerRequest" ADD COLUMN     "slaDueAt" TIMESTAMP(3);
ALTER TABLE "PartnerRequest" ADD COLUMN     "slaFirstResponseAt" TIMESTAMP(3);
ALTER TABLE "PartnerRequest" ADD COLUMN     "slaBreachAlertedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "EscalationCase" ADD COLUMN     "slaTier" TEXT;
ALTER TABLE "EscalationCase" ADD COLUMN     "slaDueAt" TIMESTAMP(3);
ALTER TABLE "EscalationCase" ADD COLUMN     "slaFirstResponseAt" TIMESTAMP(3);
ALTER TABLE "EscalationCase" ADD COLUMN     "slaBreachAlertedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "PartnerRequest_slaDueAt_idx" ON "PartnerRequest"("slaDueAt");

-- CreateIndex
CREATE INDEX "EscalationCase_slaDueAt_idx" ON "EscalationCase"("slaDueAt");
