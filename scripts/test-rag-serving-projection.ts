import { createHash } from "crypto";
import { prepareTestDb } from "./prepare-test-db";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function vectorLiteral(dim: number, hotIndex: number) {
  return `[${Array.from({ length: dim }, (_, index) => (index === hotIndex ? "1" : "0")).join(",")}]`;
}

prepareTestDb("RAG serving projection");
const { db } = await import("../src/lib/db");

try {
  const quarantineTable = await db.$queryRawUnsafe<Array<{ table_name: string | null }>>(
    `SELECT to_regclass('public.legacy_rag_chunks_quarantine')::text AS table_name`,
  );
  assert(
    quarantineTable[0]?.table_name === "legacy_rag_chunks_quarantine",
    "legacy RAG quarantine table must exist",
  );
  let cutoverBlocked = false;
  try {
    await db.$queryRawUnsafe(`SELECT * FROM public.kaxi_finalize_legacy_rag_cutover(1)`);
  } catch (error) {
    cutoverBlocked = String(error).includes("RAG cutover blocked");
  }
  assert(cutoverBlocked, "legacy RAG cutover must fail before the serving projection is ready");

  const content = "D-4 어학연수 비자 신청에는 표준입학허가서와 재정 증빙을 준비합니다.";
  const contentHash = createHash("sha256").update(content).digest("hex");
  const document = await db.knowledgeDocument.create({
    data: {
      docId: "serving-projection-d4",
      title: "D-4 비자 공식 안내",
      sourceUrl: "https://www.hikorea.go.kr/d4",
      sourceType: "official_government",
      language: "ko",
      jurisdiction: "KR",
      topic: "visa",
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      lastCheckedAt: new Date(),
      checkedBy: "serving-projection-test",
      reviewStatus: "APPROVED",
      chunks: {
        create: [{ chunkIndex: 0, content, contentHash, keywords: "D-4, 비자, 표준입학허가서" }],
      },
    },
    include: { chunks: true },
  });
  const chunk = document.chunks[0];
  const metadata = {
    canonical_chunk_id: chunk.id,
    canonical_document_id: document.id,
    doc_id: document.docId,
    content_hash: contentHash,
    embedding_model: "text-embedding-3-small",
    tenant_id: "default",
    category: "visa",
    title: document.title,
    keywords: "D-4, 비자, 표준입학허가서",
  };
  await db.$executeRawUnsafe(
    `INSERT INTO public.rag_serving_chunks (content, metadata, embedding)
     VALUES ($1, $2::jsonb, $3::vector)`,
    content,
    JSON.stringify(metadata),
    vectorLiteral(1536, 0),
  );

  const crossCategory = await db.$queryRawUnsafe<Array<{ metadata: Record<string, unknown> }>>(
    `SELECT metadata FROM public.match_rag_documents($1::vector, 5, $2::jsonb)`,
    vectorLiteral(1536, 0),
    JSON.stringify({
      tenant_id: "default",
      category: "documents",
      query_text: "D-4 비자 서류",
      similarity_threshold: 0.72,
    }),
  );
  assert(crossCategory.length === 1, "soft category boost must not hide a relevant visa chunk");
  assert(crossCategory[0].metadata.source_url === document.sourceUrl, "canonical source URL must be returned");
  assert(crossCategory[0].metadata.citation_valid === true, "official HTTPS citation must be marked valid");

  const noContext = await db.$queryRawUnsafe<Array<{ id: bigint }>>(
    `SELECT id FROM public.match_rag_documents($1::vector, 5, $2::jsonb)`,
    vectorLiteral(1536, 1),
    JSON.stringify({ tenant_id: "default", query_text: "unrelated-token", similarity_threshold: 0.95 }),
  );
  assert(noContext.length === 0, "unrelated low-similarity input must return no context");

  await db.knowledgeDocument.update({
    where: { id: document.id },
    data: { reviewStatus: "REJECTED", validTo: new Date() },
  });
  await db.$queryRawUnsafe(`SELECT * FROM public.kaxi_refresh_rag_serving_status()`);
  const status = await db.$queryRawUnsafe<Array<{ status: string }>>(
    `SELECT status FROM public.rag_serving_chunks WHERE canonical_chunk_id = $1`,
    chunk.id,
  );
  assert(status[0]?.status === "quarantined", "rejected canonical documents must quarantine serving rows");

  console.log("PASS RAG serving projection: canonical eligibility, soft category, no-context, citation, quarantine");
} finally {
  await db.$disconnect();
}
