import assert from "node:assert/strict";
import {
  compareCorpusToStored,
  describeCorpusDrift,
  staticCorpusChunks,
  type StoredCorpusDocument,
} from "../src/lib/knowledge/corpus-drift";
import { getKnowledgeDocsWithMetadata, type KnowledgeDoc } from "../src/lib/data/knowledge";

// PR #65 corrected documents in src/lib/data/knowledge-corpus.ts that called 행정사
// a "lawyer" — including the one explaining 행정사법 제2조. Weeks later production
// was still serving the uncorrected text, because the corpus reaches users only
// through an operator-run ingestion and NOTHING compared the two. The pre-deploy
// drift gate reported "204/204 serving-ready" the whole time: it compares canonical
// chunks against serving rows, and never reads the code corpus at all.
//
// This pins the comparison that closes that gap. It runs credential-free — the
// database read is a separate function, so the logic under test here is pure.

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

const corpus = getKnowledgeDocsWithMetadata({ referenceDate: new Date("2026-07-31T00:00:00Z") });
assertOk(corpus.length > 0, "the corpus must be non-empty — an empty import would make every assertion vacuous");

/** What the database looks like right after a faithful ingestion. */
function storedFromCorpus(docs: readonly KnowledgeDoc[]): Map<string, StoredCorpusDocument> {
  return new Map(docs.map((doc) => [doc.id, { docId: doc.id, chunks: staticCorpusChunks(doc) }]));
}

// 1. A freshly ingested database is in sync. If this ever fails, the recomputation
//    has diverged from what the ingestion writes and every other assertion here is
//    meaningless.
{
  const report = compareCorpusToStored(corpus, storedFromCorpus(corpus));
  assertOk(report.inSync, `a faithful ingestion must report inSync, got ${JSON.stringify(report.driftedDocuments)}`);
  assertOk(
    report.matchedDocuments === corpus.length && report.driftedDocuments.length === 0,
    "every document must match",
  );
}

// 2. The actual defect: a document edited in code but never re-ingested. This is
//    the 행정사 case, reproduced with the real corpus.
{
  const stored = storedFromCorpus(corpus);
  const target = corpus[0]!;
  const stale = stored.get(target.id)!;
  stored.set(target.id, {
    docId: target.id,
    chunks: [stale.chunks[0]!.replace(/행정사|scrivener|.$/u, "OUTDATED"), ...stale.chunks.slice(1)],
  });

  const report = compareCorpusToStored(corpus, stored);
  assertOk(!report.inSync, "an un-ingested edit must be reported as drift");
  assertOk(report.driftedDocuments.length === 1, `exactly one document drifted, got ${report.driftedDocuments.length}`);
  const [drift] = report.driftedDocuments;
  assertOk(drift.docId === target.id, `the drifted document must be named, got ${drift.docId}`);
  assertOk(drift.reason === "chunk_content_differs", `reason must be chunk_content_differs, got ${drift.reason}`);
  assertOk(drift.firstDifferingChunk === 0, "the first differing chunk index must be reported");

  const message = describeCorpusDrift(report);
  assertOk(message.includes(target.id), "the operator message must name the document");
  assertOk(
    message.includes("knowledge:pgvector") && message.includes("rag:serving:sync"),
    "the operator message must say how to fix it — a warning nobody can act on is noise",
  );
}

// 3. An edit that changes how many chunks a document splits into. broker-redflags
//    was exactly this in production: 2 chunks in code, 1 stored.
{
  const stored = storedFromCorpus(corpus);
  const target = corpus[0]!;
  stored.set(target.id, { docId: target.id, chunks: [staticCorpusChunks(target).join("\n\n")] });

  const report = compareCorpusToStored(corpus, stored);
  const drift = report.driftedDocuments.find((entry) => entry.docId === target.id);
  if (staticCorpusChunks(target).length === 1) {
    assertOk(report.inSync, "a single-chunk document joined with itself is unchanged");
  } else {
    assertOk(drift?.reason === "chunk_count_differs", `expected chunk_count_differs, got ${drift?.reason}`);
    assertOk(drift.codeChunks !== drift.databaseChunks, "both counts must be reported so the operator can see the shape of the change");
  }
}

