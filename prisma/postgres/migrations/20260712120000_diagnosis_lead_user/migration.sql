-- AlterTable
ALTER TABLE "diagnosis_leads" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE INDEX "diagnosis_leads_userId_idx" ON "diagnosis_leads"("userId");

-- AddForeignKey
ALTER TABLE "diagnosis_leads" ADD CONSTRAINT "diagnosis_leads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
