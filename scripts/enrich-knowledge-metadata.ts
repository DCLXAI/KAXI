import { db } from "../src/lib/db";

type KnowledgeDocRow = Awaited<ReturnType<typeof loadKnowledgeDocuments>>[number];

const APPLY = process.argv.includes("--apply");
const CHECKED_BY = process.env.KNOWLEDGE_METADATA_CHECKED_BY || "partner_agent_001";
const CANDIDATE_SUFFIX_RE = /__candidate__.*$/;
const CANDIDATE_TITLE_RE = /^\s*\[검토 후보\]\s*/;

function baseDocId(docId: string): string {
  return docId.replace(CANDIDATE_SUFFIX_RE, "");
}

function canonicalTitle(title: string): string {
  return title.replace(CANDIDATE_TITLE_RE, "").trim() || title.trim();
}

function sourceTypeFromUrl(sourceUrl: string, fallback: string): string {
  const lower = sourceUrl.toLowerCase();
  if (lower.includes("law.go.kr")) return "official_law";
  if (
    lower.includes("hikorea.go.kr") ||
    lower.includes("immigration.go.kr") ||
    lower.includes("studyinkorea.go.kr") ||
    lower.includes("visa.go.kr") ||
    lower.includes("moe.go.kr")
  ) {
    return "official_government";
  }
  if (lower.startsWith("internal://")) return "internal_analysis";
  return fallback || "official_government";
}

function isOfficialSource(sourceUrl: string): boolean {
  return /^https?:\/\//i.test(sourceUrl);
}

function chunkFingerprint(doc: KnowledgeDocRow): string {
  return doc.chunks
    .slice()
    .sort((a, b) => a.chunkIndex - b.chunkIndex)
    .map((chunk) => chunk.contentHash)
    .join(":");
}

function dateScore(date: Date): number {
  const time = date.getTime();
  return Number.isFinite(time) ? time : 0;
}

function newestFirst(a: KnowledgeDocRow, b: KnowledgeDocRow): number {
  return dateScore(b.lastCheckedAt) - dateScore(a.lastCheckedAt) || dateScore(b.updatedAt) - dateScore(a.updatedAt);
}

async function loadKnowledgeDocuments() {
  return db.knowledgeDocument.findMany({
    include: { chunks: { select: { chunkIndex: true, contentHash: true }, orderBy: { chunkIndex: "asc" } } },
    orderBy: [{ reviewStatus: "asc" }, { lastCheckedAt: "desc" }, { docId: "asc" }],
  });
}

function groupByBaseId(docs: KnowledgeDocRow[]): Map<string, KnowledgeDocRow[]> {
  const groups = new Map<string, KnowledgeDocRow[]>();
  for (const doc of docs) {
    const key = baseDocId(doc.docId);
    groups.set(key, [...(groups.get(key) || []), doc]);
  }
  return groups;
}

function chooseKeeper(candidates: KnowledgeDocRow[]): KnowledgeDocRow {
  return candidates.slice().sort(newestFirst)[0];
}

function canonicalApprovedDocId(doc: KnowledgeDocRow, allDocIds: Set<string>): string {
  const baseId = baseDocId(doc.docId);
  if (doc.docId === baseId) return doc.docId;
  if (!allDocIds.has(baseId)) return baseId;
  return doc.docId;
}

