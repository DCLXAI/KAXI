import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { Prisma } from "@prisma/client";
import { db } from "../src/lib/db";
import { parseOfficialSourceExtractionMetadata } from "../src/lib/knowledge/harvest-metadata";

type CandidateChunkStatsRow = {
  doc_id: string;
  chunks: bigint;
  embedded_chunks: bigint;
};

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function numberArg(name: string, fallback: number): number {
  const raw = argValue(name);
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }
  return parsed;
}

function formatDate(value: Date | null | undefined): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function truncateText(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}\n\n[TRUNCATED ${value.length - maxChars} chars for Label Studio review UI]`;
}

function labelStudioConfigXml() {
  return `<View>
  <Header value="$title" />
  <View style="border:1px solid #ddd; padding:12px; margin-bottom:12px;">
    <Text name="metadata" value="$metadata" />
  </View>
  <Text name="content" value="$chunks_markdown" />
  <Choices name="decision" toName="content" choice="single" required="true">
    <Choice value="APPROVED" />
    <Choice value="PENDING" />
    <Choice value="REJECTED" />
  </Choices>
  <TextArea name="checked_by" toName="content" required="true" placeholder="검수자 성명/자격번호 예: 김검수 행정사 12-3456" />
  <TextArea name="checked_at" toName="content" required="true" placeholder="YYYY-MM-DD" />
  <TextArea name="notes" toName="content" placeholder="수정 요청, 반려 사유, 검수 메모" />
</View>
`;
}

async function candidateChunkStats(docIds: string[]) {
  if (docIds.length === 0) return new Map<string, { chunks: number; embeddedChunks: number }>();
  const rows = await db.$queryRaw<CandidateChunkStatsRow[]>(Prisma.sql`
    SELECT
      d."docId" AS doc_id,
      count(c.id)::bigint AS chunks,
      count(c.id) FILTER (WHERE c.embedding IS NOT NULL)::bigint AS embedded_chunks
    FROM "KnowledgeDocument" d
    LEFT JOIN "KnowledgeChunk" c ON c."documentId" = d.id
    WHERE d."docId" IN (${Prisma.join(docIds)})
    GROUP BY d."docId"
  `);

  return new Map(rows.map((row) => [
    row.doc_id,
    {
      chunks: Number(row.chunks || 0),
      embeddedChunks: Number(row.embedded_chunks || 0),
    },
  ]));
}

async function main() {
  const out = argValue("--out") || join(process.cwd(), "legal-review", "latest", "label-studio-candidates.json");
  const configOut = argValue("--config-out") || join(dirname(out), "label-studio-candidate-config.xml");
  const maxContentChars = numberArg("--max-content-chars", 40_000);

  const candidates = await db.knowledgeDocument.findMany({
    where: {
      docId: { contains: "__candidate__" },
      reviewStatus: "PENDING",
    },
    include: {
      chunks: {
        orderBy: { chunkIndex: "asc" },
        select: {
          chunkIndex: true,
          content: true,
          contentHash: true,
        },
      },
    },
    orderBy: [{ topic: "asc" }, { docId: "asc" }],
  });

  const statsByDocId = await candidateChunkStats(candidates.map((candidate) => candidate.docId));
  const tasks = candidates.map((candidate, index) => {
    const stats = statsByDocId.get(candidate.docId) || { chunks: candidate.chunks.length, embeddedChunks: 0 };
    const supersedes = asStringArray(candidate.supersedes);
    const extraction = parseOfficialSourceExtractionMetadata(
      candidate.chunks.slice(0, 4).map((chunk) => chunk.content).join("\n")
    );
    const chunksMarkdown = candidate.chunks
      .map((chunk) => `## Chunk ${chunk.chunkIndex}\n\n${chunk.content}`)
      .join("\n\n---\n\n");
    const metadata = [
      `doc_id: ${candidate.docId}`,
      `source: ${candidate.sourceUrl}`,
      `topic: ${candidate.topic}`,
      `language: ${candidate.language}`,
      `checked_by_current: ${candidate.checkedBy}`,
      `last_checked_at: ${formatDate(candidate.lastCheckedAt)}`,
      `chunks: ${stats.embeddedChunks}/${stats.chunks} embedded`,
      `extraction_method: ${extraction.extractionMethod}`,
      `content_type: ${extraction.contentType || "-"}`,
      `byte_length: ${extraction.byteLength ?? "-"}`,
      `extracted_chars: ${extraction.extractedChars ?? "-"}`,
      `extraction_error: ${extraction.extractionError || "-"}`,
      `supersedes: ${supersedes.join(", ") || "-"}`,
    ].join("\n");

    return {
      id: index + 1,
      data: {
        target_type: "knowledge_document",
        target_id: candidate.docId,
        doc_id: candidate.docId,
        title: candidate.title,
        source_url: candidate.sourceUrl,
        source_type: candidate.sourceType,
        language: candidate.language,
        jurisdiction: candidate.jurisdiction,
        topic: candidate.topic,
        review_status: candidate.reviewStatus,
        valid_from: formatDate(candidate.validFrom),
        valid_to: formatDate(candidate.validTo),
        last_checked_at: formatDate(candidate.lastCheckedAt),
        checked_by_current: candidate.checkedBy,
        supersedes,
        superseded_by: candidate.supersededBy || null,
        chunk_count: stats.chunks,
        embedded_chunk_count: stats.embeddedChunks,
        all_chunks_embedded: stats.chunks > 0 && stats.embeddedChunks === stats.chunks,
        extraction_method: extraction.extractionMethod,
        extraction_content_type: extraction.contentType || null,
        extraction_byte_length: extraction.byteLength ?? null,
        extraction_extracted_chars: extraction.extractedChars ?? null,
        extraction_error: extraction.extractionError || null,
        metadata,
        chunks_markdown: truncateText(chunksMarkdown, maxContentChars),
        decision_jsonl_template: {
          targetType: "knowledge_document",
          targetId: candidate.docId,
          decision: "",
          checkedBy: "",
          checkedAt: "",
          notes: "",
          validTo: candidate.validTo ? formatDate(candidate.validTo) : null,
          supersededBy: candidate.supersededBy || null,
        },
      },
    };
  });

  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(tasks, null, 2)}\n`);
  await writeFile(configOut, labelStudioConfigXml());

  const totalChunks = tasks.reduce((sum, task) => sum + task.data.chunk_count, 0);
  const totalEmbedded = tasks.reduce((sum, task) => sum + task.data.embedded_chunk_count, 0);
  console.log(
    `[legal-review:label-studio:export] tasks=${tasks.length} chunks=${totalChunks} embedded=${totalEmbedded} out=${out} config=${configOut}`
  );
}

main()
  .catch((error) => {
    console.error(`[legal-review:label-studio:export] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
