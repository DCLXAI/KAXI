import sharp from "sharp";
import { createHash } from "crypto";
import { isEnvTrue } from "@/lib/env";
import { detectChatAttachmentMimeType } from "@/lib/chat/attachment-files";

const MAX_IMAGE_PIXELS = 40_000_000;
const MAX_IMAGE_EDGE = 12_000;
const PDF_ACTIVE_CONTENT = [
  /\/JavaScript\b/i,
  /\/JS\b/i,
  /\/Launch\b/i,
  /\/EmbeddedFile\b/i,
  /\/Filespec\b/i,
  /\/OpenAction\b/i,
  /\/AA\b/i,
  /\/RichMedia\b/i,
  /\/XFA\b/i,
  /\/Encrypt\b/i,
];

export class UnsafeChatAttachmentError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "UnsafeChatAttachmentError";
    this.code = code;
  }
}

export class ChatAttachmentScannerUnavailableError extends Error {
  constructor(code: string) {
    super(code);
    this.name = "ChatAttachmentScannerUnavailableError";
  }
}

function configured(value: string | undefined) {
  const text = value?.trim() || "";
  return text && !/^(replace-with-|change_me)/i.test(text) ? text : "";
}

function scannerUrl(env: NodeJS.ProcessEnv) {
  const value = configured(env.ATTACHMENT_MALWARE_SCAN_URL);
  try {
    return value && new URL(value).protocol === "https:" ? value : "";
  } catch {
    return "";
  }
}

export function getChatAttachmentSecurityDiagnostics(env: NodeJS.ProcessEnv = process.env) {
  const mode = env.ATTACHMENT_MALWARE_SCAN_MODE?.trim().toLowerCase() === "http" ? "http" : "structural";
  const urlConfigured = Boolean(scannerUrl(env));
  const tokenConfigured = configured(env.ATTACHMENT_MALWARE_SCAN_TOKEN).length >= 16;
  const externalScannerConfigured = urlConfigured && tokenConfigured;
  const production = env.NODE_ENV === "production" || env.VERCEL_ENV === "production";
  const configuredUploadState = env.CHAT_ATTACHMENTS_ENABLED?.trim().toLowerCase();
  const uploadsRequested = configuredUploadState === "true" || (configuredUploadState !== "false" && !production);
  const externalScannerRequired =
    isEnvTrue(env.ATTACHMENT_MALWARE_SCAN_REQUIRED) || mode === "http";
  const ready = !uploadsRequested || !externalScannerRequired || externalScannerConfigured;
  return {
    mode,
    structuralSanitization: true,
    externalScannerConfigured,
    externalScannerRequired,
    uploadsRequested,
    uploadsEnabled: uploadsRequested && ready,
    ready,
  };
}

function assertPdfSafe(bytes: Buffer) {
  const text = bytes.toString("latin1");
  if (PDF_ACTIVE_CONTENT.some((pattern) => pattern.test(text))) {
    throw new UnsafeChatAttachmentError("pdf_active_content_rejected");
  }
  const eof = text.lastIndexOf("%%EOF");
  if (eof < 0) throw new UnsafeChatAttachmentError("pdf_eof_missing");
  if (text.slice(eof + 5).trim().length > 0) {
    throw new UnsafeChatAttachmentError("pdf_trailing_payload_rejected");
  }
}

async function assertImageSafe(bytes: Buffer, mimeType: string) {
  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(bytes, { failOn: "warning", limitInputPixels: MAX_IMAGE_PIXELS }).metadata();
  } catch {
    throw new UnsafeChatAttachmentError("image_decode_rejected");
  }
  const expectedFormat = mimeType === "image/jpeg" ? "jpeg" : mimeType.split("/")[1];
  if (metadata.format !== expectedFormat || !metadata.width || !metadata.height) {
    throw new UnsafeChatAttachmentError("image_format_rejected");
  }
  if (metadata.width > MAX_IMAGE_EDGE || metadata.height > MAX_IMAGE_EDGE || (metadata.pages || 1) !== 1) {
    throw new UnsafeChatAttachmentError("image_dimensions_rejected");
  }
  return metadata;
}

