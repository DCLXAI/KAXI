import { prepareTestDb } from "./prepare-test-db";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

process.env.DATA_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.PII_HASH_SECRET = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
process.env.TRANSFORMERS_ALLOW_REMOTE = "false";
prepareTestDb("document verification");

const { db } = await import("../src/lib/db");
const { VISA_DOCUMENT_REQUIREMENT_SEEDS } = await import("../src/lib/documents/visa-document-matrix");
const {
  sanitizeExtractionForRagJudgment,
  verifyDocumentItem,
} = await import("../src/lib/documents/verification");

function json(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

try {
  const sanitizedForLlm = sanitizeExtractionForRagJudgment({
    passport: {
      passportNumber: "M1234567",
      fullName: "KIM TEST",
      expirationDate: "2099-12-31",
    },
    financialProof: {
      bankName: "KAXI Bank",
      holderName: "KIM TEST",
      balanceAmount: 12000000,
      currency: "KRW",
      issueDate: "2026-07-01",
    },
    common: {
      contextSummary: "azalea-rag-duty-token",
      duties: "Backend software development",
    },
  });
  const sanitizedText = JSON.stringify(sanitizedForLlm);
  assert(sanitizedText.includes("azalea-rag-duty-token"), "LLM RAG extraction sanitizer should keep safe OCR context");
  assert(sanitizedText.includes("Backend software development"), "LLM RAG extraction sanitizer should keep safe semantic fields");
  assert(!sanitizedText.includes("M1234567"), "LLM RAG extraction sanitizer should remove passport numbers");
  assert(!sanitizedText.includes("KIM TEST"), "LLM RAG extraction sanitizer should remove identity names");
  assert(!sanitizedText.includes("12000000"), "LLM RAG extraction sanitizer should remove financial amounts");
  assert(!sanitizedText.includes("2099-12-31"), "LLM RAG extraction sanitizer should remove document dates");

  for (const seed of VISA_DOCUMENT_REQUIREMENT_SEEDS) {
    await db.visaDocumentRequirement.create({
      data: {
        ...seed,
        sourceRefs: json(seed.sourceRefs),
        requiredFields: json(seed.requiredFields),
        validationRules: json(seed.validationRules),
        lastCheckedAt: new Date(seed.lastCheckedAt),
        reviewStatus: seed.code === "d2_issuance_financial_proof" ? "APPROVED" : seed.reviewStatus,
      },
    });
  }

  const user = await db.user.create({
    data: {
      role: "STUDENT",
      email: "document-verification@student.kaxi.local",
      locale: "ko",
    },
  });
  const profile = await db.studentProfile.create({
    data: {
      userId: user.id,
      nationality: "VN",
      visaType: "D-2",
      programType: "degree",
      schoolName: "KAXI University",
    },
  });
  const file = await db.uploadedFile.create({
    data: {
      ownerUserId: user.id,
      storageKey: "test/financial-proof.pdf",
      originalName: "financial-proof.pdf",
      mimeType: "application/pdf",
      sizeBytes: 100,
      sha256: "a".repeat(64),
      piiClass: "student_visa_document",
    },
  });
  const financial = await db.documentItem.create({
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
        },
      },
    },
  });
  const passport = await db.documentItem.create({
    data: {
      studentProfileId: profile.id,
      documentType: "passport",
      required: true,
      status: "OCR_DONE",
      reviewStatus: "PENDING",
      ocrExtractedRedacted: {
        passport: {
          passportNumber: "***4567",
          fullName: "K***T",
          birthDate: "2000-01-01",
          expirationDate: "2099-12-31",
        },
      },
    },
  });

  const good = await verifyDocumentItem(financial.id, {
    stayAction: "issuance",
    applicantContext: "degree",
    enableRag: false,
    persist: true,
    now: new Date("2026-07-08T00:00:00.000Z"),
  });
  assert(good.requirementCode === "d2_issuance_financial_proof", "financial proof should match D-2 issuance requirement");
  assert(good.layers.rule === "pass", `expected rule layer pass: ${JSON.stringify(good.issues)}`);
  assert(good.layers.rag === "skipped", "RAG layer should be skipped when disabled");
  assert(good.layers.cross_document === "pass", "cross-document name check should pass");
  assert(good.status === "pass", `expected pass, got ${good.status}: ${JSON.stringify(good.issues)}`);

  await db.documentItem.update({
    where: { id: financial.id },
    data: {
      ocrExtractedRedacted: {
        financialProof: {
          bankName: "KAXI Bank",
          holderName: "K***T",
          balanceAmount: 0,
          currency: "KRW",
          issueDate: "2026-07-01",
        },
        common: {
          holderName: "K***T",
          issuer: "KAXI Bank",
          documentDate: "2026-07-01",
        },
      },
    },
  });
  const invalidBalance = await verifyDocumentItem(financial.id, {
    stayAction: "issuance",
    applicantContext: "degree",
    enableRag: false,
    persist: false,
    now: new Date("2026-07-08T00:00:00.000Z"),
  });
  assert(
    invalidBalance.issues.some((issue) => issue.code === "field_invalid_numeric_positive:balance"),
    "financial proof should require a positive numeric balance"
  );
  assert(invalidBalance.status === "warning", `invalid positive numeric field should require review: ${JSON.stringify(invalidBalance.issues)}`);

  await db.documentItem.update({
    where: { id: financial.id },
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
        },
      },
    },
  });

  await db.visaDocumentRequirement.update({
    where: { code: "d2_issuance_visa_application_form" },
    data: { reviewStatus: "APPROVED" },
  });
  const visaApplication = await db.documentItem.create({
    data: {
      studentProfileId: profile.id,
      documentType: "visa_application_form",
      required: true,
      status: "OCR_DONE",
      reviewStatus: "PENDING",
      fileId: file.id,
      ocrExtractedRedacted: {
        common: {
          fullName: "K***T",
          passportNumber: "***9999",
          birthDate: "1999-01-01",
          nationality: "VN",
          contact: "redacted",
        },
      },
    },
  });
  const passportNumberMismatch = await verifyDocumentItem(visaApplication.id, {
    stayAction: "issuance",
    applicantContext: "degree",
    enableRag: false,
    persist: false,
    now: new Date("2026-07-08T00:00:00.000Z"),
  });
  assert(
    passportNumberMismatch.issues.some((issue) => issue.code === "cross_document_passport_number_mismatch"),
    "cross-document layer should detect passport number mismatch across submitted documents"
  );
  assert(
    passportNumberMismatch.issues.some((issue) => issue.code === "cross_document_birth_date_mismatch"),
    "cross-document layer should detect birth date mismatch across submitted documents"
  );
  assert(
    !passportNumberMismatch.issues.some((issue) => {
      const evidenceText = JSON.stringify(issue.evidence || {});
      return evidenceText.includes("***9999") || evidenceText.includes("***4567") || evidenceText.includes("1999-01-01") || evidenceText.includes("2000-01-01");
    }),
    "identity mismatch evidence should not expose OCR passport numbers or birth dates"
  );

  await db.visaDocumentRequirement.update({
    where: { code: "d4_extension_attendance_certificate" },
    data: { reviewStatus: "APPROVED" },
  });
  const attendanceUser = await db.user.create({
    data: {
      role: "STUDENT",
      email: "document-verification-attendance@student.kaxi.local",
      locale: "ko",
    },
  });
  const attendanceProfile = await db.studentProfile.create({
    data: {
      userId: attendanceUser.id,
      nationality: "VN",
      visaType: "D-4",
      programType: "language_training",
    },
  });
  const attendanceFile = await db.uploadedFile.create({
    data: {
      ownerUserId: attendanceUser.id,
      storageKey: "test/attendance-certificate.pdf",
      originalName: "attendance-certificate.pdf",
      mimeType: "application/pdf",
      sizeBytes: 100,
      sha256: "d".repeat(64),
      piiClass: "student_visa_document",
    },
  });
  const attendanceDocument = await db.documentItem.create({
    data: {
      studentProfileId: attendanceProfile.id,
      documentType: "attendance_certificate",
      required: true,
      status: "OCR_DONE",
      reviewStatus: "PENDING",
      fileId: attendanceFile.id,
      ocrExtractedRedacted: {
        common: {
          holderName: "K***T",
          attendanceRate: "150%",
          period: "2026 spring",
          documentDate: "2026-07-01",
        },
      },
    },
  });
  const invalidAttendanceRate = await verifyDocumentItem(attendanceDocument.id, {
    stayAction: "extension",
    applicantContext: "language_training",
    enableRag: false,
    persist: false,
    now: new Date("2026-07-08T00:00:00.000Z"),
  });
  assert(
    invalidAttendanceRate.issues.some((issue) => issue.code === "field_invalid_numeric_range:attendance_rate"),
    "attendance proof should require attendance_rate to be within 0-100"
  );
  assert(invalidAttendanceRate.status === "warning", `invalid numeric range should require review: ${JSON.stringify(invalidAttendanceRate.issues)}`);

  const uploadedOnlyFinancial = await db.documentItem.create({
    data: {
      studentProfileId: profile.id,
      documentType: "financial_proof",
      required: true,
      status: "UPLOADED",
      reviewStatus: "PENDING",
      fileId: file.id,
      ocrExtractedRedacted: { common: {} },
    },
  });
  const noOcr = await verifyDocumentItem(uploadedOnlyFinancial.id, {
    stayAction: "issuance",
    applicantContext: "degree",
    enableRag: false,
    persist: false,
    now: new Date("2026-07-08T00:00:00.000Z"),
  });
  assert(
    noOcr.issues.some((issue) => issue.code === "ocr_extraction_missing"),
    "uploaded document without OCR extraction should require human review"
  );
  assert(noOcr.status === "warning", `uploaded document without OCR should warn: ${JSON.stringify(noOcr.issues)}`);

  const expiredPassport = await db.documentItem.create({
    data: {
      studentProfileId: profile.id,
      documentType: "passport",
      required: true,
      status: "EXPIRED",
      reviewStatus: "PENDING",
      fileId: file.id,
      ocrExtractedRedacted: {
        passport: {
          passportNumber: "***4567",
          fullName: "K***T",
          expirationDate: "2020-12-31",
        },
      },
    },
  });
  const expired = await verifyDocumentItem(expiredPassport.id, {
    stayAction: "issuance",
    applicantContext: "degree",
    enableRag: false,
    persist: false,
    now: new Date("2026-07-08T00:00:00.000Z"),
  });
  assert(
    expired.issues.some((issue) => issue.code === "required_document_missing"),
    "expired document status should not count as a present required document"
  );
  assert(expired.status === "fail", "expired required document should fail verification");

  const ocrDoneExpiredPassport = await db.documentItem.create({
    data: {
      studentProfileId: profile.id,
      documentType: "passport",
      required: true,
      status: "OCR_DONE",
      reviewStatus: "PENDING",
      fileId: file.id,
      ocrExtractedRedacted: {
        passport: {
          passportNumber: "***4567",
          fullName: "K***T",
          expirationDate: "2020-12-31",
          birthDate: "2000-01-01",
        },
      },
    },
  });
  const expiredByOcrDate = await verifyDocumentItem(ocrDoneExpiredPassport.id, {
    stayAction: "issuance",
    applicantContext: "degree",
    enableRag: false,
    persist: false,
    now: new Date("2026-07-08T00:00:00.000Z"),
  });
  assert(
    expiredByOcrDate.issues.some((issue) => issue.code === "document_expired"),
    "OCR_DONE document with past expiration date should fail deterministic validation"
  );
  assert(expiredByOcrDate.status === "fail", "past expiration date should fail verification");

  const admissionLetter = await db.documentItem.create({
    data: {
      studentProfileId: profile.id,
      documentType: "standard_admission_letter",
      required: true,
      status: "OCR_DONE",
      reviewStatus: "PENDING",
      fileId: file.id,
      ocrExtractedRedacted: {
        common: {
          schoolName: "KAXI University",
          studentName: "K***T",
          program: "Bachelor degree",
        },
      },
    },
  });
  await db.documentItem.create({
    data: {
      studentProfileId: profile.id,
      documentType: "transcript",
      required: true,
      status: "OCR_DONE",
      reviewStatus: "PENDING",
      fileId: file.id,
      ocrExtractedRedacted: {
        common: {
          schoolName: "Different Future College",
          studentName: "K***T",
          grades: "A",
        },
      },
    },
  });
  const schoolMismatch = await verifyDocumentItem(admissionLetter.id, {
    stayAction: "issuance",
    applicantContext: "degree",
    enableRag: false,
    persist: false,
    now: new Date("2026-07-08T00:00:00.000Z"),
  });
  assert(
    schoolMismatch.issues.some((issue) => issue.code === "cross_document_school_mismatch"),
    "cross-document layer should detect mismatched school names across education/admission documents"
  );

  await db.documentItem.update({
    where: { id: financial.id },
    data: {
      ocrExtractedRedacted: {
        financialProof: {
          bankName: "KAXI Bank",
          holderName: "K***T",
          balanceAmount: 12000000,
          currency: "KRW",
          issueDate: "2026-01-01",
        },
        common: {
          holderName: "K***T",
          issuer: "KAXI Bank",
          documentDate: "2026-01-01",
        },
      },
    },
  });
  const stale = await verifyDocumentItem(financial.id, {
    stayAction: "issuance",
    applicantContext: "degree",
    enableRag: false,
    persist: false,
    now: new Date("2026-07-08T00:00:00.000Z"),
  });
  assert(stale.status === "fail", "stale financial proof should fail");
  assert(stale.issues.some((issue) => issue.code === "document_stale"), "stale document should produce document_stale issue");

  await db.documentItem.update({
    where: { id: financial.id },
    data: {
      ocrExtractedRedacted: {
        financialProof: {
          bankName: "KAXI Bank",
          holderName: "K***T",
          balanceAmount: 12000000,
          currency: "KRW",
          issueDate: "2099-01-01",
        },
        common: {
          holderName: "K***T",
          issuer: "KAXI Bank",
          documentDate: "2099-01-01",
        },
      },
    },
  });
  const futureDated = await verifyDocumentItem(financial.id, {
    stayAction: "issuance",
    applicantContext: "degree",
    enableRag: false,
    persist: false,
    now: new Date("2026-07-08T00:00:00.000Z"),
  });
  assert(
    futureDated.issues.some((issue) => issue.code === "document_issue_date_in_future"),
    "future issue date should be flagged"
  );
  assert(futureDated.status === "warning", "future issue date should require human review");

  await db.documentItem.update({
    where: { id: passport.id },
    data: {
      ocrExtractedRedacted: {
        passport: {
          passportNumber: "***4567",
          fullName: "X***Z",
          expirationDate: "2099-12-31",
        },
      },
    },
  });
  const mismatch = await verifyDocumentItem(financial.id, {
    stayAction: "issuance",
    applicantContext: "degree",
    enableRag: false,
    persist: false,
    now: new Date("2026-07-08T00:00:00.000Z"),
  });
  assert(
    mismatch.issues.some((issue) => issue.code === "cross_document_name_mismatch"),
    "cross-document layer should detect name mismatch"
  );

  await db.visaDocumentRequirement.createMany({
    data: [
      {
        code: "priority_general_approved",
        visaType: "D-2",
        stayAction: "issuance",
        applicantContext: "general",
        documentType: "priority_test_document",
        labelKo: "우선순위 테스트 서류",
        labelEn: "Priority test document",
        required: true,
        validityDays: 90,
        issuer: "test",
        requiredFields: json([{ key: "holder_name", labelKo: "성명", labelEn: "Name" }]),
        validationRules: json(["field:holder_name:present"]),
        sourceRefs: json(["priority-test"]),
        sourceUrl: "https://www.hikorea.go.kr",
        sourceType: "official_government",
        lastCheckedAt: new Date("2026-07-01"),
        checkedBy: "test",
        reviewStatus: "APPROVED",
      },
      {
        code: "priority_degree_pending",
        visaType: "D-2",
        stayAction: "issuance",
        applicantContext: "degree",
        documentType: "priority_test_document",
        labelKo: "우선순위 테스트 서류 세부",
        labelEn: "Priority test document specific",
        required: true,
        validityDays: 90,
        issuer: "test",
        requiredFields: json([{ key: "holder_name", labelKo: "성명", labelEn: "Name" }]),
        validationRules: json(["field:holder_name:present"]),
        sourceRefs: json(["priority-test-specific"]),
        sourceUrl: "https://www.hikorea.go.kr",
        sourceType: "official_government",
        lastCheckedAt: new Date("2026-07-08"),
        checkedBy: "test",
        reviewStatus: "PENDING",
      },
    ],
  });
  const priorityDocument = await db.documentItem.create({
    data: {
      studentProfileId: profile.id,
      documentType: "priority_test_document",
      required: true,
      status: "OCR_DONE",
      reviewStatus: "PENDING",
      fileId: file.id,
      ocrExtractedRedacted: { common: { holderName: "K***T", documentDate: "2026-07-01" } },
    },
  });
  const priority = await verifyDocumentItem(priorityDocument.id, {
    stayAction: "issuance",
    applicantContext: "degree",
    enableRag: false,
    persist: false,
    now: new Date("2026-07-08T00:00:00.000Z"),
  });
  assert(priority.requirementCode === "priority_general_approved", "approved general requirement should outrank pending exact context");
  assert(
    !priority.issues.some((issue) => issue.code === "requirement_not_approved"),
    "approved fallback requirement should not require legal review only because a pending exact row exists"
  );

  await db.visaDocumentRequirement.create({
    data: {
      code: "context_consistency_approved",
      visaType: "D-2",
      stayAction: "issuance",
      applicantContext: "general",
      documentType: "context_consistency_document",
      labelKo: "컨텍스트 일치 테스트 서류",
      labelEn: "Context consistency test document",
      required: true,
      validityDays: 90,
      issuer: "test",
      requiredFields: json([{ key: "holder_name", labelKo: "성명", labelEn: "Name" }]),
      validationRules: json(["field:holder_name:present"]),
      sourceRefs: json(["context-consistency-test"]),
      sourceUrl: "https://www.hikorea.go.kr",
      sourceType: "official_government",
      lastCheckedAt: new Date("2026-07-08"),
      checkedBy: "test",
      reviewStatus: "APPROVED",
    },
  });
  const contextUser = await db.user.create({
    data: {
      role: "STUDENT",
      email: "document-verification-context@student.kaxi.local",
      locale: "ko",
    },
  });
  const contextProfile = await db.studentProfile.create({
    data: {
      userId: contextUser.id,
      nationality: "VN",
      visaType: "D-2",
      programType: "degree",
      schoolName: "KAXI University",
    },
  });
  const contextFile = await db.uploadedFile.create({
    data: {
      ownerUserId: contextUser.id,
      storageKey: "test/context-consistency.pdf",
      originalName: "context-consistency.pdf",
      mimeType: "application/pdf",
      sizeBytes: 100,
      sha256: "c".repeat(64),
      piiClass: "student_visa_document",
    },
  });
  const contextDocument = await db.documentItem.create({
    data: {
      studentProfileId: contextProfile.id,
      documentType: "context_consistency_document",
      required: true,
      status: "OCR_DONE",
      reviewStatus: "PENDING",
      fileId: contextFile.id,
      ocrExtractedRedacted: {
        common: {
          holderName: "K***T",
          schoolName: "Different Future College",
          requestedVisaType: "D-4",
          stayAction: "extension",
        },
      },
    },
  });
  const contextMismatch = await verifyDocumentItem(contextDocument.id, {
    stayAction: "issuance",
    applicantContext: "degree",
    enableRag: false,
    persist: false,
    now: new Date("2026-07-08T00:00:00.000Z"),
  });
  assert(
    contextMismatch.issues.some((issue) => issue.code === "cross_document_visa_type_mismatch"),
    "cross-document layer should detect OCR visa type mismatch against case context"
  );
  assert(
    contextMismatch.issues.some((issue) => issue.code === "cross_document_stay_action_mismatch"),
    "cross-document layer should detect OCR stay action mismatch against case context"
  );
  assert(
    contextMismatch.issues.some((issue) => issue.code === "cross_document_profile_school_mismatch"),
    "cross-document layer should detect OCR school mismatch against profile context"
  );
  assert(contextMismatch.status === "warning", `context mismatch should require review without deterministic failure: ${JSON.stringify(contextMismatch.issues)}`);

  const e7User = await db.user.create({
    data: {
      role: "STUDENT",
      email: "document-verification-e7@student.kaxi.local",
      locale: "ko",
    },
  });
  const e7Profile = await db.studentProfile.create({
    data: {
      userId: e7User.id,
      nationality: "VN",
      visaType: "E-7",
      programType: "specific_activity",
    },
  });
  const e7File = await db.uploadedFile.create({
    data: {
      ownerUserId: e7User.id,
      storageKey: "test/e7-job-description.pdf",
      originalName: "e7-job-description.pdf",
      mimeType: "application/pdf",
      sizeBytes: 100,
      sha256: "b".repeat(64),
      piiClass: "student_visa_document",
    },
  });
  const jobDescription = await db.documentItem.create({
    data: {
      studentProfileId: e7Profile.id,
      documentType: "job_description",
      required: true,
      status: "OCR_DONE",
      reviewStatus: "PENDING",
      fileId: e7File.id,
      ocrExtractedRedacted: {
        jobDescription: {
          jobTitle: "Software developer",
          duties: "Backend software development and data platform engineering",
          requiredQualification: "Computer science degree",
        },
      },
    },
  });
  const businessRegistration = await db.documentItem.create({
    data: {
      studentProfileId: e7Profile.id,
      documentType: "employer_business_registration",
      required: true,
      status: "OCR_DONE",
      reviewStatus: "PENDING",
      fileId: e7File.id,
      ocrExtractedRedacted: {
        businessRegistration: {
          businessNumber: "***-**-12345",
          companyName: "KAXI Foods",
          industryCode: "restaurant food service kitchen",
        },
      },
    },
  });
  const e7Mismatch = await verifyDocumentItem(jobDescription.id, {
    stayAction: "change",
    applicantContext: "specific_activity",
    enableRag: false,
    persist: false,
    now: new Date("2026-07-08T00:00:00.000Z"),
  });
  assert(
    e7Mismatch.issues.some((issue) => issue.code === "cross_document_occupation_industry_mismatch"),
    "E-7 cross-document layer should detect job/industry mismatch"
  );

  await db.documentItem.update({
    where: { id: businessRegistration.id },
    data: {
      ocrExtractedRedacted: {
        businessRegistration: {
          businessNumber: "***-**-12345",
          companyName: "KAXI Software",
          industryCode: "software development information technology services",
        },
      },
    },
  });
  const e7Matched = await verifyDocumentItem(jobDescription.id, {
    stayAction: "change",
    applicantContext: "specific_activity",
    enableRag: false,
    persist: false,
    now: new Date("2026-07-08T00:00:00.000Z"),
  });
  assert(
    !e7Matched.issues.some((issue) => issue.code === "cross_document_occupation_industry_mismatch"),
    "E-7 matched software job/industry should not produce mismatch"
  );
  assert(
    !e7Matched.issues.some((issue) => issue.code.startsWith("cross_check_pending:")),
    "E-7 matched software job/industry should not remain pending"
  );

  console.log("PASS document verification: rule, stale-date, cross-document, requirement priority, and E-7 occupation checks");
} finally {
  await db.$disconnect();
}
