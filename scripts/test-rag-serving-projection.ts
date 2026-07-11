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

  const content = [
    "# D-4 비자 신청 서류",
    "D-4 어학연수 비자 신청에는 표준입학허가서와 재정 증빙을 준비합니다.",
    "",
    "# D-4 visa application documents",
    "Prepare an admission letter and financial evidence for a D-4 language-study visa.",
    "",
    "# Hồ sơ xin visa D-4",
    "Chuẩn bị giấy nhập học và chứng minh tài chính cho visa du học tiếng Hàn D-4.",
    "",
    "# D-4 визийн материал",
    "D-4 хэлний сургалтын визэнд элсэлтийн зөвшөөрөл болон санхүүгийн нотолгоо бэлтгэнэ.",
  ].join("\n");
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
      query_text: "입학 서류",
      locale: "ko",
      similarity_threshold: 0.72,
    }),
  );
  assert(crossCategory.length === 0, "strict category mode must reject a relevant chunk from another category");

  const categoryScopes = await db.$queryRawUnsafe<Array<{
    visa_warning: boolean;
    documents_process: boolean;
    cost_visa: boolean;
    school_warning: boolean;
    warning_visa: boolean;
    process_warning: boolean;
    legal_process: boolean;
  }>>(
    `SELECT
      public.kaxi_rag_category_allowed('visa', 'warning') AS visa_warning,
      public.kaxi_rag_category_allowed('documents', 'process') AS documents_process,
      public.kaxi_rag_category_allowed('cost', 'visa') AS cost_visa,
      public.kaxi_rag_category_allowed('school', 'warning') AS school_warning,
      public.kaxi_rag_category_allowed('warning', 'visa') AS warning_visa,
      public.kaxi_rag_category_allowed('process', 'warning') AS process_warning,
      public.kaxi_rag_category_allowed('legal', 'process') AS legal_process`,
  );
  assert(categoryScopes[0]?.visa_warning === true, "visa scope must retain cross-cutting warning sources");
  assert(categoryScopes[0]?.documents_process === true, "documents scope must retain process sources");
  assert(categoryScopes[0]?.cost_visa === false, "cost scope must reject visa sources");
  assert(categoryScopes[0]?.school_warning === false, "school scope must reject unrelated warning sources");
  assert(categoryScopes[0]?.warning_visa === false, "warning scope must reject general visa sources");
  assert(categoryScopes[0]?.process_warning === true, "process scope must retain warning sources");
  assert(categoryScopes[0]?.legal_process === false, "legal scope must reject process-only sources");

  const localized = await db.$queryRawUnsafe<Array<{ content: string; metadata: Record<string, unknown> }>>(
    `SELECT content, metadata FROM public.match_rag_documents($1::vector, 5, $2::jsonb)`,
    vectorLiteral(1536, 0),
    JSON.stringify({
      tenant_id: "default",
      category: "visa",
      category_mode: "strict",
      query_text: "D-4 비자 서류",
      locale: "ko",
      similarity_threshold: 0.72,
    }),
  );
  assert(localized.length === 1, "matching strict category and locale must return context");
  assert(localized[0].content.includes("D-4 비자 신청 서류"), "Korean locale section must be returned");
  assert(!localized[0].content.includes("visa application documents"), "English section must be removed from Korean context");
  assert(!localized[0].content.includes("Hồ sơ"), "Vietnamese section must be removed from Korean context");
  assert(!localized[0].content.includes("визийн"), "Mongolian section must be removed from Korean context");
  assert(localized[0].metadata.language === "ko", "returned metadata must carry the requested locale");
  assert(localized[0].metadata.title === "D-4 비자 신청 서류", "citation title must use the localized heading");
  assert(localized[0].metadata.category_mode === "strict", "strict category mode must be observable");
  assert(localized[0].metadata.source_url === document.sourceUrl, "canonical source URL must be returned");
  assert(localized[0].metadata.citation_valid === true, "official HTTPS citation must be marked valid");

  for (const [locale, expected, forbidden] of [
    ["en", "D-4 visa application documents", "D-4 비자 신청 서류"],
    ["vi", "Hồ sơ xin visa D-4", "visa application documents"],
    ["mn", "D-4 визийн материал", "Hồ sơ"],
  ] as const) {
    const result = await db.$queryRawUnsafe<Array<{ content: string; metadata: Record<string, unknown> }>>(
      `SELECT content, metadata FROM public.match_rag_documents($1::vector, 5, $2::jsonb)`,
      vectorLiteral(1536, 0),
      JSON.stringify({
        tenant_id: "default",
        category: "visa",
        query_text: expected,
        locale,
        similarity_threshold: 0.72,
      }),
    );
    assert(result.length === 1, `${locale} locale must return its matching section`);
    assert(result[0].content.includes(expected), `${locale} section content must be preserved`);
    assert(!result[0].content.includes(forbidden), `${locale} context must not leak another locale`);
    assert(result[0].metadata.language === locale, `${locale} metadata must match the request locale`);
    assert(result[0].metadata.title === expected, `${locale} citation title must use the localized heading`);
  }

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

  console.log("PASS RAG serving projection: strict category, locale projection, no-context, citation, quarantine");
} finally {
  await db.$disconnect();
}
