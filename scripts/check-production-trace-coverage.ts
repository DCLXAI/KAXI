import { collectTraceCoverage } from "../src/infrastructure/observability/trace-coverage-repository";
import { db, getRuntimeDatabaseInfo } from "../src/lib/db";

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

const hours = Math.min(168, Math.max(1, Number.parseInt(argument("hours") || "24", 10) || 24));
const minSamples = Math.min(10_000, Math.max(1, Number.parseInt(argument("min-samples") || "20", 10) || 20));
const minimumCoverage = Math.min(1, Math.max(0.5, Number.parseFloat(argument("minimum") || "0.95") || 0.95));
const info = getRuntimeDatabaseInfo();
if (!info.sharedWritable && !process.argv.includes("--allow-loopback")) {
  fail("production trace coverage requires a shared PostgreSQL target; use --allow-loopback only for an isolated rehearsal");
}

try {
  const report = await collectTraceCoverage({ since: new Date(Date.now() - hours * 60 * 60_000) });
  console.log(JSON.stringify({
    since: report.since.toISOString(),
    eligibleUnits: report.eligibleUnits,
    connectedUnits: report.connectedUnits,
    coverage: Number(report.coverage.toFixed(4)),
    piiViolationCount: report.piiViolationCount,
    truncated: report.truncated,
    byKind: report.byKind,
  }, null, 2));
  if (report.truncated) fail("evidence query was truncated; narrow the window before deciding the gate");
  if (report.eligibleUnits < minSamples) fail(`only ${report.eligibleUnits} eligible units, require ${minSamples}`);
  if (report.coverage < minimumCoverage) fail(`trace coverage ${(report.coverage * 100).toFixed(2)}% is below ${(minimumCoverage * 100).toFixed(2)}%`);
  if (report.piiViolationCount > 0) fail(`${report.piiViolationCount} unsafe trace attribute(s) detected`);
  console.log("PASS production trace coverage gate");
} finally {
  await db.$disconnect();
}
