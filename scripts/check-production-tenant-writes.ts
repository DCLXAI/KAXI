import { collectTenantWriteEvidence } from "../src/infrastructure/tenancy/tenant-write-evidence";
import { db, getRuntimeDatabaseInfo } from "../src/lib/db";

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

const hours = Math.min(720, Math.max(1, Number.parseInt(argument("hours") || "24", 10) || 24));
const minWrites = Math.min(100_000, Math.max(1, Number.parseInt(argument("min-writes") || "20", 10) || 20));
const info = getRuntimeDatabaseInfo();
if (!info.sharedWritable && !process.argv.includes("--allow-loopback")) {
  fail("production tenant evidence requires a shared PostgreSQL target; use --allow-loopback only for an isolated rehearsal");
}

try {
  const report = await collectTenantWriteEvidence(new Date(Date.now() - hours * 60 * 60_000));
  console.log(JSON.stringify(report, null, 2));
  if (report.missingColumns.length > 0) fail(`${report.missingColumns.length} tenant column(s) are missing`);
  if (report.unsafeColumns.length > 0) fail(`${report.unsafeColumns.length} tenant column(s) still allow an implicit value`);
  if (report.legacyDefaultRows > 0) fail(`${report.legacyDefaultRows} legacy/default tenant row(s) remain`);
  if (report.observedWrites < minWrites) fail(`only ${report.observedWrites} writes observed, require ${minWrites}`);
  console.log("PASS production tenant write gate");
} finally {
  await db.$disconnect();
}
