import { checkRuntimeDatabaseConnectivity, db, getRuntimeDatabaseInfo } from "../src/lib/db";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

const info = getRuntimeDatabaseInfo();
console.log(`Database kind: ${info.kind}`);
console.log(`Database source: ${info.source}`);
console.log(`Shared writable: ${info.sharedWritable ? "yes" : "no"}`);

if (!info.sharedWritable) {
  fail(info.reason);
}

const connectivity = await checkRuntimeDatabaseConnectivity();
if (!connectivity.ok) {
  fail(`database connectivity failed: ${connectivity.detail}`);
}

try {
  const [schools, auditLogs, rateLimitBuckets] = await Promise.all([
    db.school.count(),
    db.adminAuditLog.count(),
    db.rateLimitBucket.count(),
  ]);

  if (schools <= 0) {
    fail("School table is empty. Run bun run db:seed:schools with production DB env loaded.");
  }

  console.log(`School rows: ${schools}`);
  console.log(`Admin audit rows: ${auditLogs}`);
  console.log(`Rate limit buckets: ${rateLimitBuckets}`);
  console.log("PASS production database check");
} catch (err) {
  fail(`database schema check failed: ${err instanceof Error ? err.message : String(err)}`);
} finally {
  await db.$disconnect();
}
