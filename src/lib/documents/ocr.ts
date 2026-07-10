import { DocumentStatus, Prisma, ReviewStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";
import {
  LlmNotConfiguredError,
  generateLlmJson,
  getLlmModel,
  isLlmNotConfiguredError,
} from "@/lib/ai/llm-gateway";
import { encryptDocumentOcrPayload } from "@/lib/documents/crypto";
import { readUploadedBytes } from "@/lib/documents/storage";
import { verifyDocumentItem } from "@/lib/documents/verification";

export interface DocumentOcrContext {
  actor: string;
  actorRole: string;
  ip?: string | null;
  userAgent?: string | null;
}

export interface OcrExtraction {
  documentType: string;
  confidence: number;
  passport?: {
    passportNumber?: string | null;
    fullName?: string | null;
    expirationDate?: string | null;
  } | null;
  financialProof?: {
    bankName?: string | null;
    holderName?: string | null;
    balanceAmount?: number | null;
    currency?: string | null;
    issueDate?: string | null;
  } | null;
  common?: {
    holderName?: string | null;
    issuer?: string | null;
    documentDate?: string | null;
    expirationDate?: string | null;
  } | null;
}

interface OcrValidation {
  ok: boolean;
  issues: string[];
  checkedAt: string;
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function redactName(value: string | null | undefined): string | null {
  const text = value?.trim();
  if (!text) return null;
  if (text.length <= 2) return "*".repeat(text.length);
  return `${text.slice(0, 1)}***${text.slice(-1)}`;
}

function last4(value: string | null | undefined): string | null {
  const text = value?.replace(/\s+/g, "");
  return text ? `***${text.slice(-4)}` : null;
}

function redactedExtraction(extraction: OcrExtraction) {
  return {
    documentType: extraction.documentType,
    confidence: extraction.confidence,
    passport: extraction.passport
      ? {
          passportNumber: last4(extraction.passport.passportNumber),
          fullName: redactName(extraction.passport.fullName),
          expirationDate: extraction.passport.expirationDate || null,
        }
      : null,
    financialProof: extraction.financialProof
      ? {
          bankName: extraction.financialProof.bankName || null,
          holderName: redactName(extraction.financialProof.holderName),
          balanceAmount: extraction.financialProof.balanceAmount ?? null,
          currency: extraction.financialProof.currency || null,
          issueDate: extraction.financialProof.issueDate || null,
        }
      : null,
    common: extraction.common
      ? {
          holderName: redactName(extraction.common.holderName),
          issuer: extraction.common.issuer || null,
          documentDate: extraction.common.documentDate || null,
          expirationDate: extraction.common.expirationDate || null,
        }
      : null,
  };
}

function validateExtraction(documentType: string, extraction: OcrExtraction): OcrValidation {
  const issues: string[] = [];
  const now = new Date();

  if (!Number.isFinite(extraction.confidence) || extraction.confidence < 0.65) {
    issues.push("low_confidence");
  }

  if (documentType === "passport") {
    const passport = extraction.passport;
    if (!passport?.passportNumber) issues.push("passport_number_missing");
    if (!passport?.fullName) issues.push("passport_name_missing");
    const expiry = parseDate(passport?.expirationDate);
    if (!expiry) issues.push("passport_expiration_missing");
    else if (expiry.getTime() <= now.getTime()) issues.push("passport_expired");
  } else if (documentType === "financial_proof") {
    const proof = extraction.financialProof;
    if (!proof?.bankName) issues.push("bank_name_missing");
    if (!Number.isFinite(proof?.balanceAmount || NaN) || Number(proof?.balanceAmount) <= 0) {
      issues.push("balance_missing");
    }
    const issued = parseDate(proof?.issueDate);
    if (!issued) issues.push("issue_date_missing");
    else if (now.getTime() - issued.getTime() > 45 * 24 * 60 * 60 * 1000) issues.push("issue_date_stale");
  } else {
    if (!extraction.common?.issuer && !extraction.common?.documentDate) {
      issues.push("common_metadata_missing");
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    checkedAt: now.toISOString(),
  };
}

async function auditDocumentOcr(input: {
  documentItemId: string;
  studentProfileId: string;
  action: string;
  status: string;
  reviewStatus: string;
  context: DocumentOcrContext;
  metadata?: unknown;
}) {
  await db.auditEvent.create({
    data: {
      actorRole: input.context.actorRole,
      action: input.action,
      targetType: "documentItem",
      targetId: input.documentItemId,
      success: true,
      ip: input.context.ip || null,
      userAgent: input.context.userAgent || null,
      metadata: jsonValue({
        actor: input.context.actor,
        studentProfileId: input.studentProfileId,
        status: input.status,
        reviewStatus: input.reviewStatus,
        ...(input.metadata && typeof input.metadata === "object" ? input.metadata : { metadata: input.metadata }),
      }),
    },
  });

  await recordAuditLog({
    actor: input.context.actor,
    actorRole: input.context.actorRole,
    action: input.action,
    targetType: "documentItem",
    targetId: input.documentItemId,
    ip: input.context.ip || null,
    userAgent: input.context.userAgent || null,
    metadata: {
      studentProfileId: input.studentProfileId,
      status: input.status,
      reviewStatus: input.reviewStatus,
      metadata: input.metadata || {},
    },
  });
}

const OCR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["documentType", "confidence", "passport", "financialProof", "common"],
  properties: {
    documentType: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    passport: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          properties: {
            passportNumber: { type: ["string", "null"] },
            fullName: { type: ["string", "null"] },
            expirationDate: { type: ["string", "null"], description: "YYYY-MM-DD when visible" },
          },
        },
      ],
    },
    financialProof: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          properties: {
            bankName: { type: ["string", "null"] },
            holderName: { type: ["string", "null"] },
            balanceAmount: { type: ["number", "null"] },
            currency: { type: ["string", "null"] },
            issueDate: { type: ["string", "null"], description: "YYYY-MM-DD when visible" },
          },
        },
      ],
    },
    common: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          properties: {
            holderName: { type: ["string", "null"] },
            issuer: { type: ["string", "null"] },
            documentDate: { type: ["string", "null"] },
            expirationDate: { type: ["string", "null"] },
          },
        },
      ],
    },
  },
};

