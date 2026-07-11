import { spawnSync } from "child_process";
import { randomUUID } from "crypto";
import { prepareTestDb } from "./prepare-test-db";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

function run(args: string[], expectedStatus: number | null = 0) {
  const result = spawnSync(args[0], args.slice(1), {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
  });
  if (expectedStatus !== null && result.status !== expectedStatus) {
    fail(
      `${args.join(" ")} expected exit ${expectedStatus}, got ${result.status}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`
    );
  }
  return {
    status: result.status,
    output: `${result.stdout}\n${result.stderr}`,
  };
}

prepareTestDb("ghost user cleanup");

const { db } = await import("../src/lib/db");

async function seedBaselineFixtures() {
  // Ghost 1: doc:* with StudentProfile + UploadedFile + DocumentItem children.
  const ghost1 = await db.user.create({
    data: { role: "STUDENT", locale: "vi", zaloUid: "doc:ghost-aaa" },
  });
  const ghost1Profile = await db.studentProfile.create({
    data: { userId: ghost1.id, nationality: "VN" },
  });
  const ghost1File = await db.uploadedFile.create({
    data: {
      ownerUserId: ghost1.id,
      storageKey: `ghost1/${randomUUID()}.pdf`,
      originalName: "passport.pdf",
      mimeType: "application/pdf",
      sizeBytes: 128,
      sha256: "a".repeat(64),
      piiClass: "sensitive",
    },
  });
  await db.documentItem.create({
    data: {
      studentProfileId: ghost1Profile.id,
      documentType: "passport",
      fileId: ghost1File.id,
    },
  });

  // Ghost 2: doc:* with a StudentProfile but no uploaded file yet.
  const ghost2 = await db.user.create({
    data: { role: "STUDENT", locale: "vi", zaloUid: "doc:ghost-bbb" },
  });
  await db.studentProfile.create({ data: { userId: ghost2.id, nationality: "VN" } });

  // Ghost 3: doc:* with no children at all (minimal ghost row).
  await db.user.create({ data: { role: "STUDENT", locale: "vi", zaloUid: "doc:ghost-ccc" } });

  // Control: a real authenticated student, unrelated zaloUid.
  const realUser = await db.user.create({
    data: { role: "STUDENT", locale: "ko", authUserId: randomUUID(), email: "real-student@kaxi.local" },
  });
  await db.consent.create({
    data: { userId: realUser.id, scope: "TERMS", version: "v1" },
  });

  // Control: a lead-bootstrapped user (different prefix), must never be touched.
  const leadUser = await db.user.create({
    data: { role: "STUDENT", locale: "ko", zaloUid: `lead:${randomUUID()}` },
  });

  return { ghost1, ghost2, realUser, leadUser };
}

