import type { SupabaseClient } from "@supabase/supabase-js";
import { getKnowledgeDocsWithMetadata, type KnowledgeDoc } from "@/lib/data/knowledge";
import { splitKnowledgeChunks, staticDocContent } from "@/lib/embeddings/pgvector-rag";
import { loadAllRows } from "@/lib/knowledge/serving-projection";

// The RAG serving pipeline has a gap nothing was watching. `rag:check:projection`
// compares canonical chunks against serving rows, and `getRagServingProjectionStatus`
// derives every number from four database reads — neither of them takes the code
// corpus as an input at all. So when a PR edits src/lib/data/knowledge-corpus.ts,
// nothing observes that the edit has not been ingested, and the drift gate keeps
// reporting "204/204 serving-ready" while production answers from the old text.
//
// That is not hypothetical. PR #65 corrected documents that called 행정사 (an
// administrative scrivener) a "lawyer" — including the one explaining 행정사법
// 제2조 — and weeks later the live corpus still served the uncorrected wording,
// alongside pre-rebrand "KAXI" strings.
//
// The comparison is well defined because ingestStaticKnowledgeDocsForPgvector()
// derives chunks purely from the corpus: staticDocContent() concatenates the four
// locales and splitKnowledgeChunks() splits on blank lines at a fixed width. Both
// are imported from that module rather than reimplemented here, so this cannot
// drift from the ingestion it is checking.
//
// Measured against production when this was written: 92 of 95 corpus documents
// reproduced byte-for-byte, and the 3 that did not were exactly the known-stale
// ones. No false positives.

export interface CorpusDocDrift {
  docId: string;
  reason: "missing_from_database" | "chunk_count_differs" | "chunk_content_differs";
  codeChunks: number;
  databaseChunks: number;
  /** 0-based index of the first differing chunk, when the counts match. */
  firstDifferingChunk?: number;
}

export interface CorpusDriftReport {
  totalDocuments: number;
  matchedDocuments: number;
  driftedDocuments: CorpusDocDrift[];
  /** True when every corpus document is reproduced exactly by the stored chunks. */
  inSync: boolean;
}

/** The chunk texts an ingestion would write for one corpus document, from code alone. */
export function staticCorpusChunks(doc: KnowledgeDoc): string[] {
  return splitKnowledgeChunks(staticDocContent(doc));
}

export interface StoredCorpusDocument {
  docId: string;
  /** Chunk contents in chunkIndex order. */
  chunks: string[];
}

/**
 * Pure comparison, separated from the database read so it can be tested without
 * credentials — CI has none, which is why the existing pre-deploy drift gate had
 * to become a credential-free HTTP probe.
 */
export function compareCorpusToStored(
  docs: readonly KnowledgeDoc[],
  stored: ReadonlyMap<string, StoredCorpusDocument>,
): CorpusDriftReport {
  const driftedDocuments: CorpusDocDrift[] = [];

  for (const doc of docs) {
    const expected = staticCorpusChunks(doc);
    const row = stored.get(doc.id);

    if (!row) {
      driftedDocuments.push({
        docId: doc.id,
        reason: "missing_from_database",
        codeChunks: expected.length,
        databaseChunks: 0,
      });
      continue;
    }

    if (row.chunks.length !== expected.length) {
      driftedDocuments.push({
        docId: doc.id,
        reason: "chunk_count_differs",
        codeChunks: expected.length,
        databaseChunks: row.chunks.length,
      });
      continue;
    }

    const firstDifferingChunk = expected.findIndex((chunk, index) => chunk !== row.chunks[index]);
    if (firstDifferingChunk !== -1) {
      driftedDocuments.push({
        docId: doc.id,
        reason: "chunk_content_differs",
        codeChunks: expected.length,
        databaseChunks: row.chunks.length,
        firstDifferingChunk,
      });
    }
  }

  return {
    totalDocuments: docs.length,
    matchedDocuments: docs.length - driftedDocuments.length,
    driftedDocuments,
    inSync: driftedDocuments.length === 0,
  };
}

// Reads through the Supabase service client rather than Prisma, matching how
// serving-projection.ts already reads the same two tables from server code, and
// reusing its paginated reader: PostgREST silently caps an unpaginated select at
// 1000 rows, and KnowledgeChunk holds several thousand. Reading it directly makes
// most documents look like they lost chunks — this check reported 49 drifted
// documents that way before it paginated, against 3 that had really drifted.
type DocumentRow = { id: string; docId: string };
type ChunkRow = { documentId: string; chunkIndex: number; content: string };

/** Reads the stored chunks and compares them with the committed corpus. */
export async function detectStaticCorpusDrift(
  supabase: SupabaseClient,
  options: { referenceDate?: Date } = {},
): Promise<CorpusDriftReport> {
  const docs = getKnowledgeDocsWithMetadata({ referenceDate: options.referenceDate || new Date() });

  const [documents, chunks] = await Promise.all([
    loadAllRows<DocumentRow>(supabase, "KnowledgeDocument", "id,docId"),
    loadAllRows<ChunkRow>(supabase, "KnowledgeChunk", "documentId,chunkIndex,content"),
  ]);

  const chunksByDocument = new Map<string, ChunkRow[]>();
  for (const chunk of chunks) {
    const bucket = chunksByDocument.get(chunk.documentId);
    if (bucket) bucket.push(chunk);
    else chunksByDocument.set(chunk.documentId, [chunk]);
  }

  const stored = new Map<string, StoredCorpusDocument>(
    documents.map((document) => [
      document.docId,
      {
        docId: document.docId,
        chunks: (chunksByDocument.get(document.id) || [])
          .slice()
          .sort((left, right) => left.chunkIndex - right.chunkIndex)
          .map((chunk) => chunk.content),
      },
    ]),
  );

  return compareCorpusToStored(docs, stored);
}

export function describeCorpusDrift(report: CorpusDriftReport): string {
  if (report.inSync) {
    return `All ${report.totalDocuments} corpus documents match the ingested chunks.`;
  }
  const names = report.driftedDocuments.map((drift) => `${drift.docId} (${drift.reason})`).join(", ");
  // Deliberately says "disagree" rather than "have not been ingested". The usual
  // cause is an un-ingested corpus edit, but approveKnowledgeDocument() looks
  // documents up by docId and re-chunks with repository.ts's own splitter at a
  // different width, so an admin edit targeting a corpus docId lands here too —
  // and for that case `knowledge:pgvector` would overwrite the admin's text with
  // the code's. Naming both keeps the instruction from being confidently wrong.
  return (
    `${report.driftedDocuments.length} of ${report.totalDocuments} corpus documents disagree with what is stored: ${names}. ` +
    "Retrieval serves the stored text, so users are not seeing the committed version. " +
    "If the corpus was edited and never ingested, run `bun run knowledge:pgvector` then `bun run rag:serving:sync`; " +
    "if the stored version was edited through the admin knowledge API instead, that command would overwrite it — reconcile the two first."
  );
}
