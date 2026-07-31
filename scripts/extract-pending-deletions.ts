import { writeFileSync } from "fs";
import { db } from "../src/lib/db";

// P0-0 asks for a dry-run extract of the rows already marked for deletion, so an
// operator can review what the unverified endpoint scheduled before P0-1 decides
// what to do with them.
//
// READ ONLY by construction: this script issues no update, and nothing here can
// be flipped into a write by an argument. Reversing an unverified deletion is a
// judgement call about someone else's data, so it belongs to the operator, not
// to this script.
//
// The output carries NO personal data — no contact, no question text, no
// nickname, not even the lookup hashes, since a hash of a contact is still a
// per-person identifier. Ids and timestamps are enough to act on, and the file
// is meant to be read by a human and then deleted.

const OUTPUT = process.argv.includes("--out")
  ? process.argv[process.argv.indexOf("--out") + 1]
  : ".local/pending-deletions.json";

type Bucket = {
  table: string;
  count: number;
  earliest: string | null;
  latest: string | null;
  ids: string[];
};

async function bucket(table: string, rows: Array<{ id: string; deleteRequestedAt: Date | null }>): Promise<Bucket> {
  const stamps = rows
    .map((row) => row.deleteRequestedAt)
    .filter((value): value is Date => Boolean(value))
    .map((value) => value.getTime())
    .sort((left, right) => left - right);

  return {
    table,
    count: rows.length,
    earliest: stamps.length ? new Date(stamps[0]!).toISOString() : null,
    latest: stamps.length ? new Date(stamps[stamps.length - 1]!).toISOString() : null,
    ids: rows.map((row) => row.id),
  };
}

async function main() {
  const pending = { deleteRequestedAt: { not: null }, deletedAt: null } as const;
  const select = { id: true, deleteRequestedAt: true } as const;

  const [leads, chatLogs, partnerRequests, chatSessions] = await Promise.all([
    db.diagnosisLead.findMany({ where: pending, select }),
    db.chatLog.findMany({ where: pending, select }),
    db.partnerRequest.findMany({ where: pending, select }),
    db.chatSession.findMany({ where: pending, select }),
  ]);

  const buckets = await Promise.all([
    bucket("DiagnosisLead", leads),
    bucket("ChatLog", chatLogs),
    bucket("PartnerRequest", partnerRequests),
    bucket("ChatSession", chatSessions),
  ]);

  const total = buckets.reduce((sum, entry) => sum + entry.count, 0);
  const report = {
    generatedAt: new Date().toISOString(),
    note:
      "Rows scheduled for deletion by POST /api/privacy/delete-request before P0-0 containment. " +
      "The endpoint could not prove the requester owned these records, so some of them may have been " +
      "scheduled by someone other than the data subject. Review before any hard delete. No personal " +
      "data or lookup hashes are included.",
    totalPending: total,
    buckets,
  };

  writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`[extract-pending-deletions] ${total} row(s) currently marked for deletion`);
  for (const entry of buckets) {
    console.log(
      `  ${entry.table.padEnd(16)} ${String(entry.count).padStart(5)}` +
        (entry.count ? `   ${entry.earliest} .. ${entry.latest}` : ""),
    );
  }
  console.log(`[extract-pending-deletions] wrote ${OUTPUT} (ids and timestamps only)`);

  if (total > 0) {
    console.log(
      "[extract-pending-deletions] These were scheduled by an endpoint that could not verify ownership. " +
        "Do not hard-delete them until P0-1 lands and each request has been re-verified.",
    );
  }
}

main()
  .catch((error) => {
    console.error(`[extract-pending-deletions] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
