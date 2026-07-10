import { prepareTestDb } from "./prepare-test-db";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

function jsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

process.env.ADMIN_API_KEY = "test-admin-key";
prepareTestDb("document verification metrics");

const { NextRequest } = await import("next/server");
const { db } = await import("../src/lib/db");
const metricsRoute = await import("../src/app/api/admin/documents/verification-metrics/route");

function adminRequest(path: string) {
  return new NextRequest(`http://localhost${path}`, {
    method: "GET",
    headers: {
      "x-admin-key": "test-admin-key",
    },
  });
}

async function responseJson(response: Response) {
  const body = await response.json();
  return { ok: response.ok, status: response.status, body };
}

try {
  const user = await db.user.create({
    data: {
      role: "STUDENT",
      email: "verification-metrics@student.kaxi.local",
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
  const firstDocument = await db.documentItem.create({
    data: {
      studentProfileId: profile.id,
      documentType: "financial_proof",
      required: true,
      status: "OCR_DONE",
      reviewStatus: "NEEDS_HUMAN_REVIEW",
      ocrValidation: jsonValue({
        layers: { rule: "pass", rag: "warning", cross_document: "pass" },
        issues: [{ code: "rag_basis_weak" }],
      }),
    },
  });
  const secondDocument = await db.documentItem.create({
    data: {
      studentProfileId: profile.id,
      documentType: "job_description",
      required: true,
      status: "OCR_DONE",
      reviewStatus: "NEEDS_HUMAN_REVIEW",
      ocrValidation: jsonValue({
        layers: { rule: "pass", rag: "skipped", cross_document: "fail" },
        issues: [{ code: "cross_document_occupation_industry_mismatch" }],
      }),
    },
  });

  await db.documentVerificationFeedback.createMany({
    data: [
      {
        documentItemId: firstDocument.id,
        reviewerActor: "admin-api-key",
        reviewerRole: "owner",
        label: "ACCURATE",
        issueCodes: jsonValue(["rag_basis_weak"]),
        layerStatuses: jsonValue({ rule: "pass", rag: "warning", cross_document: "pass" }),
        verificationSnapshot: jsonValue({ status: "warning" }),
        note: "정확",
      },
      {
        documentItemId: firstDocument.id,
        reviewerActor: "admin-api-key",
        reviewerRole: "owner",
        label: "FALSE_POSITIVE",
        issueCodes: jsonValue(["rag_basis_weak"]),
        layerStatuses: jsonValue({ rule: "pass", rag: "warning", cross_document: "pass" }),
        verificationSnapshot: jsonValue({ status: "warning" }),
        note: "오탐",
      },
      {
        documentItemId: secondDocument.id,
        reviewerActor: "admin-api-key",
        reviewerRole: "owner",
        label: "FALSE_NEGATIVE",
        issueCodes: jsonValue(["cross_document_occupation_industry_mismatch"]),
        layerStatuses: jsonValue({ rule: "pass", rag: "skipped", cross_document: "fail" }),
        verificationSnapshot: jsonValue({ status: "fail" }),
        note: "과탐/누락",
      },
    ],
  });

  const metrics = await responseJson(
    await metricsRoute.GET(
      adminRequest("/api/admin/documents/verification-metrics?since=2026-01-01&until=2026-12-31&limit=2")
    )
  );
  assert(metrics.ok, `metrics API should succeed: ${JSON.stringify(metrics.body)}`);
  assert(metrics.body.metrics.totals.verifiedDocuments === 2, "metrics should count verified documents");
  assert(metrics.body.metrics.totals.documentsWithFeedback === 2, "metrics should count distinct documents with feedback");
  assert(metrics.body.metrics.totals.feedbackCount === 3, "metrics should count feedback rows");
  assert(metrics.body.metrics.totals.feedbackCoverage === 1, "metrics should compute feedback coverage");
  assert(metrics.body.metrics.labels.ACCURATE === 1, "metrics should count accurate labels");
  assert(metrics.body.metrics.labels.FALSE_POSITIVE === 1, "metrics should count false positives");
  assert(metrics.body.metrics.labels.FALSE_NEGATIVE === 1, "metrics should count false negatives");
  assert(metrics.body.metrics.rates.accuracy === 0.3333, "metrics should compute accuracy rate");
  assert(metrics.body.metrics.rates.falsePositive === 0.3333, "metrics should compute false-positive rate");
  assert(metrics.body.metrics.issueCodes[0].code === "rag_basis_weak", "metrics should rank frequent issue codes");
  assert(metrics.body.metrics.recentFeedback.length === 2, "metrics should respect recent feedback limit");

  const audit = await db.adminAuditLog.findFirst({
    where: { action: "document.verification_metrics.read" },
  });
  assert(audit, "metrics API should write admin audit log");

  console.log("PASS document verification metrics: coverage, accuracy, issue codes, and audit log");
} finally {
  await db.$disconnect();
}