async function main() {
  const docs = await loadKnowledgeDocuments();
  const allDocIds = new Set(docs.map((doc) => doc.docId));
  const plannedUpdates = new Map<string, Record<string, unknown>>();
  const notes: string[] = [];

  for (const doc of docs) {
    const data: Record<string, unknown> = {};
    const title = canonicalTitle(doc.title);
    const sourceType = sourceTypeFromUrl(doc.sourceUrl, doc.sourceType);

    if (title !== doc.title) data.title = title;
    if (sourceType !== doc.sourceType) data.sourceType = sourceType;
    if (isOfficialSource(doc.sourceUrl) && doc.jurisdiction !== "KR") data.jurisdiction = "KR";
    if (!doc.language || doc.language !== "ko") data.language = "ko";
    if (!doc.checkedBy || doc.checkedBy === "admin-api-key") data.checkedBy = CHECKED_BY;
    if (doc.reviewStatus === "APPROVED" && doc.supersededBy) data.supersededBy = null;

    if (doc.reviewStatus === "APPROVED") {
      const nextDocId = canonicalApprovedDocId(doc, allDocIds);
      if (nextDocId !== doc.docId) {
        data.docId = nextDocId;
        allDocIds.delete(doc.docId);
        allDocIds.add(nextDocId);
      }
    }

    if (Object.keys(data).length > 0) plannedUpdates.set(doc.id, data);
  }

  const groups = groupByBaseId(docs);
  for (const [baseId, group] of groups.entries()) {
    if (group.length <= 1) continue;

    const approvedDocs = group.filter((doc) => doc.reviewStatus === "APPROVED").sort(newestFirst);
    const approvedFingerprints = new Set(approvedDocs.map(chunkFingerprint));
    const canonicalApprovedId = approvedDocs[0]
      ? String(plannedUpdates.get(approvedDocs[0].id)?.docId || canonicalApprovedDocId(approvedDocs[0], allDocIds))
      : null;

    const pendingDocs = group.filter((item) => item.reviewStatus === "PENDING");
    const duplicateApprovedPending = pendingDocs.filter((doc) => approvedFingerprints.has(chunkFingerprint(doc)));
    const changedPending = pendingDocs.filter((doc) => !approvedFingerprints.has(chunkFingerprint(doc)));
    const changedKeeper = changedPending.length > 0 ? chooseKeeper(changedPending) : null;

    for (const doc of duplicateApprovedPending) {
      const previous = plannedUpdates.get(doc.id) || {};
      plannedUpdates.set(doc.id, {
        ...previous,
        reviewStatus: "REJECTED",
        supersededBy: canonicalApprovedId || baseId,
        checkedBy: CHECKED_BY,
      });
    }
    if (duplicateApprovedPending.length > 0) {
      notes.push(`${baseId}: ${duplicateApprovedPending.length} pending candidate(s) superseded by approved document`);
    }

    for (const doc of changedPending) {
      if (changedKeeper && doc.id === changedKeeper.id) continue;
      const previous = plannedUpdates.get(doc.id) || {};
      plannedUpdates.set(doc.id, {
        ...previous,
        reviewStatus: "REJECTED",
        supersededBy: changedKeeper?.docId || canonicalApprovedId || baseId,
        checkedBy: CHECKED_BY,
      });
    }
    if (changedPending.length > 1 && changedKeeper) {
      notes.push(`${baseId}: kept newest changed candidate ${changedKeeper.docId}, rejected ${changedPending.length - 1} older candidate(s)`);
    }
  }

  const invalidOfficialMetadata = docs.filter((doc) => {
    if (doc.reviewStatus === "REJECTED") return false;
    if (!isOfficialSource(doc.sourceUrl)) return true;
    if (!doc.sourceUrl.trim()) return true;
    if (!doc.lastCheckedAt || !Number.isFinite(doc.lastCheckedAt.getTime())) return true;
    if (!doc.checkedBy.trim()) return true;
    if (!doc.chunks.length) return true;
    return false;
  });

  const summary = {
    mode: APPLY ? "apply" : "dry-run",
    totalDocuments: docs.length,
    plannedUpdates: plannedUpdates.size,
    approvedBefore: docs.filter((doc) => doc.reviewStatus === "APPROVED").length,
    pendingBefore: docs.filter((doc) => doc.reviewStatus === "PENDING").length,
    rejectedBefore: docs.filter((doc) => doc.reviewStatus === "REJECTED").length,
    invalidOfficialMetadata: invalidOfficialMetadata.length,
    notes: notes.slice(0, 20),
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!APPLY) {
    console.log("Dry run only. Re-run with --apply to update KnowledgeDocument metadata.");
    return;
  }

  if (invalidOfficialMetadata.length > 0) {
    throw new Error(`Refusing to apply: ${invalidOfficialMetadata.length} document(s) have invalid official metadata.`);
  }

  await db.$transaction(
    Array.from(plannedUpdates.entries()).map(([id, data]) =>
      db.knowledgeDocument.update({
        where: { id },
        data,
      })
    )
  );

  const after = await db.knowledgeDocument.groupBy({
    by: ["reviewStatus"],
    _count: { _all: true },
  });
  console.log(JSON.stringify({ appliedUpdates: plannedUpdates.size, after }, null, 2));
}

try {
  await main();
} finally {
  await db.$disconnect();
}
