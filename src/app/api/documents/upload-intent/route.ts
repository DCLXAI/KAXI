import { NextRequest, NextResponse } from "next/server";
import { canWriteRuntimeDatabase } from "@/lib/db";
import { DOCUMENT_UPLOAD_TOKEN_TTL_SECONDS } from "@/lib/documents/config";
import { getDocumentUploadSigningSecret, signDocumentUploadPayload } from "@/lib/documents/crypto";
import { createDocumentStorageKey, validateDocumentUpload } from "@/lib/documents/repository";

export const runtime = "nodejs";

function isExpectedValidationError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes("Unsupported MIME type") ||
    message.includes("File size must be") ||
    message.includes("sha256") ||
    message.includes("originalName")
  );
}

export async function POST(req: NextRequest) {
  try {
    if (!canWriteRuntimeDatabase()) {
      return NextResponse.json({ error: "Document upload requires a writable database" }, { status: 503 });
    }

    const secret = getDocumentUploadSigningSecret();
    if (!secret) {
      return NextResponse.json({ error: "Document upload signing is not configured" }, { status: 503 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      studentRef?: string;
      documentType?: string;
      originalName?: string;
      mimeType?: string;
      sizeBytes?: number;
      sha256?: string;
    };

    const studentRef = String(body.studentRef || "").trim();
    const documentType = String(body.documentType || "").trim();
    const originalName = String(body.originalName || "").trim();
    const mimeType = String(body.mimeType || "").trim();
    const sizeBytes = Number(body.sizeBytes);
    const sha256 = String(body.sha256 || "").trim().toLowerCase();

    if (!studentRef || !documentType) {
      return NextResponse.json({ error: "studentRef and documentType are required" }, { status: 400 });
    }
    validateDocumentUpload({ originalName, mimeType, sizeBytes, sha256 });

    const storageKey = createDocumentStorageKey({ studentRef, documentType, originalName, sha256 });
    const exp = Math.floor(Date.now() / 1000) + DOCUMENT_UPLOAD_TOKEN_TTL_SECONDS;
    const token = signDocumentUploadPayload(
      { studentRef, documentType, originalName, mimeType, sizeBytes, sha256, storageKey, exp },
      secret
    );

    return NextResponse.json({
      method: "PUT",
      uploadUrl: `${req.nextUrl.origin}/api/documents/upload-direct?token=${encodeURIComponent(token)}`,
      expiresAt: new Date(exp * 1000).toISOString(),
      headers: {
        "content-type": mimeType,
        "x-kaxi-file-sha256": sha256,
      },
      maxBytes: sizeBytes,
      storageKey,
    });
  } catch (err) {
    if (!isExpectedValidationError(err)) console.error("[POST /api/documents/upload-intent]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 400 });
  }
}
