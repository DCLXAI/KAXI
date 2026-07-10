import { spawnSync } from "child_process";

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function fail(message: string): never {
  console.error(`[knowledge:promote:candidates] ${message}`);
  process.exit(1);
}

function runStep(label: string, args: string[]) {
  console.log(`\n[knowledge:promote:candidates] ${label}`);
  console.log(`$ ${args.join(" ")}`);
  const result = spawnSync(args[0], args.slice(1), {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) fail(`${label} failed to start: ${result.error.message}`);
  if (result.status !== 0) fail(`${label} failed with exit ${result.status ?? "unknown"}`);
}

function main() {
  const file = argValue("--file");
  if (!file) {
    fail(
      "Usage: bun run knowledge:promote:candidates -- --file legal-review/latest/harvested-candidate-decisions.approved.jsonl [--min-approved-candidate-chunks 500] [--min-approved-chunks 500] [--min-approved-embedded-chunks 500] [--min-approved-official-chunks 500] [--min-approved-official-embedded-chunks 500] [--force]"
    );
  }

  const minApprovedCandidateChunks = positiveInt(argValue("--min-approved-candidate-chunks"), 500);
  const minApprovedChunks = positiveInt(argValue("--min-approved-chunks"), 500);
  const minApprovedEmbeddedChunks = positiveInt(argValue("--min-approved-embedded-chunks"), minApprovedChunks);
  const minApprovedOfficialChunks = positiveInt(argValue("--min-approved-official-chunks"), minApprovedChunks);
  const minApprovedOfficialEmbeddedChunks = positiveInt(
    argValue("--min-approved-official-embedded-chunks"),
    argValue("--min-approved-official-chunks") ? minApprovedOfficialChunks : minApprovedEmbeddedChunks
  );
  const force = hasFlag("--force");

  runStep("validate reviewed candidate decision file", [
    "bun",
    "run",
    "legal-review:validate",
    "--",
    "--file",
    file,
    "--require-decisions",
    "--require-candidate-coverage",
    "--require-approved-candidate-chunks",
    String(minApprovedCandidateChunks),
  ]);

  runStep("check candidate approval projection", [
    "bun",
    "run",
    "knowledge:check:candidates",
    "--",
    "--min-candidate-chunks",
    String(minApprovedCandidateChunks),
    "--min-candidate-embedded-chunks",
    String(minApprovedCandidateChunks),
    "--min-projected-approved-chunks",
    String(minApprovedChunks),
    "--min-projected-approved-embedded-chunks",
    String(minApprovedEmbeddedChunks),
  ]);

  runStep("apply legal-review approvals with strict candidate gate", [
    "bun",
    "run",
    "legal-review:apply",
    "--",
    "--file",
    file,
    "--apply",
    "--require-decisions",
    "--require-candidate-coverage",
    "--require-approved-candidate-chunks",
    String(minApprovedCandidateChunks),
  ]);

  const finalizeArgs = [
    "bun",
    "run",
    "knowledge:finalize:corpus",
    "--",
    "--min-approved-chunks",
    String(minApprovedChunks),
    "--min-approved-embedded-chunks",
    String(minApprovedEmbeddedChunks),
    "--min-approved-official-chunks",
    String(minApprovedOfficialChunks),
    "--min-approved-official-embedded-chunks",
    String(minApprovedOfficialEmbeddedChunks),
  ];
  if (force) finalizeArgs.push("--force");
  runStep("finalize approved RAG corpus", finalizeArgs);

  runStep("audit production-approved Phase 0/1 state", [
    "bun",
    "run",
    "ops:audit:phase0-phase1",
    "--",
    "--require-production-approved",
    "--min-approved-chunks",
    String(minApprovedChunks),
    "--min-approved-official-chunks",
    String(minApprovedOfficialChunks),
    "--min-approved-official-embedded-chunks",
    String(minApprovedOfficialEmbeddedChunks),
  ]);

  console.log("\n[knowledge:promote:candidates] promotion complete");
}

main();