try {
  const { realUser, leadUser } = await seedBaselineFixtures();

  // Scenario 1: dry run counts ghosts only, leaves control rows untouched, deletes nothing.
  const dryRun = run(["bun", "run", "scripts/cleanup-ghost-document-users.ts"]);
  assert(dryRun.output.includes("DRY RUN"), `dry run output should announce dry-run mode:\n${dryRun.output}`);
  assert(
    dryRun.output.includes('matched User rows (zaloUid startsWith "doc:"): 3'),
    `dry run should count exactly 3 doc:* users:\n${dryRun.output}`
  );
  assert(dryRun.output.includes("StudentProfile: 2"), `dry run should count 2 StudentProfile children:\n${dryRun.output}`);
  assert(dryRun.output.includes("UploadedFile:   1"), `dry run should count 1 UploadedFile child:\n${dryRun.output}`);
  assert(dryRun.output.includes("DocumentItem:   1"), `dry run should count 1 DocumentItem child:\n${dryRun.output}`);
  assert(dryRun.output.includes("Consent:        0"), `dry run should count 0 Consent children (control's consent excluded):\n${dryRun.output}`);
  assert(dryRun.output.includes("Dry run only"), `dry run must not perform any deletion:\n${dryRun.output}`);

  const stillPresent = await db.user.count({ where: { zaloUid: { startsWith: "doc:" } } });
  assert(stillPresent === 3, `dry run must not delete anything, expected 3 ghosts still present, got ${stillPresent}`);
  console.log("PASS scenario 1: dry run counts ghosts and their children without deleting");

  // Scenario 2: seed a doc:* user with authUserId set — safety guard must abort with no writes.
  const suspiciousGhost = await db.user.create({
    data: { role: "STUDENT", locale: "vi", zaloUid: "doc:ghost-suspicious", authUserId: randomUUID() },
  });
  const abortedRun = run(["bun", "run", "scripts/cleanup-ghost-document-users.ts", "--execute"], 1);
  assert(abortedRun.output.includes("ABORTING"), `execute must abort when a suspicious doc:* row exists:\n${abortedRun.output}`);
  assert(
    abortedRun.output.includes(suspiciousGhost.id),
    `abort message should identify the suspicious row:\n${abortedRun.output}`
  );
  const countAfterAbort = await db.user.count({ where: { zaloUid: { startsWith: "doc:" } } });
  assert(countAfterAbort === 4, `abort must not delete any rows, expected 4 doc:* users, got ${countAfterAbort}`);
  console.log("PASS scenario 2: --execute aborts and deletes nothing when a suspicious doc:* row exists");

  // Remove the suspicious row (simulating that it was a real account cleaned up separately)
  // so we can exercise the successful execute path.
  await db.user.delete({ where: { id: suspiciousGhost.id } });

  // Scenario 3: --execute deletes only the true ghosts; controls survive; recheck is 0.
  const executeRun = run(["bun", "run", "scripts/cleanup-ghost-document-users.ts", "--execute"]);
  assert(executeRun.output.includes("EXECUTE (will delete)"), `execute run should announce execute mode:\n${executeRun.output}`);
  assert(executeRun.output.includes("deleted 3 User rows"), `execute should report deleting 3 ghosts:\n${executeRun.output}`);
  assert(
    executeRun.output.includes("post-delete recheck: 0 doc:* users remain (expected 0)"),
    `execute should recheck and find 0 remaining ghosts:\n${executeRun.output}`
  );
  assert(executeRun.output.includes("audit log recorded"), `execute should record an audit log:\n${executeRun.output}`);

  const remainingGhosts = await db.user.count({ where: { zaloUid: { startsWith: "doc:" } } });
  assert(remainingGhosts === 0, `ghosts should be fully deleted, got ${remainingGhosts}`);

  const remainingProfiles = await db.studentProfile.count();
  assert(remainingProfiles === 0, `ghost StudentProfiles should cascade-delete, got ${remainingProfiles}`);
  const remainingFiles = await db.uploadedFile.count();
  assert(remainingFiles === 0, `ghost UploadedFiles should cascade-delete, got ${remainingFiles}`);
  const remainingDocuments = await db.documentItem.count();
  assert(remainingDocuments === 0, `ghost DocumentItems should cascade-delete, got ${remainingDocuments}`);

  const survivingReal = await db.user.findUnique({ where: { id: realUser.id } });
  assert(survivingReal, "real authenticated user must survive cleanup");
  const survivingLead = await db.user.findUnique({ where: { id: leadUser.id } });
  assert(survivingLead, "lead:* user must survive cleanup");
  const survivingConsent = await db.consent.count({ where: { userId: realUser.id } });
  assert(survivingConsent === 1, "real user's Consent must not be touched by ghost cleanup");

  const auditRow = await db.adminAuditLog.findFirst({ where: { action: "ghost_user.cleanup" } });
  assert(auditRow, "ghost cleanup execute should write an AdminAuditLog row");
  assert(auditRow.success, "ghost cleanup audit row should report success");

  console.log("PASS scenario 3: --execute deletes only doc:* ghosts (and cascades), controls survive, recheck is 0");

  // Scenario 4: a second dry run / execute against an already-clean database is a safe no-op.
  const noopRun = run(["bun", "run", "scripts/cleanup-ghost-document-users.ts", "--execute"]);
  assert(noopRun.output.includes("nothing to do"), `re-running against a clean db should be a no-op:\n${noopRun.output}`);
  console.log("PASS scenario 4: re-running cleanup on an already-clean database is a safe no-op");

  console.log("PASS ghost user cleanup: dry-run-first, cascade delete, safety guard, audit log");
} finally {
  await db.$disconnect();
}
