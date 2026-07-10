import { createHash } from "crypto";
import { prepareTestDb } from "./prepare-test-db";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

function hashText(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function jsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

process.env.ADMIN_API_KEY = "test-admin-key";
process.env.TRANSFORMERS_ALLOW_REMOTE = "true";
process.env.AI_PROVIDER = "kimi";
process.env.OPENAI_API_KEY = "";
prepareTestDb("document verification api");

const { NextRequest } = await import("next/server");
const { db } = await import("../src/lib/db");
const verifyRoute = await import("../src/app/api/admin/documents/[id]/verify/route");
const feedbackRoute = await import("../src/app/api/admin/documents/[id]/verification-feedback/route");
const { VISA_DOCUMENT_REQUIREMENT_SEEDS } = await import("../src/lib/documents/visa-document-matrix");
const {
  PGVECTOR_EMBEDDING_DIM,
  PGVECTOR_EMBEDDING_MODEL,
  embedMissingKnowledgeChunksForPgvector,
} = await import("../src/lib/embeddings/pgvector-rag");

function adminRequest(path: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-admin-key": "test-admin-key",
    },
    body: JSON.stringify(body),
  });
}

async function responseJson(response: Response) {
  const body = await response.json();
  return { ok: response.ok, status: response.status, body };
}

try {
  const seed = VISA_DOCUMENT_REQUIREMENT_SEEDS.find((item) => item.code === "d2_issuance_financial_proof");
  assert(seed, "test requires D-2 financial proof matrix seed");
  await db.visaDocumentRequirement.create({
    data: {
      ...seed,
      reviewStatus: "APPROVED",
      sourceRefs: jsonValue(seed.sourceRefs),
      requiredFields: jsonValue(seed.requiredFields),
      validationRules: jsonValue(seed.validationRules),
      lastCheckedAt: new Date(seed.lastCheckedAt),
    },
  });

  const knowledge = await db.knowledgeDocument.create({
    data: {
      docId: "test-financial-proof-rag-source",
      title: "D-2 재정능력 입증서류 공식 근거",
      sourceUrl: "https://www.hikorea.go.kr/test-financial-proof",
      sourceType: "official_government",
      language: "ko",
      jurisdiction: "KR",
      topic: "documents",
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      lastCheckedAt: new Date("2026-07-01T00:00:00.000Z"),
      checkedBy: "test",
      reviewStatus: "APPROVED",
      supersedes: [],
      chunks: {
        create: [{
          chunkIndex: 0,
          content:
            "D-2 issuance financial_proof 재정능력 입증서류는 예금주 holder_name, 잔액 balance, 통화 currency, 발급일 issue_date 확인이 필요합니다.",
          contentHash: hashText("financial-proof-rag-source"),
          keywords: "D-2 issuance financial_proof 재정능력 입증서류 issue_date balance currency",
        }],
      },
    },
    include: { chunks: true },
  });
  const extractionOnlyKnowledge = await db.knowledgeDocument.create({
    data: {
      docId: "test-extraction-text-rag-source",
      title: "OCR 본문 단서 기반 공식 근거",
      sourceUrl: "https://www.hikorea.go.kr/test-extraction-text",
      sourceType: "official_government",
      language: "ko",
      jurisdiction: "KR",
      topic: "documents",
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      lastCheckedAt: new Date("2026-07-01T00:00:00.000Z"),
      checkedBy: "test",
      reviewStatus: "APPROVED",
      supersedes: [],
      chunks: {
        create: [{
          chunkIndex: 0,
          content:
            "azalea-rag-duty-token OCR 추출 본문에만 나타나는 직무·프로그램·기관 단서도 공식 근거 검색에 사용할 수 있습니다.",
          contentHash: hashText("extraction-text-rag-source"),
          keywords: "azalea-rag-duty-token OCR 추출 본문 공식 근거",
        }],
      },
    },
    include: { chunks: true },
  });
  await embedMissingKnowledgeChunksForPgvector({ force: true });
  const embedded = await db.knowledgeChunk.findFirst({
    where: {
      documentId: knowledge.id,
      embeddingDim: PGVECTOR_EMBEDDING_DIM,
      embeddingModel: PGVECTOR_EMBEDDING_MODEL,
    },
  });
  assert(embedded, "test RAG source chunk should be embedded");
  const extractionOnlyEmbedded = await db.knowledgeChunk.findFirst({
    where: {
      documentId: extractionOnlyKnowledge.id,
      embeddingDim: PGVECTOR_EMBEDDING_DIM,
      embeddingModel: PGVECTOR_EMBEDDING_MODEL,
    },
  });
  assert(extractionOnlyEmbedded, "OCR-extraction-only RAG source chunk should be embedded");

  const user = await db.user.create({
    data: {
      role: "STUDENT",
      email: "verification-api@student.kaxi.local",
      locale: "ko",
    },
  });
  const profile = await db.studentProfile.create({
    data: {
      userId: user.id,
      nationality: "VN",
      visaType: "D-2",
      programType: "degree",
    },
  });
  const file = await db.uploadedFile.create({
    data: {
      ownerUserId: user.id,
      storageKey: "verification-api/financial.pdf",
      originalName: "financial.pdf",
      mimeType: "application/pdf",
      sizeBytes: 100,
      sha256: "c".repeat(64),
      piiClass: "student_visa_document",
    },
  });
  const document = await db.documentItem.create({
    data: {
      studentProfileId: profile.id,
      documentType: "financial_proof",
      required: true,
      status: "OCR_DONE",
      reviewStatus: "PENDING",
      fileId: file.id,
      ocrExtractedRedacted: {
        financialProof: {
          bankName: "KAXI Bank",
          holderName: "K***T",
          balanceAmount: 12000000,
          currency: "KRW",
          issueDate: "2026-07-01",
        },
        common: {
          holderName: "K***T",
          issuer: "KAXI Bank",
          documentDate: "2026-07-01",
          contextSummary: "azalea-rag-duty-token",
        },
      },
    },
  });

  const unauthorized = await responseJson(
    await verifyRoute.POST(
      new NextRequest(`http://localhost/api/admin/documents/${document.id}/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: document.id }) }
    )
  );
  assert(unauthorized.status === 401, "verification API should require admin auth");

  const verified = await responseJson(
    await verifyRoute.POST(
      adminRequest(`/api/admin/documents/${document.id}/verify`, {
        stayAction: "issuance",
        applicantContext: "degree",
        enableRag: true,
        enableLlm: false,
      }),
      { params: Promise.resolve({ id: document.id }) }
    )
  );
  assert(verified.ok, `verification API should succeed: ${JSON.stringify(verified.body)}`);
  assert(verified.body.verification.layers.rule === "pass", "rule layer should pass through API");
  assert(verified.body.verification.layers.rag === "pass", `RAG layer should pass: ${JSON.stringify(verified.body.verification)}`);
  assert(
    verified.body.verification.sources.some((source: { docId: string }) => source.docId === "test-financial-proof-rag-source"),
    "verification should expose retrieved RAG source"
  );
  const financialSource = verified.body.verification.sources.find((source: { docId: string }) =>
    source.docId === "test-financial-proof-rag-source"
  );
  assert(financialSource, "verification should include financial source details");
  assert(financialSource.sourceType === "official_government", "RAG source should expose sourceType");
  assert(financialSource.reviewStatus === "approved", "RAG source should expose approved review status");
  assert(financialSource.lastCheckedAt === "2026-07-01", "RAG source should expose last checked date");
  assert(Array.isArray(financialSource.acceptedBy) && financialSource.acceptedBy.length > 0, "RAG source should explain accepted retrieval axis");
  assert(financialSource.thresholds?.minVectorScore === 0.8, "RAG source should expose vector threshold");
  assert(
    verified.body.verification.layerDetails.rag.acceptedSourceCount > 0,
    "verification should expose accepted RAG evidence count"
  );
  assert(
    verified.body.verification.layerDetails.rag.topResults.some((result: { accepted: boolean; acceptedBy: string[] }) =>
      result.accepted && Array.isArray(result.acceptedBy) && result.acceptedBy.length > 0
    ),
    "RAG layer details should expose acceptedBy for accepted top results"
  );
  assert(
    verified.body.verification.basis.officialSourceCount > 0 &&
      verified.body.verification.basis.notice.includes("공식") &&
      verified.body.verification.basis.notice.includes("행정사 검토"),
    "verification should expose an official-source basis notice"
  );
  assert(
    typeof verified.body.verification.basis.latestCheckedAt === "string" &&
      verified.body.verification.basis.latestCheckedAt >= "2026-07-01",
    "basis should expose latest checked date across accepted official sources and the matched matrix row"
  );
  assert(
    verified.body.verification.requirementLastCheckedAt,
    "verification should expose the matched requirement checked date"
  );
  assert(
    verified.body.verification.layerDetails.rag.query.includes("azalea-rag-duty-token"),
    "RAG query should include safe OCR extraction context"
  );
  assert(
    !verified.body.verification.layerDetails.rag.query.includes("K***T"),
    "RAG query should not include sensitive OCR identity values"
  );
  assert(
    verified.body.verification.sources.some((source: { docId: string }) => source.docId === "test-extraction-text-rag-source"),
    "verification should retrieve RAG sources that match safe OCR extraction text"
  );
  assert(
    verified.body.verification.layerDetails.rag.llm.status === "not_requested",
    "LLM status should be explicit when LLM judgment is disabled"
  );

  const llmUnavailable = await responseJson(
    await verifyRoute.POST(
      adminRequest(`/api/admin/documents/${document.id}/verify`, {
        stayAction: "issuance",
        applicantContext: "degree",
        enableRag: true,
        enableLlm: true,
        persist: false,
      }),
      { params: Promise.resolve({ id: document.id }) }
    )
  );
  assert(llmUnavailable.ok, `LLM-unavailable verification should still return a structured result: ${JSON.stringify(llmUnavailable.body)}`);
  assert(
    llmUnavailable.body.verification.sources.some((source: { docId: string }) => source.docId === "test-financial-proof-rag-source"),
    "LLM-unavailable verification should preserve accepted RAG sources"
  );
  assert(
    llmUnavailable.body.verification.layers.rag === "warning",
    "LLM-unavailable verification should warn instead of skipping RAG"
  );
  assert(
    llmUnavailable.body.verification.layerDetails.rag.llm.status === "unconfigured",
    "LLM-unavailable verification should expose unconfigured LLM status"
  );
  assert(
    llmUnavailable.body.verification.issues.some((issue: { code: string }) => issue.code === "llm_judgment_unavailable"),
    "LLM-unavailable verification should emit llm_judgment_unavailable"
  );

  const saved = await db.documentItem.findUnique({ where: { id: document.id } });
  assert(saved?.ocrValidation, "verification API should persist ocrValidation");
  const audit = await db.adminAuditLog.findFirst({
    where: { action: "document.verified", targetId: document.id },
  });
  assert(audit, "verification API should write admin audit log");

  await db.knowledgeDocument.update({
    where: { docId: "test-financial-proof-rag-source" },
    data: { reviewStatus: "REJECTED" },
  });
  const weakKnowledge = await db.knowledgeDocument.create({
    data: {
      docId: "test-weak-rag-source",
      title: "환경 통계 테스트 자료",
      sourceUrl: "https://www.hikorea.go.kr/test-weak-source",
      sourceType: "official_government",
      language: "ko",
      jurisdiction: "KR",
      topic: "documents",
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      lastCheckedAt: new Date("2026-07-01T00:00:00.000Z"),
      checkedBy: "test",
      reviewStatus: "APPROVED",
      supersedes: [],
      chunks: {
        create: [{
          chunkIndex: 0,
          content: "기후 관측 장비의 월별 유지보수 일정과 온도 기록표를 설명하는 테스트 문장입니다.",
          contentHash: hashText("weak-rag-source"),
          keywords: "",
        }],
      },
    },
    include: { chunks: true },
  });
  await embedMissingKnowledgeChunksForPgvector({ force: true });
  const weakEmbedded = await db.knowledgeChunk.findFirst({
    where: {
      documentId: weakKnowledge.id,
      embeddingDim: PGVECTOR_EMBEDDING_DIM,
      embeddingModel: PGVECTOR_EMBEDDING_MODEL,
    },
  });
  assert(weakEmbedded, "weak RAG source chunk should be embedded");

  const weak = await responseJson(
    await verifyRoute.POST(
      adminRequest(`/api/admin/documents/${document.id}/verify`, {
        stayAction: "issuance",
        applicantContext: "degree",
        enableRag: true,
        enableLlm: false,
        minRagVectorScore: 1.1,
        minRagKeywordScore: 999,
        persist: true,
      }),
      { params: Promise.resolve({ id: document.id }) }
    )
  );
  assert(weak.ok, `weak-threshold verification API should return a structured result: ${JSON.stringify(weak.body)}`);
  assert(weak.body.verification.layers.rag === "warning", "weak RAG basis should warn instead of passing");
  assert(
    weak.body.verification.issues.some((issue: { code: string }) => issue.code === "rag_basis_weak"),
    "weak RAG basis should emit rag_basis_weak"
  );
  assert(weak.body.verification.sources.length === 0, "weak RAG sources should not be exposed as accepted evidence");
  assert(
    weak.body.verification.basis.officialSourceCount === 0 &&
      weak.body.verification.basis.notice.includes("기준치 이상으로 채택된 공식 RAG 출처가 없습니다"),
    "weak RAG basis should tell operators that no official source passed the threshold"
  );

  const feedback = await responseJson(
    await feedbackRoute.POST(
      adminRequest(`/api/admin/documents/${document.id}/verification-feedback`, {
        label: "FALSE_POSITIVE",
        note: "RAG warning was too strict for this fixture.",
      }),
      { params: Promise.resolve({ id: document.id }) }
    )
  );
  assert(feedback.ok, `feedback API should save reviewer label: ${JSON.stringify(feedback.body)}`);
  assert(feedback.body.feedback.label === "FALSE_POSITIVE", "feedback label should persist");
  assert(
    Array.isArray(feedback.body.feedback.issueCodes) &&
      feedback.body.feedback.issueCodes.some((code: string) => code === "rag_basis_weak"),
    "feedback should inherit issue codes from the latest verification snapshot"
  );

  const listedFeedback = await responseJson(
    await feedbackRoute.GET(
      adminRequest(`/api/admin/documents/${document.id}/verification-feedback`, {}),
      { params: Promise.resolve({ id: document.id }) }
    )
  );
  assert(listedFeedback.ok, "feedback API should list reviewer labels");
  assert(listedFeedback.body.feedback.length === 1, "feedback API should return saved label");

  const feedbackAudit = await db.adminAuditLog.findFirst({
    where: { action: "document.verification_feedback.recorded", targetId: document.id },
  });
  assert(feedbackAudit, "feedback API should write admin audit log");

  await db.knowledgeDocument.update({
    where: { docId: "test-extraction-text-rag-source" },
    data: { reviewStatus: "REJECTED" },
  });
  await db.knowledgeDocument.create({
    data: {
      docId: "test-internal-only-rag-source",
      title: "비공식 URL이 붙은 재정증빙 근거",
      sourceUrl: "https://example.com/document-verification/spoofed-official",
      sourceType: "official_government",
      language: "ko",
      jurisdiction: "KR",
      topic: "documents",
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      lastCheckedAt: new Date("2026-07-01T00:00:00.000Z"),
      checkedBy: "test",
      reviewStatus: "APPROVED",
      supersedes: [],
      chunks: {
        create: [{
          chunkIndex: 0,
          content:
            "internal-only-token D-2 issuance financial_proof 재정능력 입증서류 issue_date balance currency 비공식 URL 문서입니다.",
          contentHash: hashText("internal-only-rag-source"),
          keywords: "internal-only-token D-2 issuance financial_proof issue_date balance currency",
        }],
      },
    },
  });
  await db.documentItem.update({
    where: { id: document.id },
    data: {
      ocrExtractedRedacted: {
        financialProof: {
          bankName: "KAXI Bank",
          holderName: "K***T",
          balanceAmount: 12000000,
          currency: "KRW",
          issueDate: "2026-07-01",
        },
        common: {
          holderName: "K***T",
          issuer: "KAXI Bank",
          documentDate: "2026-07-01",
          contextSummary: "internal-only-token",
        },
      },
    },
  });
  await embedMissingKnowledgeChunksForPgvector({ force: true });
  const internalOnly = await responseJson(
    await verifyRoute.POST(
      adminRequest(`/api/admin/documents/${document.id}/verify`, {
        stayAction: "issuance",
        applicantContext: "degree",
        enableRag: true,
        enableLlm: false,
        minRagVectorScore: 1.1,
        minRagKeywordScore: 0,
        persist: false,
      }),
      { params: Promise.resolve({ id: document.id }) }
    )
  );
  assert(internalOnly.ok, `spoofed-official RAG verification should return a structured result: ${JSON.stringify(internalOnly.body)}`);
  assert(
    internalOnly.body.verification.sources.some((source: { docId: string }) => source.docId === "test-internal-only-rag-source"),
    "spoofed-official RAG fixture should retrieve the source"
  );
  assert(
    internalOnly.body.verification.layerDetails.rag.officialSourceCount === 0,
    "official source type on a non-official URL should expose zero official accepted sources"
  );
  assert(internalOnly.body.verification.layers.rag === "warning", "spoofed-official RAG basis should warn");
  assert(
    internalOnly.body.verification.issues.some((issue: { code: string }) => issue.code === "rag_basis_non_official"),
    "spoofed-official RAG basis should emit rag_basis_non_official"
  );

  console.log("PASS document verification API: admin guard, Layer 1, Layer 2 RAG, weak RAG guardrail, feedback loop, persistence");
} finally {
  await db.$disconnect();
}
