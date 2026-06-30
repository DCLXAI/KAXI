ALTER TABLE "School" ADD COLUMN "sourceUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "School" ADD COLUMN "verifiedAt" DATETIME NOT NULL DEFAULT '2026-06-30T00:00:00.000Z';
ALTER TABLE "School" ADD COLUMN "reviewAfter" DATETIME NOT NULL DEFAULT '2026-09-30T00:00:00.000Z';

CREATE TABLE "AgentRequestLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userId" TEXT,
    "questionChars" INTEGER NOT NULL,
    "answerChars" INTEGER NOT NULL DEFAULT 0,
    "backend" TEXT NOT NULL,
    "codexMode" TEXT,
    "durationMs" INTEGER,
    "tokenEstimate" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorType" TEXT,
    "errorMessage" TEXT,
    "grounded" BOOLEAN NOT NULL DEFAULT false,
    "toolCount" INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX "School_reviewAfter_idx" ON "School"("reviewAfter");
CREATE INDEX "AgentRequestLedger_createdAt_idx" ON "AgentRequestLedger"("createdAt");
CREATE INDEX "AgentRequestLedger_ip_idx" ON "AgentRequestLedger"("ip");
CREATE INDEX "AgentRequestLedger_backend_idx" ON "AgentRequestLedger"("backend");
CREATE INDEX "AgentRequestLedger_success_idx" ON "AgentRequestLedger"("success");
