import { db } from "../src/lib/db";
import {
  embedMissingKnowledgeChunksForPgvector,
  getPgvectorStats,
  ingestStaticKnowledgeDocsForPgvector,
} from "../src/lib/embeddings/pgvector-rag";

const force = process.argv.includes("--force");

async function main() {
  console.log("[knowledge:pgvector] ingesting governed static knowledge docs");
  const ingest = await ingestStaticKnowledgeDocsForPgvector();
  console.log(
    `[knowledge:pgvector] documents created=${ingest.documentsCreated} updated=${ingest.documentsUpdated}; ` +
      `chunks created=${ingest.chunksCreated} updated=${ingest.chunksUpdated} deleted=${ingest.chunksDeleted}`
  );

  console.log(`[knowledge:pgvector] embedding ${force ? "all" : "missing/changed"} chunks`);
  const embeddings = await embedMissingKnowledgeChunksForPgvector({ force });
  console.log(
    `[knowledge:pgvector] chunks total=${embeddings.totalChunks} embedded=${embeddings.embeddedChunks} ` +
      `skipped=${embeddings.skippedChunks} failed=${embeddings.failedChunks}`
  );

  const stats = await getPgvectorStats();
  console.log(
    `[knowledge:pgvector] ready documents=${stats.approvedDocuments} ` +
      `approvedEmbeddedChunks=${stats.approvedEmbeddedChunks}/${stats.totalChunks} ` +
      `model=${stats.embeddingModel} dim=${stats.embeddingDim}`
  );

  if (embeddings.failedChunks > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(`[knowledge:pgvector] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
