import { createHash } from "crypto";
import { after, NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseLimit, rateLimit } from "@/lib/api/security";
import { persistChatAttachment } from "@/lib/chat/persistence";
import { CHAT_ATTACHMENT_MIME_TYPES, detectChatAttachmentMimeType } from "@/lib/chat/attachment-files";
import { drainChatAttachmentJobs, enqueueChatAttachmentJob, retryChatAttachmentJob } from "@/lib/chat/attachment-jobs";
import { getChatAttachmentStatus, processChatAttachment } from "@/lib/chat/attachment-processing";
import {
  ChatAttachmentScannerUnavailableError,
  getChatAttachmentSecurityDiagnostics,
  secureChatAttachmentUpload,
  UnsafeChatAttachmentError,
} from "@/lib/chat/attachment-security";
import { CHAT_SESSION_COOKIE, isKaxiSessionId, verifyChatSessionToken } from "@/lib/chat/session-token";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
function chatAttachmentBucket() {
  return (
    process.env.SUPABASE_CHAT_ATTACHMENTS_BUCKET?.trim() ||
    process.env.SUPABASE_STORAGE_BUCKET?.trim() ||
    "kaxi-documents"
  );
}

function configured(value: string | undefined) {
  const text = value?.trim() || "";
  if (!text || /^replace-with-/i.test(text)) return "";
  return text;
}

