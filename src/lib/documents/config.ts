export const DOCUMENT_STATUS_VALUES = [
  "NOT_UPLOADED",
  "UPLOADED",
  "OCR_PROCESSING",
  "OCR_DONE",
  "MISSING",
  "EXPIRED",
  "NEEDS_REVIEW",
  "APPROVED",
  "REJECTED",
] as const;

export const REVIEW_STATUS_VALUES = ["PENDING", "APPROVED", "REJECTED", "NEEDS_HUMAN_REVIEW"] as const;

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const DEFAULT_DOCUMENT_TYPES = [
  { type: "passport", label: "여권", required: true },
  { type: "id_photo", label: "증명사진", required: true },
  { type: "standard_admission", label: "표준입학허가서", required: true },
  { type: "graduation_certificate", label: "졸업증명서", required: true },
  { type: "transcript", label: "성적증명서", required: true },
  { type: "financial_proof", label: "재정능력 증빙", required: true },
  { type: "tuberculosis_certificate", label: "결핵진단서", required: false },
  { type: "study_plan", label: "유학계획서", required: false },
] as const;

export const MAX_DOCUMENT_UPLOAD_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_UPLOAD_TOKEN_TTL_SECONDS = 10 * 60;

export type SupportedDocumentStatus = (typeof DOCUMENT_STATUS_VALUES)[number];
export type SupportedReviewStatus = (typeof REVIEW_STATUS_VALUES)[number];
export type AllowedDocumentMimeType = (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number];

export function isSupportedDocumentStatus(value: unknown): value is SupportedDocumentStatus {
  return typeof value === "string" && DOCUMENT_STATUS_VALUES.includes(value as SupportedDocumentStatus);
}

export function isSupportedReviewStatus(value: unknown): value is SupportedReviewStatus {
  return typeof value === "string" && REVIEW_STATUS_VALUES.includes(value as SupportedReviewStatus);
}

export function isAllowedDocumentMimeType(value: unknown): value is AllowedDocumentMimeType {
  return typeof value === "string" && ALLOWED_DOCUMENT_MIME_TYPES.includes(value as AllowedDocumentMimeType);
}

export function maxDocumentUploadBytes(): number {
  const configured = Number(process.env.DOCUMENT_UPLOAD_MAX_BYTES);
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : MAX_DOCUMENT_UPLOAD_BYTES;
}
