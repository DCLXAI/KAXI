import { checkRuntimeDatabaseConnectivity, db, getRuntimeDatabaseInfo } from "../src/lib/db";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

const info = getRuntimeDatabaseInfo();
console.log(`Database kind: ${info.kind}`);
console.log(`Database source: ${info.source}`);
console.log(`PostgreSQL configured: ${info.postgresqlConfigured ? "yes" : "no"}`);
console.log(`Active Prisma provider: ${info.activePrismaProvider}`);
console.log(`Shared writable: ${info.sharedWritable ? "yes" : "no"}`);

if (info.kind !== "postgresql" || info.activePrismaProvider !== "postgresql") {
  fail("Production database check requires DATABASE_URL=postgres://... and a PostgreSQL-generated Prisma Client.");
}

if (!info.sharedWritable) {
  fail(info.reason);
}

const connectivity = await checkRuntimeDatabaseConnectivity();
if (!connectivity.ok) {
  fail(`database connectivity failed: ${connectivity.detail}`);
}

try {
  // Keep these sequential so Supabase pooler/session-mode databases do not
  // briefly exceed small connection pool limits during a health check.
  const schools = await db.school.count();
  const auditLogs = await db.adminAuditLog.count();
  const rateLimitBuckets = await db.rateLimitBucket.count();
  const organizations = await db.organization.count();
  const users = await db.user.count();
  const studentProfiles = await db.studentProfile.count();
  const consents = await db.consent.count();
  const complianceRules = await db.complianceRule.count();
  const knowledgeDocuments = await db.knowledgeDocument.count();
  const escalationCases = await db.escalationCase.count();
  const auditEvents = await db.auditEvent.count();

  if (schools <= 0) {
    fail("School table is empty. Run bun run db:seed:schools with production DB env loaded.");
  }

  console.log(`School rows: ${schools}`);
  console.log(`Admin audit rows: ${auditLogs}`);
  console.log(`Rate limit buckets: ${rateLimitBuckets}`);
  console.log(`Organizations: ${organizations}`);
  console.log(`Users: ${users}`);
  console.log(`Student profiles: ${studentProfiles}`);
  console.log(`Consents: ${consents}`);
  console.log(`Compliance rules: ${complianceRules}`);
  console.log(`Knowledge documents: ${knowledgeDocuments}`);
  console.log(`Escalation cases: ${escalationCases}`);
  console.log(`Audit events: ${auditEvents}`);
  console.log("PASS production database check");
} catch (err) {
  fail(`database schema check failed: ${err instanceof Error ? err.message : String(err)}`);
} finally {
  await db.$disconnect();
}
