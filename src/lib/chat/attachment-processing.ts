import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { generateLlmJson, getConfiguredLlmBackend, getLlmModel } from "@/lib/ai/llm-gateway";
import { detectChatAttachmentMimeType } from "@/lib/chat/attachment-files";
import { isTerminalChatAttachmentError, verifyStoredChatAttachment } from "@/lib/chat/attachment-security";
import { decryptPii, encryptPii, redactSensitiveText } from "@/lib/privacy/pii";

type Extraction = {
  text: string;
  documentType: string;
  language: string;
  confidence: number;
};

const IMAGE_OCR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["text", "documentType", "language", "confidence"],
  properties: {
    text: { type: "string", maxLength: 16000 },
    documentType: { type: "string", maxLength: 80 },
    language: { type: "string", maxLength: 40 },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
};

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  if (!url || !key) throw new Error("supabase_not_configured");
  return { url, key };
}

function client() {
  const { url, key } = config();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function extractPdf(bytes: Buffer): Promise<Extraction & { pageCount: number; provider: string; model: string }> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: bytes });
  try {
    const result = await parser.getText();
    const text = result.text.trim().slice(0, 16000);
    if (!text) throw new Error("pdf_has_no_extractable_text");
    return {
      text,
      documentType: "pdf",
      language: "unknown",
      confidence: 1,
      pageCount: result.total,
      provider: "pdf-parse",
      model: "pdfjs",
    };
  } finally {
    await parser.destroy();
  }
}

async function extractImage(bytes: Buffer, mimeType: string): Promise<Extraction & { pageCount: number; provider: string; model: string }> {
  const extraction = await generateLlmJson<Extraction>({
    feature: "structured",
    maxTokens: 3000,
    temperature: 0,
    jsonSchema: { name: "chat_attachment_ocr", schema: IMAGE_OCR_SCHEMA },
    messages: [
      {
        role: "system",
        content: "Extract only text visibly present in the uploaded image. Do not infer missing values. Preserve names, dates, and labels exactly.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Extract this KAXI consultation attachment for grounded document assistance." },
          { type: "image", source: { type: "base64", media_type: mimeType, data: bytes.toString("base64") } },
        ],
      },
    ],
  });
  if (!extraction.text.trim()) throw new Error("image_has_no_extractable_text");
  return {
    ...extraction,
    text: extraction.text.slice(0, 16000),
    pageCount: 1,
    provider: getConfiguredLlmBackend(),
    model: getLlmModel(),
  };
}

function safeErrorCode(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().replace(/[^a-z0-9_]+/g, "_").slice(0, 80) || "processing_failed";
}

