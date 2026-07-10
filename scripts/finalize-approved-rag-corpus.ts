import { db } from "../src/lib/db";
import {
  embedMissingKnowledgeChunksForPgvector,
  getPgvectorStats,
} from "../src/lib/embeddings/pgvector-rag";
import { getRagCorpusReadiness } from "../src/lib/knowledge/corpus-readiness";

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function main() {
  const minApprovedChunks = positiveInt(argValue("--min-approved-chunks"), 500);
  const minApprovedEmbeddedChunks = positiveInt(argValue("--min-approved-embedded-chunks"), minApprovedChunks);
  const minApprovedOfficialChunks = positiveInt(argValue("--min-approved-official-chunks"), minApprovedChunks);
  const minApprovedOfficialEmbeddedChunks = positiveInt(
    argValue("--min-approved-official-embedded-chunks"),
    argValue("--min-approved-official-chunks") ? minApprovedOfficialChunks : minApprovedEmbeddedChunks
  );
  const force = process.argv.includes("--force");

  console.log(`[rag-corpus:finalize] embedding approved chunks (${force ? "force" : "missing/changed"})`);
  const embeddings = await embedMissingKnowledgeChunksForPgvector({ force });
  const stats = await getPgvectorStats();
  const readiness = await getRagCorpusReadiness({
    minApprovedChunks,
    minApprovedEmbeddedChunks,
    minApprovedOfficialChunks,
    minApprovedOfficialEmbeddedChunks,
  });

  console.log(JSON.stringify({
    embeddings,
    stats,
    readiness,
  }, null, 2));

  if (embeddings.failedChunks > 0 || !readiness.ok) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(`[rag-corpus:finalize] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