async function externalScan(bytes: Buffer, mimeType: string, env: NodeJS.ProcessEnv) {
  const diagnostics = getChatAttachmentSecurityDiagnostics(env);
  if (!diagnostics.externalScannerRequired && !diagnostics.externalScannerConfigured) {
    return { status: "structural-clean" as const, engine: "kaxi-structural" };
  }
  if (!diagnostics.externalScannerConfigured) {
    throw new ChatAttachmentScannerUnavailableError("malware_scanner_not_configured");
  }

  const controller = new AbortController();
  const timeout = Number.parseInt(env.ATTACHMENT_MALWARE_SCAN_TIMEOUT_MS || "", 10);
  const timer = setTimeout(() => controller.abort(), Number.isFinite(timeout) && timeout > 0 ? timeout : 15_000);
  try {
    const response = await fetch(scannerUrl(env), {
      method: "POST",
      headers: {
        authorization: `Bearer ${configured(env.ATTACHMENT_MALWARE_SCAN_TOKEN)}`,
        "content-type": "application/octet-stream",
        "x-kaxi-content-type": mimeType,
        "x-kaxi-content-sha256": createHash("sha256").update(bytes).digest("hex"),
      },
      body: new Uint8Array(bytes),
      signal: controller.signal,
    });
    if (!response.ok) throw new ChatAttachmentScannerUnavailableError(`malware_scanner_http_${response.status}`);
    const payload = await response.json().catch(() => null) as null | {
      clean?: boolean;
      infected?: boolean;
      status?: string;
      signature?: string;
      engine?: string;
    };
    const clean = payload?.clean === true || payload?.infected === false || payload?.status?.toLowerCase() === "clean";
    if (!clean) throw new UnsafeChatAttachmentError(payload?.signature ? "malware_detected" : "malware_scan_rejected");
    return { status: "clean" as const, engine: payload?.engine?.slice(0, 80) || "managed-http" };
  } catch (error) {
    if (error instanceof UnsafeChatAttachmentError || error instanceof ChatAttachmentScannerUnavailableError) throw error;
    throw new ChatAttachmentScannerUnavailableError("malware_scanner_unavailable");
  } finally {
    clearTimeout(timer);
  }
}

async function normalizeImage(bytes: Buffer, mimeType: string) {
  const pipeline = sharp(bytes, { failOn: "warning", limitInputPixels: MAX_IMAGE_PIXELS }).rotate();
  if (mimeType === "image/png") return pipeline.png({ compressionLevel: 9 }).toBuffer();
  if (mimeType === "image/webp") return pipeline.webp({ quality: 95, effort: 4 }).toBuffer();
  return pipeline.jpeg({ quality: 95, mozjpeg: true }).toBuffer();
}

export async function secureChatAttachmentUpload(
  bytes: Buffer,
  mimeType: string,
  env: NodeJS.ProcessEnv = process.env,
) {
  if (mimeType === "application/pdf") assertPdfSafe(bytes);
  else await assertImageSafe(bytes, mimeType);

  const scan = await externalScan(bytes, mimeType, env);
  const securedBytes = mimeType === "application/pdf" ? bytes : await normalizeImage(bytes, mimeType);
  if (detectChatAttachmentMimeType(securedBytes) !== mimeType) {
    throw new UnsafeChatAttachmentError("normalized_signature_mismatch");
  }
  return {
    bytes: securedBytes,
    scan,
    sanitized: mimeType !== "application/pdf",
  };
}

export async function verifyStoredChatAttachment(bytes: Buffer, mimeType: string) {
  if (mimeType === "application/pdf") assertPdfSafe(bytes);
  else await assertImageSafe(bytes, mimeType);
}

export async function checkManagedAttachmentScanner(env: NodeJS.ProcessEnv = process.env) {
  const diagnostics = getChatAttachmentSecurityDiagnostics(env);
  if (!diagnostics.uploadsRequested) {
    return { ok: true, detail: "Chat attachment uploads are disabled.", engine: null };
  }
  if (!diagnostics.externalScannerConfigured) {
    return { ok: false, detail: "Managed attachment scanner is not configured.", engine: null };
  }

  const probe = await sharp({
    create: {
      width: 1,
      height: 1,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  }).png().toBuffer();
  const result = await externalScan(probe, "image/png", env);
  return {
    ok: result.status === "clean",
    detail: result.status === "clean"
      ? "Managed attachment scanner accepted a safe synthetic probe."
      : "Managed attachment scanner did not return an external clean verdict.",
    engine: result.engine,
  };
}

export function isTerminalChatAttachmentError(error: unknown) {
  if (error instanceof UnsafeChatAttachmentError) return true;
  const code = error instanceof Error ? error.message : String(error);
  return [
    "attachment_not_found",
    "sha256_mismatch",
    "mime_signature_mismatch",
    "pdf_active_content_rejected",
    "pdf_eof_missing",
    "pdf_trailing_payload_rejected",
    "image_decode_rejected",
    "image_format_rejected",
    "image_dimensions_rejected",
    "normalized_signature_mismatch",
    "malware_detected",
    "malware_scan_rejected",
  ].includes(code);
}