export async function processChatAttachment(attachmentId: string) {
  const supabase = client();
  const found = await supabase
    .from("chat_attachments")
    .select("id,session_id,bucket,storage_key,mime_type,sha256,status")
    .eq("id", attachmentId)
    .maybeSingle();
  if (found.error) throw found.error;
  if (!found.data) throw new Error("attachment_not_found");
  if (found.data.status === "ready") return { status: "ready" as const };

  await supabase.from("chat_attachments").update({ status: "processing", processing_status: "processing" }).eq("id", attachmentId);

  try {
    const downloaded = await supabase.storage.from(found.data.bucket).download(found.data.storage_key);
    if (downloaded.error || !downloaded.data) throw new Error("storage_download_failed");
    const bytes = Buffer.from(await downloaded.data.arrayBuffer());
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest !== found.data.sha256) throw new Error("sha256_mismatch");
    const detected = detectChatAttachmentMimeType(bytes);
    if (!detected || detected !== found.data.mime_type) throw new Error("mime_signature_mismatch");
    await verifyStoredChatAttachment(bytes, detected);

    const extraction = detected === "application/pdf"
      ? await extractPdf(bytes)
      : await extractImage(bytes, detected);
    const ciphertext = encryptPii(extraction.text);
    if (!ciphertext) throw new Error("encryption_not_configured");

    const extracted = await supabase.from("chat_attachment_extractions").upsert({
      attachment_id: attachmentId,
      status: "completed",
      text_ciphertext: ciphertext,
      text_sha256: createHash("sha256").update(extraction.text).digest("hex"),
      redacted_preview: redactSensitiveText(extraction.text).slice(0, 240),
      document_type: extraction.documentType,
      language: extraction.language,
      confidence: extraction.confidence,
      page_count: extraction.pageCount,
      provider: extraction.provider,
      model: extraction.model,
      error_code: null,
      processed_at: new Date().toISOString(),
    });
    if (extracted.error) throw extracted.error;

    const processedKey = found.data.storage_key.replace("chat-attachments/quarantine/", "chat-attachments/processed/");
    const moved = await supabase.storage.from(found.data.bucket).move(found.data.storage_key, processedKey);
    if (moved.error) throw new Error("storage_promotion_failed");

    const updated = await supabase.from("chat_attachments").update({
      storage_key: processedKey,
      detected_mime_type: detected,
      status: "ready",
      processing_status: "completed",
      processed_at: new Date().toISOString(),
    }).eq("id", attachmentId);
    if (updated.error) throw updated.error;
    return { status: "ready" as const, storageKey: processedKey };
  } catch (error) {
    const code = safeErrorCode(error);
    await supabase.from("chat_attachment_extractions").upsert({
      attachment_id: attachmentId,
      status: "failed",
      error_code: code,
      processed_at: new Date().toISOString(),
    });
    const terminal = isTerminalChatAttachmentError(error);
    if (terminal) {
      await supabase.storage.from(found.data.bucket).remove([found.data.storage_key]);
    }
    await supabase.from("chat_attachments").update({
      status: terminal ? "rejected" : "quarantined",
      processing_status: terminal ? "failed" : "retrying",
      processed_at: new Date().toISOString(),
      deleted_at: terminal ? new Date().toISOString() : null,
    }).eq("id", attachmentId);
    throw new Error(code);
  }
}

export async function getChatAttachmentStatus(attachmentId: string, sessionId: string) {
  const result = await client()
    .from("chat_attachments")
    .select("id,session_id,bucket,storage_key,original_name,mime_type,size_bytes,sha256,status,processing_status")
    .eq("id", attachmentId)
    .eq("session_id", sessionId)
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data;
}

export async function getReadyChatAttachmentsForRuntime(
  sessionId: string,
  attachments: Array<{ id?: string; storageKey: string; bucket: string; name: string; size?: number; type: string; sha256: string }>,
) {
  if (attachments.length === 0) return [];
  const ids = attachments.map((item) => item.id || "").filter(Boolean);
  if (ids.length !== attachments.length) throw new Error("attachment_id_missing");

  const supabase = client();
  const found = await supabase
    .from("chat_attachments")
    .select("id,session_id,bucket,storage_key,original_name,mime_type,size_bytes,sha256,status")
    .eq("session_id", sessionId)
    .eq("status", "ready")
    .in("id", ids);
  if (found.error) throw found.error;
  if ((found.data || []).length !== attachments.length) throw new Error("attachment_not_ready_or_not_owned");

  const extractions = await supabase
    .from("chat_attachment_extractions")
    .select("attachment_id,text_ciphertext,document_type,language,confidence")
    .eq("status", "completed")
    .in("attachment_id", ids);
  if (extractions.error) throw extractions.error;
  const extractionById = new Map((extractions.data || []).map((item) => [item.attachment_id, item]));
  const requestedById = new Map(attachments.map((item) => [item.id, item]));

  return (found.data || []).map((item) => {
    const requested = requestedById.get(item.id);
    const extraction = extractionById.get(item.id);
    const text = decryptPii(extraction?.text_ciphertext);
    if (
      !requested ||
      requested.storageKey !== item.storage_key ||
      requested.bucket !== item.bucket ||
      requested.sha256 !== item.sha256 ||
      !text
    ) {
      throw new Error("attachment_integrity_check_failed");
    }
    return {
      id: item.id,
      bucket: item.bucket,
      storageKey: item.storage_key,
      name: item.original_name,
      size: item.size_bytes,
      type: item.mime_type,
      sha256: item.sha256,
      documentType: extraction?.document_type || "unknown",
      language: extraction?.language || "unknown",
      confidence: extraction?.confidence,
      extractedText: text.slice(0, 6000),
    };
  });
}
