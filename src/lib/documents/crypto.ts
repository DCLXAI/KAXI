import { createHash, createHmac, timingSafeEqual } from "crypto";

export interface DocumentUploadTokenPayload {
  studentRef: string;
  documentType: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  storageKey: string;
  exp: number;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function sha256Hex(value: Buffer | Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function getDocumentUploadSigningSecret(env: NodeJS.ProcessEnv = process.env): string {
  const configured =
    env.DOCUMENT_UPLOAD_SIGNING_SECRET ||
    env.NEXTAUTH_SECRET ||
    env.ADMIN_API_KEY ||
    "";

  if (configured.trim()) return configured.trim();
  if (env.NODE_ENV !== "production" && env.VERCEL !== "1") {
    return "kaxi-local-document-upload-development-secret";
  }
  return "";
}

export function signDocumentUploadPayload(payload: DocumentUploadTokenPayload, secret: string): string {
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyDocumentUploadToken(token: string, secret: string): DocumentUploadTokenPayload | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature || !secret) return null;

  const expected = createHmac("sha256", secret).update(encoded).digest("base64url");
  if (!safeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as DocumentUploadTokenPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
