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

if (!info.sharedWritable) {
  fail(info.reason);
}

const connectivity = await checkRuntimeDatabaseConnectivity();
if (!connectivity.ok) {
  fail(`database connectivity failed: ${connectivity.detail}`);
}

try {
  const [
    schools,
    auditLogs,
    rateLimitBuckets,
    organizations,
    users,
    studentProfiles,
    consents,
    complianceRules,
    knowledgeDocuments,
    escalationCases,
    auditEvents,
  ] = await Promise.all([
    db.school.count(),
    db.adminAuditLog.count(),
    db.rateLimitBucket.count(),
    db.organization.count(),
    db.user.count(),
    db.studentProfile.count(),
    db.consent.count(),
    db.complianceRule.count(),
    db.knowledgeDocument.count(),
    db.escalationCase.count(),
    db.auditEvent.count(),
  ]);

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
