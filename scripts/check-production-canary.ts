import { canaryGateErrors } from "../src/application/ops/canary-gate";
import { collectCanaryEvidence } from "../src/infrastructure/ops/canary-evidence-repository";
import { db, getRuntimeDatabaseInfo } from "../src/lib/db";

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function positiveInteger(name: string, fallback: number) {
  return Math.max(1, Number.parseInt(argument(name) || String(fallback), 10) || fallback);
}

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

const rawSince = argument("since") || "";
const since = new Date(rawSince);
if (!rawSince || !Number.isFinite(since.getTime()) || since.getTime() >= Date.now()) {
  fail("--since requires the exact past UTC rollout timestamp; the script will not guess a canary window");
}
const info = getRuntimeDatabaseInfo();
if (!info.sharedWritable && !process.argv.includes("--allow-loopback")) {
  fail("production canary evidence requires a shared PostgreSQL target; use --allow-loopback only for an isolated rehearsal");
}

try {
  const thresholds = {
    minimumHours: positiveInteger("minimum-hours", 24),
    minimumWrites: positiveInteger("minimum-writes", 20),
    minimumTraceUnits: positiveInteger("minimum-trace-units", 20),
    minimumTraceCoverage: Math.min(1, Math.max(0.5, Number.parseFloat(argument("minimum-trace-coverage") || "0.95") || 0.95)),
  };
  const evidence = await collectCanaryEvidence(since);
  const errors = canaryGateErrors(evidence, thresholds);
  console.log(JSON.stringify({ since: since.toISOString(), thresholds, evidence, errors }, null, 2));
  if (errors.length > 0) fail(errors.join(", "));
  console.log("PASS production canary observation gate");
} finally {
  await db.$disconnect();
}
