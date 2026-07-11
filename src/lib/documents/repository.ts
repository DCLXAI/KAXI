import { DocumentStatus, Prisma, ReviewStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { notifyDocumentReview } from "@/lib/notifications/domain";
import { recordAuditLog } from "@/lib/audit";
import {
  DEFAULT_DOCUMENT_TYPES,
  isAllowedDocumentMimeType,
  maxDocumentUploadBytes,
  type SupportedDocumentStatus,
  type SupportedReviewStatus,
} from "./config";
import { sha256Hex } from "./crypto";
import { persistUploadedBytes } from "./storage";

export interface DocumentValidationInput {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
}

export interface DocumentUploadCommitInput extends DocumentValidationInput {
  studentProfileId: string;
  documentType: string;
  storageKey: string;
  bytes: Uint8Array;
}

export interface DocumentAuditContext {
  actor: string;
  actorRole: string;
  action: string;
  ip?: string | null;
  userAgent?: string | null;
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function safeFileName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120) || "document";
}

export function validateDocumentUpload(input: DocumentValidationInput) {
  const maxBytes = maxDocumentUploadBytes();
  if (!input.originalName?.trim()) throw new Error("originalName is required.");
  if (!isAllowedDocumentMimeType(input.mimeType)) throw new Error("Unsupported MIME type.");
  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > maxBytes) {
    throw new Error(`File size must be between 1 and ${maxBytes} bytes.`);
  }
  if (!/^[a-f0-9]{64}$/i.test(input.sha256)) throw new Error("sha256 must be a 64-character hex string.");
}

export function createDocumentStorageKey(input: {
  studentProfileId: string;
  documentType: string;
  originalName: string;
  sha256: string;
}): string {
  const studentHash = sha256Hex(input.studentProfileId).slice(0, 20);
  const docType = input.documentType.replace(/[^\w.\-]+/g, "_").slice(0, 64);
  return `uploads/${studentHash}/${docType}/${Date.now()}-${input.sha256.slice(0, 16)}-${safeFileName(input.originalName)}`;
}

export async function getStudentProfileForUser(userId: string) {
  return db.studentProfile.upsert({
    where: { userId },
    update: {},
    create: { userId, nationality: "VN" },
  });
}

export async function listDocumentsForProfile(studentProfileId: string) {
  const existing = await db.documentItem.findMany({
    where: { studentProfileId },
    include: { file: true },
    orderBy: [{ required: "desc" }, { documentType: "asc" }],
  });
  const byType = new Map(existing.map((item) => [item.documentType, item]));

  return DEFAULT_DOCUMENT_TYPES.map((template) => {
    const item = byType.get(template.type);
    return {
      id: item?.id || null,
      documentType: template.type,
      label: template.label,
      required: item?.required ?? template.required,
      status: item?.status || DocumentStatus.NOT_UPLOADED,
      reviewStatus: item?.reviewStatus || ReviewStatus.PENDING,
      reviewNote: item?.reviewNote || null,
      expiresAt: item?.expiresAt?.toISOString() || null,
      ocrExtractedRedacted: item?.ocrExtractedRedacted || null,
      ocrValidation: item?.ocrValidation || null,
      ocrModel: item?.ocrModel || null,
      ocrProcessedAt: item?.ocrProcessedAt?.toISOString() || null,
      file: item?.file
        ? {
            id: item.file.id,
            originalName: item.file.originalName,
            mimeType: item.file.mimeType,
            sizeBytes: item.file.sizeBytes,
            sha256: item.file.sha256,
            createdAt: item.file.createdAt.toISOString(),
          }
        : null,
    };
  });
}

