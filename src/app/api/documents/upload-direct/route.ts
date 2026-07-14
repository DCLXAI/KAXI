import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/lib/api/security";
import { getDocumentUploadSigningSecret, verifyDocumentUploadToken } from "@/lib/documents/crypto";
import { commitDocumentUpload } from "@/lib/documents/repository";
import { processDocumentOcr } from "@/lib/documents/ocr";
import { getDocumentWorkspaceIssue } from "@/lib/documents/workspace-availability";
import { sendOpsAlert } from "@/lib/ops/alerts";

export const runtime = "nodejs";
export const maxDuration = 60;

function isExpectedValidationError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes("Uploaded byte length") ||
    message.includes("hash does not match") ||
    message.includes("Unsupported MIME type") ||
    message.includes("File size must be")
  );
}

export async function PUT(req: NextRequest) {
  try {
    const workspaceIssue = getDocumentWorkspaceIssue("upload");
    if (workspaceIssue) return NextResponse.json(workspaceIssue, { status: 503 });

    // The signed upload token travels in a header, not the URL query string, so
    // it cannot leak through access logs, the Referer header, or browser history.
    const token = req.headers.get("x-kaxi-upload-token")?.trim() || "";
    const secret = getDocumentUploadSigningSecret();
    const payload = verifyDocumentUploadToken(token, secret);
    if (!payload) return NextResponse.json({ error: "Invalid or expired upload token" }, { status: 401 });

    const contentType = req.headers.get("content-type")?.split(";")[0]?.trim() || "";
    const headerSha = req.headers.get("x-kaxi-file-sha256")?.trim().toLowerCase();
    if (contentType !== payload.mimeType) {
      return NextResponse.json({ error: "MIME type does not match signed upload intent" }, { status: 415 });
    }
    if (headerSha && headerSha !== payload.sha256.toLowerCase()) {
      return NextResponse.json({ error: "x-kaxi-file-sha256 does not match signed upload intent" }, { status: 400 });
    }

    const arrayBuffer = await req.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const context = {
      actor: `student:${payload.studentProfileId}`,
      actorRole: "student",
      action: "document.uploaded",
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    };
    const item = await commitDocumentUpload(
      {
        studentProfileId: payload.studentProfileId,
        documentType: payload.documentType,
        originalName: payload.originalName,
        mimeType: payload.mimeType,
        sizeBytes: payload.sizeBytes,
        sha256: payload.sha256,
        storageKey: payload.storageKey,
        bytes,
      },
      context
    );
    const processed = await processDocumentOcr(item.id, {
      actor: context.actor,
      actorRole: context.actorRole,
      ip: context.ip,
      userAgent: context.userAgent,
    });

    sendOpsAlert({
      kind: "kaxi_ops_alert",
      source: "kaxi-documents",
      severity: "warning",
      eventType: "document_uploaded",
      message: "새 서류가 업로드되었습니다.",
      occurredAt: new Date().toISOString(),
      details: { documentItemId: processed.id, documentType: processed.documentType },
      adminUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://kaxi.vercel.app"}/admin/documents`,
    }).catch((err) => console.warn("[ops alert] document upload", err instanceof Error ? err.message : err));

    return NextResponse.json({
      ok: true,
      document: {
        id: processed.id,
        documentType: processed.documentType,
        status: processed.status,
        reviewStatus: processed.reviewStatus,
        reviewNote: processed.reviewNote,
        fileId: processed.fileId,
      },
    });
  } catch (err) {
    if (isExpectedValidationError(err)) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid upload" }, { status: 400 });
    }
    console.error("[PUT /api/documents/upload-direct]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