// 4. A document added to the corpus but never ingested at all.
{
  const stored = storedFromCorpus(corpus);
  const target = corpus[corpus.length - 1]!;
  stored.delete(target.id);

  const report = compareCorpusToStored(corpus, stored);
  const drift = report.driftedDocuments.find((entry) => entry.docId === target.id);
  assertOk(drift?.reason === "missing_from_database", `expected missing_from_database, got ${drift?.reason}`);
  assertOk(drift.databaseChunks === 0, "a missing document has no stored chunks");
}

// 5. Extra documents in the database do NOT count as drift. Harvested official
//    sources and legal-review candidates land in the same tables, and flagging
//    them would make this check fire constantly and get ignored — which is the
//    failure mode the ops alert dedup guard already had to fix once.
{
  const stored = storedFromCorpus(corpus);
  stored.set("harvested-doc-not-in-code", { docId: "harvested-doc-not-in-code", chunks: ["some harvested text"] });

  const report = compareCorpusToStored(corpus, stored);
  assertOk(report.inSync, "documents that do not come from the code corpus must be ignored");
  assertOk(report.totalDocuments === corpus.length, "the total counts code documents, not database rows");
}

console.log(
  `PASS corpus drift: ${corpus.length} corpus documents, detects un-ingested edits, chunk-count changes and missing documents, ignores harvested rows`,
);

// The database read must paginate. PostgREST caps an unpaginated select at 1000
// rows and says nothing about it, and KnowledgeChunk holds several thousand — so
// a direct select returns a truncated chunk list and almost every document looks
// like it lost chunks. The first version of this check did exactly that and
// reported 49 of 95 documents as drifted against the 3 that really were. A check
// that cries wolf 16 times for every real signal is worse than no check: the ops
// alert already had to grow a dedup guard once for that reason.
{
  const { detectStaticCorpusDrift } = await import("../src/lib/knowledge/corpus-drift");

  const PAGE = 1_000;
  const documents = corpus.map((doc, index) => ({ id: `doc-${index}`, docId: doc.id }));
  const corpusChunks = corpus.flatMap((doc, index) =>
    staticCorpusChunks(doc).map((content, chunkIndex) => ({ documentId: `doc-${index}`, chunkIndex, content })),
  );

  // The corpus itself is only ~200 chunks, but KnowledgeChunk also holds harvested
  // official sources and legal-review candidates — several thousand rows in
  // production. The cap applies to the table, not to the subset we care about, so
  // the corpus chunks can sit entirely beyond the first page. Order them last,
  // which is the case that actually bit.
  const filler = Array.from({ length: PAGE + 200 }, (_unused, index) => ({
    documentId: `harvested-${index}`,
    chunkIndex: 0,
    content: `harvested source ${index}`,
  }));
  const chunks = [...filler, ...corpusChunks];
  assertOk(
    chunks.length > PAGE && filler.length >= PAGE,
    `this assertion is only meaningful when the corpus chunks fall past the first page (table has ${chunks.length} rows, ${filler.length} of them ahead of the corpus)`,
  );

  // A client that enforces the same silent cap the real one does.
  let rangedReads = 0;
  const pagingClient = {
    from(table: string) {
      const rows: unknown[] = table === "KnowledgeDocument" ? documents : table === "KnowledgeChunk" ? chunks : [];
      return {
        select() {
          const unpaginated = Promise.resolve({ data: rows.slice(0, PAGE), error: null });
          return Object.assign(unpaginated, {
            range(from: number, to: number) {
              rangedReads += 1;
              return Promise.resolve({ data: rows.slice(from, to + 1), error: null });
            },
          });
        },
      };
    },
  };

  const report = await detectStaticCorpusDrift(pagingClient as never);
  assertOk(
    report.inSync,
    `a faithfully ingested corpus must not report drift once paginated, got ${report.driftedDocuments.length} drifted: ` +
      `${report.driftedDocuments.slice(0, 5).map((d) => `${d.docId}/${d.reason}`).join(", ")}`,
  );
  assertOk(rangedReads > 0, "the read must go through the paginated reader, not a bare select");
}

console.log("PASS corpus drift: the database read paginates past PostgREST's silent 1000-row cap");
