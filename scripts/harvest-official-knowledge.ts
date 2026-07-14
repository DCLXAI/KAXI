import { db } from "../src/lib/db";
import { harvestOfficialKnowledgeCorpus } from "../src/lib/knowledge/official-source-harvest";

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function csv(value: string | undefined): string[] {
  return (value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

async function main() {
  const persistCandidates = process.argv.includes("--persist");
  const minCandidateChunks = positiveInt(argValue("--min-chunks"), 500);
  const summary = await harvestOfficialKnowledgeCorpus({
    actor: argValue("--actor") || "official-source-harvest",
    persistCandidates,
    sourceIds: csv(argValue("--source-ids")),
    maxSources: positiveInt(argValue("--max-sources"), 0) || undefined,
    maxChars: positiveInt(argValue("--max-chars"), 80_000),
    chunkMaxChars: positiveInt(argValue("--chunk-max-chars"), 1200),
    timeoutMs: positiveInt(argValue("--timeout-ms"), 15_000),
    minCandidateChunks,
  });

  console.log(`[official-source-harvest] checkedAt=${summary.checkedAt}`);
  console.log(
    `[official-source-harvest] sources=${summary.totalSources} changed=${summary.changedSources} ` +
      `failed=${summary.failedSources} candidatesCreated=${summary.candidatesCreated}`
  );
  console.log(
    `[official-source-harvest] candidateChunks=${summary.totalCandidateChunks} ` +
      `persistedPendingChunks=${summary.persistedPendingChunks} target=${summary.minCandidateChunks}`
  );
  console.log(
    `[official-source-harvest] extraction html=${summary.extractionStats.html} ` +
      `pdfText=${summary.extractionStats.pdf_text} plainText=${summary.extractionStats.plain_text} ` +
      `binaryMetadata=${summary.extractionStats.binary_metadata} extractedChars=${summary.totalExtractedChars}`
  );
  if (summary.extractionErrors.length > 0) {
    console.log(
      `[official-source-harvest] extractionErrors=${summary.extractionErrors
        .map((item) => `${item.docId}:${item.error}`)
        .join(",")}`
    );
  }
  if (summary.failedDocIds.length > 0) {
    console.log(`[official-source-harvest] failedDocIds=${summary.failedDocIds.join(",")}`);
    for (const failure of summary.failedSourceErrors) {
      console.log(
        `[official-source-harvest] failedSource=${failure.docId} ` +
          `url=${failure.sourceUrl} error=${failure.error}`
      );
    }
  }

  if (!summary.meetsChunkTarget) {
    console.error(
      `[official-source-harvest] FAIL chunk target not met. ` +
        `Use --max-sources/--max-chars or inspect failed official sources.`
    );
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(`[official-source-harvest] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
