import { db } from "../src/lib/db";
import { getCandidateApprovalReadiness } from "../src/lib/knowledge/corpus-readiness";

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
  const minCandidateEmbeddedChunks = positiveInt(argValue("--min-candidate-embedded-chunks"), minCandidateChunks);
  const minProjectedApprovedChunks = positiveInt(argValue("--min-projected-approved-chunks"), 500);
  const minProjectedApprovedEmbeddedChunks = positiveInt(
    argValue("--min-projected-approved-embedded-chunks"),
    minProjectedApprovedChunks
  );

  const readiness = await getCandidateApprovalReadiness({
    minCandidateChunks,
    minCandidateEmbeddedChunks,
    minProjectedApprovedChunks,
    minProjectedApprovedEmbeddedChunks,
  });

  console.log(JSON.stringify(readiness, null, 2));
  if (!readiness.ok) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(`[candidate-approval-readiness] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
