-- CreateTable
CREATE TABLE "DocumentFileBlob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "bytes" BLOB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentFileBlob_storageKey_key" ON "DocumentFileBlob"("storageKey");

-- CreateIndex
CREATE INDEX "DocumentFileBlob_sha256_idx" ON "DocumentFileBlob"("sha256");

-- CreateIndex
CREATE INDEX "DocumentFileBlob_createdAt_idx" ON "DocumentFileBlob"("createdAt");
