// One-off maintenance script: remove orphaned zaloUid="doc:*" ghost User rows
// left behind by the removed ensureStudentProfile() document-workspace bootstrap.
//
// Safe by construction:
//   - defaults to dry-run (counts only, no writes)
//   - deletes only with an explicit --execute flag
//   - only ever targets zaloUid startsWith "doc:" AND authUserId IS NULL
//   - aborts before any write if any matched row looks like a real account
//     (authUserId set, or role != STUDENT)
//
// Usage:
//   bun run scripts/cleanup-ghost-document-users.ts             # dry run
//   bun run scripts/cleanup-ghost-document-users.ts --execute   # actually delete

import { db } from "../src/lib/db";
import { recordAuditLog } from "../src/lib/audit";

const GHOST_PREFIX = "doc:";

function fail(message: string): never {
  console.error(`[cleanup-ghost-document-users] ${message}`);
  process.exit(1);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl || !/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
    fail("DATABASE_URL is not set to a PostgreSQL connection string. Refusing to run.");
  }

  const execute = process.argv.includes("--execute");

  const ghostWhere = { zaloUid: { startsWith: GHOST_PREFIX } } as const;

  const ghostUsers = await db.user.findMany({
    where: ghostWhere,
    select: { id: true, zaloUid: true, authUserId: true, role: true, createdAt: true },
  });

  const totalGhosts = ghostUsers.length;

  console.log("=== doc:* ghost user cleanup ===");
  console.log(`mode: ${execute ? "EXECUTE (will delete)" : "DRY RUN (no writes)"}`);
  console.log(`matched User rows (zaloUid startsWith "${GHOST_PREFIX}"): ${totalGhosts}`);

  if (totalGhosts === 0) {
    console.log("nothing to do.");
    await db.$disconnect();
    return;
  }

  const ghostIds = ghostUsers.map((u) => u.id);

  const [studentProfileCount, uploadedFileCount, documentItemCount, consentCount] = await Promise.all([
    db.studentProfile.count({ where: { userId: { in: ghostIds } } }),
    db.uploadedFile.count({ where: { ownerUserId: { in: ghostIds } } }),
    db.documentItem.count({ where: { studentProfile: { userId: { in: ghostIds } } } }),
    db.consent.count({ where: { userId: { in: ghostIds } } }),
  ]);

  console.log("would cascade-delete these children on execute:");
  console.log(`  StudentProfile: ${studentProfileCount}`);
  console.log(`  UploadedFile:   ${uploadedFileCount}`);
  console.log(`  DocumentItem:   ${documentItemCount}`);
  console.log(`  Consent:        ${consentCount}`);

  // Safety check: any matched row that has a real auth account attached, or a
  // non-STUDENT role, is not a ghost from the old document-workspace bootstrap.
  const suspicious = ghostUsers.filter((u) => u.authUserId !== null || u.role !== "STUDENT");
  if (suspicious.length > 0) {
    console.error(
      `\n[cleanup-ghost-document-users] ABORTING: ${suspicious.length} matched user(s) look like real accounts, not ghosts.`
    );
    console.error("  (authUserId is set, or role is not STUDENT)");
    for (const u of suspicious.slice(0, 20)) {
      console.error(`  id=${u.id} zaloUid=${u.zaloUid} authUserId=${u.authUserId ?? "null"} role=${u.role}`);
    }
    if (suspicious.length > 20) console.error(`  ...and ${suspicious.length - 20} more`);
    await db.$disconnect();
    process.exit(1);
  }

  if (!execute) {
    console.log("\nDry run only — no rows deleted. Re-run with --execute to delete these rows.");
    await db.$disconnect();
    return;
  }

  console.log("\n--execute set: deleting ghost users now (transaction)...");

  const [deleteResult] = await db.$transaction([
    db.user.deleteMany({
      where: {
        id: { in: ghostIds },
        zaloUid: { startsWith: GHOST_PREFIX },
        authUserId: null,
      },
    }),
  ]);

  console.log(
    `deleted ${deleteResult.count} User rows (DB FK cascade removed their StudentProfile/UploadedFile/Consent/DocumentItem children).`
  );

  const remaining = await db.user.count({ where: ghostWhere });
  console.log(`post-delete recheck: ${remaining} doc:* users remain (expected 0).`);
  if (remaining !== 0) {
    console.error(
      `[cleanup-ghost-document-users] WARNING: expected 0 remaining doc:* users after execute, found ${remaining}.`
    );
  }

  await recordAuditLog({
    actor: "system:cleanup-ghost-document-users",
    actorRole: "ops-script",
    action: "ghost_user.cleanup",
    targetType: "User",
    success: remaining === 0,
    metadata: {
      matchedBeforeDelete: totalGhosts,
      deletedCount: deleteResult.count,
      studentProfileCount,
      uploadedFileCount,
      documentItemCount,
      consentCount,
      remainingAfter: remaining,
    },
  });
  console.log("audit log recorded (AdminAuditLog: ghost_user.cleanup).");

  await db.$disconnect();
}

main().catch(async (err) => {
  console.error("[cleanup-ghost-document-users] failed:", err instanceof Error ? err.message : err);
  try {
    await db.$disconnect();
  } catch {
    // ignore disconnect errors during failure path
  }
  process.exit(1);
});