async function createSupabaseStorageClient() {
  const url = configured(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = configured(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_STORAGE_NOT_CONFIGURED");
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function sanitizeFileName(name: string) {
  const fallback = "attachment";
  return (
    name
      .normalize("NFKD")
      .replace(/[^\w. -]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 96) || fallback
  );
}

function sanitizePathSegment(value: string) {
  return value.replace(/[^\w-]/g, "").slice(0, 80) || "site-session";
}

function ownedSession(req: NextRequest, sessionId: string) {
  return isKaxiSessionId(sessionId) && Boolean(
    verifyChatSessionToken(req.cookies.get(CHAT_SESSION_COOKIE)?.value, sessionId),
  );
}

export async function POST(req: NextRequest) {
  if (!getChatAttachmentSecurityDiagnostics().uploadsEnabled) {
    return NextResponse.json(
      { error: "attachment uploads are not enabled", code: "ATTACHMENTS_DISABLED" },
      { status: 503 },
    );
  }
  const limited = await rateLimit(req, {
    key: "chat-attachments",
    limit: parseLimit(process.env.CHAT_ATTACHMENT_RATE_LIMIT, 12),
    windowMs: 60 * 1000,
  });
  if (limited) return limited;

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const rawSessionId = String(formData.get("sessionId") || "");
    if (!ownedSession(req, rawSessionId)) {
      return NextResponse.json({ error: "Invalid or expired chat session" }, { status: 401 });
    }
    const sessionId = sanitizePathSegment(rawSessionId);

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: "file is empty" }, { status: 400 });
    }

    if (file.size > MAX_ATTACHMENT_BYTES) {
      return NextResponse.json({ error: "file is too large", maxBytes: MAX_ATTACHMENT_BYTES }, { status: 413 });
    }

    const originalBytes = Buffer.from(await file.arrayBuffer());
    const detectedMimeType = detectChatAttachmentMimeType(originalBytes);
    const declaredMimeType = file.type || "application/octet-stream";
    if (!detectedMimeType || !CHAT_ATTACHMENT_MIME_TYPES.has(detectedMimeType)) {
      return NextResponse.json({ error: "unsupported file signature" }, { status: 415 });
    }
    if (declaredMimeType !== "application/octet-stream" && declaredMimeType !== detectedMimeType) {
      return NextResponse.json({ error: "file type does not match its contents" }, { status: 415 });
    }

    const secured = await secureChatAttachmentUpload(originalBytes, detectedMimeType);
    const bytes = secured.bytes;
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const safeName = sanitizeFileName(file.name);
    const date = new Date().toISOString().slice(0, 10);
    const storageKey = `chat-attachments/quarantine/${sessionId}/${date}/${crypto.randomUUID()}-${safeName}`;
    const bucket = chatAttachmentBucket();

    const supabase = await createSupabaseStorageClient();
    const result = await supabase.storage.from(bucket).upload(storageKey, bytes, {
      contentType: detectedMimeType,
      upsert: false,
    });

    if (result.error) {
      console.error("[POST /api/chat-attachments] Supabase upload error", result.error.message);
      return NextResponse.json({ error: "supabase upload failed" }, { status: 502 });
    }

    const persistedAttachment = await persistChatAttachment({
      sessionKey: sessionId,
      tenantId: "default",
      locale: "ko",
      source: "kaxi-site",
      bucket,
      storageKey,
      originalName: file.name,
      mimeType: detectedMimeType,
      sizeBytes: bytes.length,
      sha256,
      status: "quarantined",
      metadata: {
        userAgent: req.headers.get("user-agent"),
        declaredMimeType,
        detectedMimeType,
        scanStatus: secured.scan.status,
        scanEngine: secured.scan.engine,
        sanitized: secured.sanitized,
        originalSizeBytes: file.size,
      },
    });
    if (!persistedAttachment?.id) {
      await supabase.storage.from(bucket).remove([storageKey]);
      return NextResponse.json({ error: "attachment metadata persistence failed" }, { status: 502 });
    }

    const attachmentId = String(persistedAttachment.id);
    const queued = await enqueueChatAttachmentJob(attachmentId).catch((error) => {
      console.error("[chat attachment queue]", error);
      return false;
    });
    after(async () => {
      const processing = queued
        ? drainChatAttachmentJobs({ limit: 3 })
        : processChatAttachment(attachmentId);
      await processing.catch((error) => {
        console.error("[chat attachment processing]", error);
      });
    });

    return NextResponse.json({
      attachment: {
        id: persistedAttachment.id,
        bucket,
        storageKey,
        name: file.name,
        size: bytes.length,
        type: detectedMimeType,
        sha256,
        status: "quarantined",
      },
      persisted: Boolean(persistedAttachment),
    });
  } catch (error) {
    if (error instanceof UnsafeChatAttachmentError) {
      return NextResponse.json({ error: "unsafe attachment rejected", code: error.code }, { status: 422 });
    }
    if (error instanceof ChatAttachmentScannerUnavailableError) {
      return NextResponse.json({ error: "attachment security scan unavailable", code: error.message }, { status: 503 });
    }
    if (error instanceof Error && error.message === "SUPABASE_STORAGE_NOT_CONFIGURED") {
      return NextResponse.json(
        {
          error: "Supabase Storage is not configured",
          requiredEnv: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
        },
        { status: 503 },
      );
    }

    console.error("[POST /api/chat-attachments]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!getChatAttachmentSecurityDiagnostics().uploadsEnabled) {
    return NextResponse.json(
      { error: "attachment uploads are not enabled", code: "ATTACHMENTS_DISABLED" },
      { status: 503 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  const attachmentId = typeof body?.attachmentId === "string" ? body.attachmentId : "";
  if (!ownedSession(req, sessionId)) {
    return NextResponse.json({ error: "Invalid or expired chat session" }, { status: 401 });
  }
  if (!attachmentId) return NextResponse.json({ error: "attachmentId is required" }, { status: 400 });

  try {
    const attachment = await getChatAttachmentStatus(attachmentId, sessionId);
    if (!attachment) return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    if (attachment.status === "ready") return NextResponse.json({ attachment });
    if (attachment.status === "rejected") {
      return NextResponse.json({ error: "Rejected attachments must be uploaded again" }, { status: 409 });
    }
    await retryChatAttachmentJob(attachmentId);
    after(async () => {
      await drainChatAttachmentJobs({ limit: 3 }).catch((error) => {
        console.error("[chat attachment retry]", error);
      });
    });
    return NextResponse.json({ attachment: { ...attachment, status: "quarantined", processing_status: "queued" } }, { status: 202 });
  } catch (error) {
    console.error("[PATCH /api/chat-attachments]", error);
    return NextResponse.json({ error: "Unable to retry attachment" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId") || "";
  const attachmentId = req.nextUrl.searchParams.get("attachmentId") || "";
  if (!ownedSession(req, sessionId)) {
    return NextResponse.json({ error: "Invalid or expired chat session" }, { status: 401 });
  }
  if (!attachmentId) return NextResponse.json({ error: "attachmentId is required" }, { status: 400 });

  try {
    const attachment = await getChatAttachmentStatus(attachmentId, sessionId);
    if (!attachment) return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    if (attachment.status !== "ready") {
      after(async () => {
        await drainChatAttachmentJobs({ limit: 3 }).catch((error) => {
          console.error("[chat attachment poll drain]", error);
        });
      });
    }
    return NextResponse.json({ attachment });
  } catch (error) {
    console.error("[GET /api/chat-attachments]", error);
    return NextResponse.json({ error: "Unable to read attachment status" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  const attachmentId = typeof body?.attachmentId === "string" ? body.attachmentId : "";
  if (!ownedSession(req, sessionId)) {
    return NextResponse.json({ error: "Invalid or expired chat session" }, { status: 401 });
  }
  if (!attachmentId) return NextResponse.json({ error: "attachmentId is required" }, { status: 400 });

  try {
    const attachment = await getChatAttachmentStatus(attachmentId, sessionId);
    if (!attachment) return NextResponse.json({ deleted: true });
    const supabase = await createSupabaseStorageClient();
    const removed = await supabase.storage.from(attachment.bucket).remove([attachment.storage_key]);
    if (removed.error) throw removed.error;
    const deleted = await supabase.from("chat_attachments").delete().eq("id", attachmentId).eq("session_id", sessionId);
    if (deleted.error) throw deleted.error;
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[DELETE /api/chat-attachments]", error);
    return NextResponse.json({ error: "Unable to delete attachment" }, { status: 500 });
  }
}