async function auditDocumentStatusChange(input: {
  studentProfileId: string;
  documentItemId: string;
  documentType: string;
  previousStatus: string | null;
  nextStatus: string;
  previousReviewStatus?: string | null;
  nextReviewStatus?: string | null;
  fileId?: string | null;
  context: DocumentAuditContext;
}) {
  await db.auditEvent.create({
    data: {
      actorRole: input.context.actorRole,
      action: input.context.action,
      targetType: "documentItem",
      targetId: input.documentItemId,
      success: true,
      ip: input.context.ip || null,
      userAgent: input.context.userAgent || null,
      metadata: jsonValue({
        actor: input.context.actor,
        studentProfileId: input.studentProfileId,
        documentType: input.documentType,
        previousStatus: input.previousStatus,
        nextStatus: input.nextStatus,
        previousReviewStatus: input.previousReviewStatus,
        nextReviewStatus: input.nextReviewStatus,
        fileId: input.fileId || null,
      }),
    },
  });

  await recordAuditLog({
    actor: input.context.actor,
    actorRole: input.context.actorRole,
    action: input.context.action,
    targetType: "documentItem",
    targetId: input.documentItemId,
    ip: input.context.ip || null,
    userAgent: input.context.userAgent || null,
    metadata: {
      studentProfileId: input.studentProfileId,
      documentType: input.documentType,
      previousStatus: input.previousStatus,
      nextStatus: input.nextStatus,
      previousReviewStatus: input.previousReviewStatus,
      nextReviewStatus: input.nextReviewStatus,
      fileId: input.fileId || null,
    },
  });
}

export async function commitDocumentUpload(input: DocumentUploadCommitInput, context: DocumentAuditContext) {
  validateDocumentUpload(input);
  if (input.bytes.byteLength !== input.sizeBytes) {
    throw new Error("Uploaded byte length does not match signed size.");
  }
  const actualHash = sha256Hex(Buffer.from(input.bytes));
  if (actualHash.toLowerCase() !== input.sha256.toLowerCase()) {
    throw new Error("Uploaded file hash does not match signed sha256.");
  }

  const profile = await db.studentProfile.findUniqueOrThrow({
    where: { id: input.studentProfileId },
  });
  await persistUploadedBytes(input.storageKey, input.bytes, input.mimeType);

  const result = await db.$transaction(async (tx) => {
    const file = await tx.uploadedFile.create({
      data: {
        ownerUserId: profile.userId,
        storageKey: input.storageKey,
        originalName: input.originalName.slice(0, 255),
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        sha256: actualHash,
        piiClass: "student_visa_document",
      },
    });

    const existing = await tx.documentItem.findFirst({
      where: {
        studentProfileId: profile.id,
        documentType: input.documentType,
      },
    });

    const item = existing
      ? await tx.documentItem.update({
          where: { id: existing.id },
          data: {
            fileId: file.id,
            status: DocumentStatus.UPLOADED,
            reviewStatus: ReviewStatus.PENDING,
            reviewNote: null,
          },
          include: { file: true },
        })
      : await tx.documentItem.create({
          data: {
            studentProfileId: profile.id,
            documentType: input.documentType,
            required: true,
            fileId: file.id,
            status: DocumentStatus.UPLOADED,
            reviewStatus: ReviewStatus.PENDING,
          },
          include: { file: true },
        });

    return { file, item, previous: existing };
  });

  await auditDocumentStatusChange({
    studentProfileId: profile.id,
    documentItemId: result.item.id,
    documentType: result.item.documentType,
    previousStatus: result.previous?.status || DocumentStatus.NOT_UPLOADED,
    nextStatus: result.item.status,
    previousReviewStatus: result.previous?.reviewStatus || null,
    nextReviewStatus: result.item.reviewStatus,
    fileId: result.file.id,
    context,
  });

  return result.item;
}

export async function reviewDocumentItem(
  documentItemId: string,
  input: {
    status: SupportedDocumentStatus;
    reviewStatus: SupportedReviewStatus;
    reviewNote?: string | null;
  },
  context: DocumentAuditContext
) {
  const existing = await db.documentItem.findUnique({ where: { id: documentItemId } });
  if (!existing) throw new Error("DocumentItem not found.");

  const updated = await db.$transaction(async (tx) => {
    const document = await tx.documentItem.update({
      where: { id: documentItemId },
      data: {
        status: input.status as DocumentStatus,
        reviewStatus: input.reviewStatus as ReviewStatus,
        reviewNote: input.reviewNote?.slice(0, 1000) || null,
      },
      include: { file: true },
    });
    await notifyDocumentReview({
      documentItemId: document.id,
      status: document.status,
      reviewStatus: document.reviewStatus,
      reviewNote: document.reviewNote,
      tx,
    });
    return document;
  });

  await auditDocumentStatusChange({
    studentProfileId: existing.studentProfileId,
    documentItemId,
    documentType: existing.documentType,
    previousStatus: existing.status,
    nextStatus: updated.status,
    previousReviewStatus: existing.reviewStatus,
    nextReviewStatus: updated.reviewStatus,
    fileId: updated.fileId,
    context,
  });

  return updated;
}
