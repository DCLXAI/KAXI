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
process.env.TRANSFORMERS_ALLOW_REMOTE = "false";
prepareTestDb("document verification batch");

const { NextRequest } = await import("next/server");
const { db } = await import("../src/lib/db");
const batchRoute = await import("../src/app/api/admin/documents/verify-batch/route");
const { VISA_DOCUMENT_REQUIREMENT_SEEDS } = await import("../src/lib/documents/visa-document-matrix");
const { verifyDocumentSet } = await import("../src/lib/documents/verification");

function adminRequest(path: string, body: Record<string, unknown>, includeKey = true) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(includeKey ? { "x-admin-key": "test-admin-key" } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function responseJson(response: Response) {
  const body = await response.json();
  return { ok: response.ok, status: response.status, body };
}

try {
  for (const code of ["d2_issuance_passport", "d2_issuance_financial_proof"]) {
    const seed = VISA_DOCUMENT_REQUIREMENT_SEEDS.find((item) => item.code === code);
    assert(seed, `missing seed ${code}`);
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
  }

  const user = await db.user.create({
    data: {
      role: "STUDENT",
      email: "verification-batch@student.kaxi.local",
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
      storageKey: "verification-batch/financial.pdf",
      originalName: "financial.pdf",
      mimeType: "application/pdf",
      sizeBytes: 100,
      sha256: "d".repeat(64),
      piiClass: "student_visa_document",
    },
  });
  await db.documentItem.create({
    data: {
      studentProfileId: profile.id,
      documentType: "financial_proof",
      required: true,
      status: "OCR_DONE",
      reviewStatus: "PENDING",
      fileId: file.id,
      ocrExtractedRedacted: {
        financialProof: {
          holderName: "K***T",
          balanceAmount: 12000000,
          currency: "KRW",
          issueDate: "2026-07-01",
        },
        common: {
          holderName: "K***T",
          documentDate: "2026-07-01",
        },
      },
    },
  });

  const dryRun = await verifyDocumentSet({
    studentProfileId: profile.id,
    stayAction: "issuance",
    applicantContext: "degree",
    enableRag: false,
    persist: false,
    now: new Date("2026-07-08T00:00:00.000Z"),
  });
  assert(dryRun.summary.requiredDocuments === 2, "batch verification should count required matrix rows");
  assert(dryRun.summary.missingRequiredDocuments === 1, "batch verification should detect missing passport");
  assert(dryRun.missingRequirements[0]?.documentType === "passport", "missing requirement should identify passport");
  assert(dryRun.summary.verifiedDocuments === 1, "dry-run should verify the existing financial proof");
  assert(dryRun.status === "fail", "missing required document should fail the set");

  const unauthorized = await responseJson(
    await batchRoute.POST(
      adminRequest("/api/admin/documents/verify-batch", { studentProfileId: profile.id }, false)
    )
  );
  assert(unauthorized.status === 401, "batch verification API should require admin auth");

  const verified = await responseJson(
    await batchRoute.POST(
      adminRequest("/api/admin/documents/verify-batch", {
        studentProfileId: profile.id,
        stayAction: "issuance",
        applicantContext: "degree",
        enableRag: false,
        persist: true,
        createMissingPlaceholders: true,
      })
    )
  );
  assert(verified.ok, `batch verification API should succeed: ${JSON.stringify(verified.body)}`);
  assert(verified.body.verification.summary.missingRequiredDocuments === 1, "API should report missing required document");
  assert(
    verified.body.verification.missingRequirements[0]?.createdDocumentItemId,
    "API should create a missing placeholder when requested"
  );
  assert(verified.body.verification.summary.verifiedDocuments === 2, "API should verify existing and created placeholder documents");

  const placeholder = await db.documentItem.findUnique({
    where: { id: verified.body.verification.missingRequirements[0].createdDocumentItemId },
  });
  assert(placeholder?.documentType === "passport", "placeholder should be for the missing passport");
  assert(placeholder.reviewStatus === "NEEDS_HUMAN_REVIEW", "missing placeholder should require human review");
  assert(placeholder.ocrValidation, "missing placeholder should receive a verification snapshot");

  const audit = await db.adminAuditLog.findFirst({
    where: { action: "document.set_verified", targetId: profile.id },
  });
  assert(audit, "batch verification API should write admin audit log");

  const expiredUser = await db.user.create({
    data: {
      role: "STUDENT",
      email: "verification-batch-expired@student.kaxi.local",
      locale: "ko",
    },
  });
  const expiredProfile = await db.studentProfile.create({
    data: {
      userId: expiredUser.id,
      nationality: "VN",
      visaType: "D-2",
      programType: "degree",
    },
  });
  const expiredFile = await db.uploadedFile.create({
    data: {
      ownerUserId: expiredUser.id,
      storageKey: "verification-batch/expired-passport.pdf",
      originalName: "expired-passport.pdf",
      mimeType: "application/pdf",
      sizeBytes: 100,
      sha256: "e".repeat(64),
      piiClass: "student_visa_document",
    },
  });
  await db.documentItem.createMany({
    data: [
      {
        studentProfileId: expiredProfile.id,
        documentType: "financial_proof",
        required: true,
        status: "OCR_DONE",
        reviewStatus: "PENDING",
        fileId: file.id,
        ocrExtractedRedacted: jsonValue({
          financialProof: {
            holderName: "K***T",
            balanceAmount: 12000000,
            currency: "KRW",
            issueDate: "2026-07-01",
          },
          common: {
            holderName: "K***T",
            documentDate: "2026-07-01",
          },
        }),
      },
      {
        studentProfileId: expiredProfile.id,
        documentType: "passport",
        required: true,
        status: "EXPIRED",
        reviewStatus: "PENDING",
        fileId: expiredFile.id,
        ocrExtractedRedacted: jsonValue({
          passport: {
            passportNumber: "***1234",
            fullName: "K***T",
            expirationDate: "2020-12-31",
          },
        }),
      },
    ],
  });
  const expiredSet = await verifyDocumentSet({
    studentProfileId: expiredProfile.id,
    stayAction: "issuance",
    applicantContext: "degree",
    enableRag: false,
    persist: false,
    now: new Date("2026-07-08T00:00:00.000Z"),
  });
  assert(expiredSet.summary.missingRequiredDocuments === 1, "expired passport should count as missing in document-set verification");
  assert(expiredSet.missingRequirements[0]?.documentType === "passport", "expired passport missing requirement should identify passport");

  const duplicateUser = await db.user.create({
    data: {
      role: "STUDENT",
      email: "verification-batch-duplicate@student.kaxi.local",
      locale: "ko",
    },
  });
  const duplicateProfile = await db.studentProfile.create({
    data: {
      userId: duplicateUser.id,
      nationality: "VN",
      visaType: "D-2",
      programType: "degree",
    },
  });
  const duplicatePassportFile = await db.uploadedFile.create({
    data: {
      ownerUserId: duplicateUser.id,
      storageKey: "verification-batch/duplicate-passport.pdf",
      originalName: "duplicate-passport.pdf",
      mimeType: "application/pdf",
      sizeBytes: 100,
      sha256: "f".repeat(64),
      piiClass: "student_visa_document",
    },
  });
  const duplicateFinancialFileA = await db.uploadedFile.create({
    data: {
      ownerUserId: duplicateUser.id,
      storageKey: "verification-batch/duplicate-financial-a.pdf",
      originalName: "duplicate-financial-a.pdf",
      mimeType: "application/pdf",
      sizeBytes: 100,
      sha256: "1".repeat(64),
      piiClass: "student_visa_document",
    },
  });
  const duplicateFinancialFileB = await db.uploadedFile.create({
    data: {
      ownerUserId: duplicateUser.id,
      storageKey: "verification-batch/duplicate-financial-b.pdf",
      originalName: "duplicate-financial-b.pdf",
      mimeType: "application/pdf",
      sizeBytes: 100,
      sha256: "2".repeat(64),
      piiClass: "student_visa_document",
    },
  });
  await db.documentItem.createMany({
    data: [
      {
        studentProfileId: duplicateProfile.id,
        documentType: "passport",
        required: true,
        status: "OCR_DONE",
        reviewStatus: "PENDING",
        fileId: duplicatePassportFile.id,
        ocrExtractedRedacted: jsonValue({
          passport: {
            passportNumber: "***9999",
            fullName: "K***T",
            birthDate: "2000-01-01",
            expirationDate: "2099-12-31",
          },
        }),
      },
      {
        studentProfileId: duplicateProfile.id,
        documentType: "financial_proof",
        required: true,
        status: "OCR_DONE",
        reviewStatus: "PENDING",
        fileId: duplicateFinancialFileA.id,
        ocrExtractedRedacted: jsonValue({
          financialProof: {
            holderName: "K***T",
            balanceAmount: 12000000,
            currency: "KRW",
            issueDate: "2026-07-01",
          },
          common: {
            holderName: "K***T",
            documentDate: "2026-07-01",
          },
        }),
      },
      {
        studentProfileId: duplicateProfile.id,
        documentType: "financial_proof",
        required: true,
        status: "OCR_DONE",
        reviewStatus: "PENDING",
        fileId: duplicateFinancialFileB.id,
        ocrExtractedRedacted: jsonValue({
          financialProof: {
            holderName: "K***T",
            balanceAmount: 15000000,
            currency: "KRW",
            issueDate: "2026-07-02",
          },
          common: {
            holderName: "K***T",
            documentDate: "2026-07-02",
          },
        }),
      },
    ],
  });
  const duplicateSet = await verifyDocumentSet({
    studentProfileId: duplicateProfile.id,
    stayAction: "issuance",
    applicantContext: "degree",
    enableRag: false,
    persist: false,
    now: new Date("2026-07-08T00:00:00.000Z"),
  });
  assert(duplicateSet.summary.missingRequiredDocuments === 0, "duplicate-only set should not report missing required documents");
  assert(duplicateSet.summary.duplicateDocumentTypes === 1, "duplicate financial proof should count as one duplicate document type");
  assert(duplicateSet.summary.duplicateDocumentItems === 2, "duplicate financial proof should count both present duplicate documents");
  assert(
    duplicateSet.setIssues.some((issue) => issue.code === "duplicate_document_type:financial_proof"),
    "document-set verification should report duplicate financial proof as a set-level issue"
  );
  assert(duplicateSet.status === "warning", `duplicate set should require review without deterministic failure: ${JSON.stringify(duplicateSet.setIssues)}`);

  console.log("PASS document verification batch: missing matrix rows, placeholders, duplicate set issues, set summary, and audit log");
} finally {
  await db.$disconnect();
}
