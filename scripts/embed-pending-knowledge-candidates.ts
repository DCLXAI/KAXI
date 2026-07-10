import { LegalReviewStatus } from "@prisma/client";
import { db } from "../src/lib/db";
import {
  embedMissingKnowledgeChunksForPgvector,
  getPgvectorStats,
} from "../src/lib/embeddings/pgvector-rag";

const force = process.argv.includes("--force");

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function main() {
  const minCandidateChunks = positiveInt(argValue("--min-candidate-chunks"), 500);
  const pendingCandidateChunks = await db.knowledgeChunk.count({
    where: {
      document: {
        reviewStatus: LegalReviewStatus.PENDING,
        docId: { contains: "__candidate__" },
      },
    },
  });

  console.log(
    `[knowledge:embed:candidates] pendingCandidateChunks=${pendingCandidateChunks} target=${minCandidateChunks}`
  );
  if (pendingCandidateChunks < minCandidateChunks) {
    throw new Error(`Pending candidate chunks ${pendingCandidateChunks} below target ${minCandidateChunks}`);
  }

  const embeddings = await embedMissingKnowledgeChunksForPgvector({
    force,
    reviewStatuses: [LegalReviewStatus.PENDING],
    candidateOnly: true,
  });
  const embeddedPendingCandidateChunks = await db.knowledgeChunk.count({
    where: {
      embeddingModel: "Xenova/multilingual-e5-small",
      embeddingDim: 384,
      document: {
        reviewStatus: LegalReviewStatus.PENDING,
        docId: { contains: "__candidate__" },
      },
    },
  });
  const stats = await getPgvectorStats();

  console.log(JSON.stringify({
    embeddings,
    pendingCandidateChunks,
    embeddedPendingCandidateChunks,
    stats,
  }, null, 2));

  if (embeddings.failedChunks > 0 || embeddedPendingCandidateChunks < minCandidateChunks) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(`[knowledge:embed:candidates] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
