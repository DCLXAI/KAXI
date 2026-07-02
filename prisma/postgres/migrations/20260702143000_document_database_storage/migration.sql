-- CreateTable
CREATE TABLE "DocumentFileBlob" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentFileBlob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentFileBlob_storageKey_key" ON "DocumentFileBlob"("storageKey");

-- CreateIndex
CREATE INDEX "DocumentFileBlob_sha256_idx" ON "DocumentFileBlob"("sha256");

-- CreateIndex
CREATE INDEX "DocumentFileBlob_createdAt_idx" ON "DocumentFileBlob"("createdAt");