async function extractWithLlm(input: {
  documentType: string;
  mimeType: string;
  bytes: Buffer;
}): Promise<OcrExtraction> {
  const mock = process.env.DOCUMENT_OCR_MOCK_RESPONSE_JSON;
  if (mock) return JSON.parse(mock) as OcrExtraction;

  const isPdf = input.mimeType === "application/pdf";
  const mediaBlock = {
    type: isPdf ? "document" : "image",
    source: {
      type: "base64",
      media_type: input.mimeType,
      data: input.bytes.toString("base64"),
    },
  };

  return generateLlmJson<OcrExtraction>({
    feature: "structured",
    maxTokens: 1000,
    temperature: 0,
    jsonSchema: { name: "document_ocr_extraction", schema: OCR_SCHEMA },
    messages: [
      {
        role: "system",
        content:
          "Extract only visible fields from Korean student visa documents. Return null for unreadable fields. Do not infer absent values.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Document type hint: ${input.documentType}. Extract passport, financial proof, or common certificate metadata.`,
          },
          mediaBlock,
        ],
      },
    ],
  });
}

export async function processDocumentOcr(documentItemId: string, context: DocumentOcrContext) {
  const existing = await db.documentItem.findUnique({ where: { id: documentItemId }, include: { file: true } });
  if (!existing?.file) throw new Error("Document file not found for OCR.");

  const processing = await db.documentItem.update({
    where: { id: documentItemId },
    data: {
      status: DocumentStatus.OCR_PROCESSING,
      reviewStatus: ReviewStatus.PENDING,
      reviewNote: "OCR processing started",
    },
  });
  await auditDocumentOcr({
    documentItemId,
    studentProfileId: existing.studentProfileId,
    action: "document.ocr_processing",
    status: processing.status,
    reviewStatus: processing.reviewStatus,
    context,
  });

  try {
    const bytes = await readUploadedBytes(existing.file.storageKey);
    const extraction = await extractWithLlm({
      documentType: existing.documentType,
      mimeType: existing.file.mimeType,
      bytes,
    });
    const validation = validateExtraction(existing.documentType, extraction);
    const ciphertext = encryptDocumentOcrPayload(extraction);
    if (!ciphertext) throw new Error("DATA_ENCRYPTION_KEY is required to persist OCR extraction.");

    const expiry =
      parseDate(extraction.passport?.expirationDate) ||
      parseDate(extraction.common?.expirationDate) ||
      existing.expiresAt;
    const updated = await db.documentItem.update({
      where: { id: documentItemId },
      data: {
        status: validation.ok ? DocumentStatus.OCR_DONE : DocumentStatus.NEEDS_REVIEW,
        reviewStatus: validation.ok ? ReviewStatus.PENDING : ReviewStatus.NEEDS_HUMAN_REVIEW,
        reviewNote: validation.ok ? "OCR extraction completed" : `OCR needs review: ${validation.issues.join(", ")}`,
        expiresAt: expiry || existing.expiresAt,
        ocrExtractedCiphertext: ciphertext,
        ocrExtractedRedacted: jsonValue(redactedExtraction(extraction)),
        ocrValidation: jsonValue(validation),
        ocrModel: process.env.DOCUMENT_OCR_MOCK_RESPONSE_JSON ? "mock" : getLlmModel(),
        ocrProcessedAt: new Date(),
      },
      include: { file: true },
    });
    const verification = await verifyDocumentItem(updated.id, {
      persist: true,
      enableLlm: false,
      enableRag: false,
    }).catch((error) => ({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }));
    await auditDocumentOcr({
      documentItemId,
      studentProfileId: existing.studentProfileId,
      action: "document.ocr_completed",
      status: updated.status,
      reviewStatus: updated.reviewStatus,
      context,
      metadata: { validation, verification, model: updated.ocrModel },
    });
    return db.documentItem.findUniqueOrThrow({ where: { id: documentItemId }, include: { file: true } });
  } catch (err) {
    const missingLlm = err instanceof LlmNotConfiguredError || isLlmNotConfiguredError(err);
    const message = missingLlm
      ? "OCR skipped: the selected LLM API key is not configured"
      : `OCR needs manual review: ${err instanceof Error ? err.message : String(err)}`.slice(0, 1000);
    const updated = await db.documentItem.update({
      where: { id: documentItemId },
      data: {
        status: DocumentStatus.NEEDS_REVIEW,
        reviewStatus: ReviewStatus.NEEDS_HUMAN_REVIEW,
        reviewNote: message,
        ocrValidation: jsonValue({
          ok: false,
          issues: [missingLlm ? "llm_not_configured" : "ocr_processing_failed"],
          checkedAt: new Date().toISOString(),
        }),
        ocrModel: missingLlm ? null : getLlmModel(),
        ocrProcessedAt: new Date(),
      },
      include: { file: true },
    });
    await auditDocumentOcr({
      documentItemId,
      studentProfileId: existing.studentProfileId,
      action: missingLlm ? "document.ocr_skipped" : "document.ocr_failed",
      status: updated.status,
      reviewStatus: updated.reviewStatus,
      context,
      metadata: { reason: message },
    });
    return updated;
  }
}
