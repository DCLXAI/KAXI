import { prepareTestDb } from "./prepare-test-db";
import type { OfficialKnowledgeSource } from "../src/lib/knowledge/source-monitor";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

function createMinimalPdf(text: string): Buffer {
  const escapedText = text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const stream = `BT /F1 18 Tf 72 720 Td (${escapedText}) Tj ET`;
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ];
  let body = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(body, "latin1"));
    body += object;
  }
  const xrefOffset = Buffer.byteLength(body, "latin1");
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(body, "latin1");
}

process.env.TRANSFORMERS_ALLOW_REMOTE = "false";
prepareTestDb("official source harvest");

const { db } = await import("../src/lib/db");
const { harvestOfficialKnowledgeCorpus } = await import("../src/lib/knowledge/official-source-harvest");
const { fetchOfficialKnowledgeSource } = await import("../src/lib/knowledge/source-monitor");

try {
  const pdfText = "KAXI PDF extraction D-2 checklist evidence";
  const pdfSource: OfficialKnowledgeSource = {
    docId: "mock-official-source-pdf",
    title: "공식 PDF 추출 테스트",
    sourceUrl: "https://www.hikorea.go.kr/mock-guide.pdf",
    sourceType: "official_government",
    topic: "documents",
    legalPriority: 4,
    monitorCadence: "daily",
    changeSignals: ["attachment"],
  };
  const fetchedPdf = await fetchOfficialKnowledgeSource(pdfSource, {
    fetchImpl: async () =>
      new Response(new Uint8Array(createMinimalPdf(pdfText)), {
        status: 200,
        headers: { "content-type": "application/pdf" },
      }),
  });

  assert(fetchedPdf.extractionMethod === "pdf_text", "PDF official source should be text-extracted");
  assert(fetchedPdf.content.includes("PDF official source extracted."), "PDF extraction should include extraction metadata");
  assert(fetchedPdf.content.includes(pdfText), "PDF extraction should include extracted text");
  assert(!fetchedPdf.content.includes("Binary official source detected."), "text PDFs should not be reduced to binary metadata only");

  const sources: OfficialKnowledgeSource[] = Array.from({ length: 18 }, (_, index) => ({
    docId: `mock-official-source-${String(index + 1).padStart(2, "0")}`,
    title: `공식 출처 수집 테스트 ${index + 1}`,
    sourceUrl: index === 0
      ? "https://www.hikorea.go.kr/mock-guide.pdf"
      : `https://www.hikorea.go.kr/mock-${index + 1}`,
    sourceType: "official_government",
    topic: index % 2 === 0 ? "documents" : "process",
    legalPriority: 4,
    monitorCadence: "daily",
    changeSignals: ["mock_policy_change", "attachment", "posted_date"],
  }));
  const paragraph = [
    "D-2 D-4 D-10 E-7 F-2 F-5 체류자격별 제출서류와 체류기간 연장, 체류자격 변경, 방문예약, 수수료 안내.",
    "이 문단은 공식 출처 수집 파이프라인의 대량 청킹 검증을 위한 mock HTML 본문입니다.",
    "자동 수집 결과는 반드시 PENDING 후보로 저장되고 행정사 또는 관리자가 승인하기 전에는 production RAG가 검색하지 않습니다.",
  ].join(" ");
  const html = `<html><body>${Array.from({ length: 900 }, (_, index) => `<p>${index}. ${paragraph}</p>`).join("\n")}</body></html>`;

  const summary = await harvestOfficialKnowledgeCorpus({
    actor: "test-harvest",
    persistCandidates: true,
    sources,
    maxChars: 80_000,
    minCandidateChunks: 500,
    fetchImpl: async (input) => {
      if (input.endsWith(".pdf")) {
        return new Response(new Uint8Array(createMinimalPdf(pdfText)), {
          status: 200,
          headers: { "content-type": "application/pdf" },
        });
      }
      return new Response(html, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    },
    now: new Date("2026-07-08T00:00:00.000Z"),
  });

  assert(summary.totalSources === 18, "harvest should process all requested sources");
  assert(summary.failedSources === 0, "mock harvest should not fail any official source");
  assert(summary.totalCandidateChunks >= 500, `expected 500+ candidate chunks, got ${summary.totalCandidateChunks}`);
  assert(summary.persistedPendingChunks >= 500, `expected 500+ persisted pending chunks, got ${summary.persistedPendingChunks}`);
  assert(summary.meetsChunkTarget, "harvest summary should report chunk target met");
  assert(summary.extractionStats.pdf_text === 1, `expected one PDF extraction, got ${summary.extractionStats.pdf_text}`);
  assert(summary.extractionStats.html === 17, `expected 17 HTML extractions, got ${summary.extractionStats.html}`);
  assert(summary.totalExtractedChars > 0, "harvest summary should include extracted character count");
  assert(summary.extractionErrors.length === 0, "mock PDF/HTML harvest should not report extraction errors");

  const [pendingDocs, approvedDocs, chunks] = await Promise.all([
    db.knowledgeDocument.count({ where: { reviewStatus: "PENDING", docId: { contains: "__candidate__" } } }),
    db.knowledgeDocument.count({ where: { reviewStatus: "APPROVED" } }),
    db.knowledgeChunk.count(),
  ]);
  assert(pendingDocs === 18, `expected 18 pending candidates, got ${pendingDocs}`);
  assert(approvedDocs === 0, "harvest must not auto-approve official-source candidates");
  assert(chunks >= 500, `expected persisted candidate chunks >=500, got ${chunks}`);

  console.log(
    `PASS official source harvest: sources=${summary.totalSources}, pendingDocs=${pendingDocs}, chunks=${chunks}`
  );
} finally {
  await db.$disconnect();
}
