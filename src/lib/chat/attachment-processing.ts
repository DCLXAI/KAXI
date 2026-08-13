import { createHash } from "crypto";
import { createSupabaseServiceRoleClient } from "@/infrastructure/supabase/service-role-client";
import { generateLlmJson, getConfiguredLlmBackend, getLlmModel } from "@/lib/ai/llm-gateway";
import { detectChatAttachmentMimeType } from "@/lib/chat/attachment-files";
import { isTerminalChatAttachmentError, verifyStoredChatAttachment } from "@/lib/chat/attachment-security";
import { encryptPii, redactSensitiveText } from "@/lib/privacy/pii";
import {
  commitAttachmentPromotion,
  supabasePromotionStorage,
} from "@/worker/attachment-promotion-saga";
import { assertTenantContext, type TenantContext } from "@/application/tenancy/tenant-context";

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

function client() {
  try {
    return createSupabaseServiceRoleClient();
  } catch {
    throw new Error("supabase_not_configured");
  }
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
          { type: "text", text: "Extract this KARXY consultation attachment for grounded document assistance." },
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

export async function processChatAttachment(tenantContext: TenantContext, attachmentId: string) {
  assertTenantContext(tenantContext);
  const supabase = client();
  const found = await supabase
    .from("chat_attachments")
    .select("id,session_id,bucket,storage_key,mime_type,sha256,status")
    .eq("tenant_id", tenantContext.tenantId)
    .eq("id", attachmentId)
    .maybeSingle();
  if (found.error) throw found.error;
  if (!found.data) throw new Error("attachment_not_found");
  if (found.data.status === "ready") return { status: "ready" as const };

  await supabase
    .from("chat_attachments")
    .update({ status: "processing", processing_status: "processing" })
    .eq("tenant_id", tenantContext.tenantId)
    .eq("id", attachmentId);

  let extractionCompleted = false;
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
    extractionCompleted = true;

    const readyMetadata = await supabase.from("chat_attachments").update({
      detected_mime_type: detected,
    }).eq("tenant_id", tenantContext.tenantId).eq("id", attachmentId);
    if (readyMetadata.error) throw readyMetadata.error;
    const promotion = await commitAttachmentPromotion(tenantContext, attachmentId, supabasePromotionStorage());
    return { status: "ready" as const, storageKey: promotion.storageKey };
  } catch (error) {
    const code = safeErrorCode(error);
    if (extractionCompleted) {
      await supabase.from("chat_attachments").update({
        status: "processing",
        processing_status: "retrying",
        processed_at: null,
      }).eq("tenant_id", tenantContext.tenantId).eq("id", attachmentId);
      throw new Error(code);
    }
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
    }).eq("tenant_id", tenantContext.tenantId).eq("id", attachmentId);
    throw new Error(code);
  }
}
