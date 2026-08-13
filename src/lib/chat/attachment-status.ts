import { createSupabaseServiceRoleClient } from "@/infrastructure/supabase/service-role-client";
import { decryptPii } from "@/lib/privacy/pii";
import { assertTenantContext, type TenantContext } from "@/application/tenancy/tenant-context";

function client() {
  try {
    return createSupabaseServiceRoleClient();
  } catch {
    throw new Error("supabase_not_configured");
  }
}

export async function getChatAttachmentStatus(tenantContext: TenantContext, attachmentId: string, sessionId: string) {
  assertTenantContext(tenantContext);
  const result = await client()
    .from("chat_attachments")
    .select("id,session_id,bucket,storage_key,original_name,mime_type,size_bytes,sha256,status,processing_status")
    .eq("tenant_id", tenantContext.tenantId)
    .eq("id", attachmentId)
    .eq("session_id", sessionId)
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data;
}

export async function getReadyChatAttachmentsForRuntime(
  tenantContext: TenantContext,
  sessionId: string,
  attachments: Array<{ id?: string; storageKey: string; bucket: string; name: string; size?: number; type: string; sha256: string }>,
) {
  assertTenantContext(tenantContext);
  if (attachments.length === 0) return [];
  const ids = attachments.map((item) => item.id || "").filter(Boolean);
  if (ids.length !== attachments.length) throw new Error("attachment_id_missing");

  const supabase = client();
  const found = await supabase
    .from("chat_attachments")
    .select("id,session_id,bucket,storage_key,original_name,mime_type,size_bytes,sha256,status")
    .eq("tenant_id", tenantContext.tenantId)
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
