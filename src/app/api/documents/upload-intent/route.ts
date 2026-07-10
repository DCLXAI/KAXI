import { NextRequest, NextResponse } from "next/server";
import { AuthBridgeError, requireKaxiUser } from "@/lib/supabase/auth";
import { DOCUMENT_UPLOAD_TOKEN_TTL_SECONDS } from "@/lib/documents/config";
import { getDocumentUploadSigningSecret, signDocumentUploadPayload } from "@/lib/documents/crypto";
import {
  createDocumentStorageKey,
  getStudentProfileForUser,
  validateDocumentUpload,
} from "@/lib/documents/repository";
import { getDocumentWorkspaceIssue } from "@/lib/documents/workspace-availability";

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
    const workspaceIssue = getDocumentWorkspaceIssue("upload");
    if (workspaceIssue) return NextResponse.json(workspaceIssue, { status: 503 });

    const user = await requireKaxiUser(["STUDENT"]);
    const profile = await getStudentProfileForUser(user.id);
    const secret = getDocumentUploadSigningSecret();

    const body = (await req.json().catch(() => ({}))) as {
      documentType?: string;
      originalName?: string;
      mimeType?: string;
      sizeBytes?: number;
      sha256?: string;
    };

    const documentType = String(body.documentType || "").trim();
    const originalName = String(body.originalName || "").trim();
    const mimeType = String(body.mimeType || "").trim();
    const sizeBytes = Number(body.sizeBytes);
    const sha256 = String(body.sha256 || "").trim().toLowerCase();

    if (!documentType) {
      return NextResponse.json({ error: "documentType is required" }, { status: 400 });
    }
    validateDocumentUpload({ originalName, mimeType, sizeBytes, sha256 });

    const storageKey = createDocumentStorageKey({
      studentProfileId: profile.id,
      documentType,
      originalName,
      sha256,
    });
    const exp = Math.floor(Date.now() / 1000) + DOCUMENT_UPLOAD_TOKEN_TTL_SECONDS;
    const token = signDocumentUploadPayload(
      { studentProfileId: profile.id, documentType, originalName, mimeType, sizeBytes, sha256, storageKey, exp },
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
    if (err instanceof AuthBridgeError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    if (isExpectedValidationError(err)) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid upload request" }, { status: 400 });
    }
    console.error("[POST /api/documents/upload-intent]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
