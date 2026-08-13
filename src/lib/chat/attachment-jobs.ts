import { runtimeEnvironment } from "@/infrastructure/config/runtime-environment";
import { createSupabaseServiceRoleClient } from "@/infrastructure/supabase/service-role-client";
import {
  assertTenantContext,
  signTenantClaim,
  type TenantContext,
} from "@/application/tenancy/tenant-context";

type SupabaseErrorLike = { code?: string; message?: string };

function configured(value: string | undefined) {
  const text = value?.trim() || "";
  return text && !/^(replace-with-|change_me)/i.test(text) ? text : "";
}

function client() {
  try {
    return createSupabaseServiceRoleClient();
  } catch {
    throw new Error("SUPABASE_CHAT_JOBS_NOT_CONFIGURED");
  }
}

function isQueueUnavailable(error: unknown) {
  const candidate = error as SupabaseErrorLike | null;
  const message = candidate?.message?.toLowerCase() || "";
  return (
    candidate?.code === "PGRST205" ||
    candidate?.code === "42P01" ||
    candidate?.code === "42883" ||
    message.includes("could not find the table") ||
    message.includes("could not find the function")
  );
}

export interface AttachmentJobCorrelation {
  requestId: string;
  traceId: string;
  traceparent: string;
}

function assertCorrelation(correlation: AttachmentJobCorrelation) {
  if (!correlation.requestId.trim() || correlation.requestId.length > 128) throw new Error("ATTACHMENT_REQUEST_ID_INVALID");
  if (!/^[0-9a-f]{32}$/.test(correlation.traceId)) throw new Error("ATTACHMENT_TRACE_ID_INVALID");
}

export async function enqueueChatAttachmentJob(
  tenantContext: TenantContext,
  attachmentId: string,
  correlation: AttachmentJobCorrelation,
) {
  assertTenantContext(tenantContext);
  assertCorrelation(correlation);
  const result = await client().from("chat_attachment_jobs").upsert(
    {
      tenant_id: tenantContext.tenantId,
      tenant_claim: signTenantClaim(tenantContext, { audience: "worker", subject: `attachment:${attachmentId}` }, runtimeEnvironment()),
      request_id: correlation.requestId.trim(),
      trace_id: correlation.traceId,
      traceparent: correlation.traceparent,
      attachment_id: attachmentId,
      status: "queued",
      available_at: new Date().toISOString(),
    },
    { onConflict: "attachment_id", ignoreDuplicates: true },
  );
  if (result.error && isQueueUnavailable(result.error)) return false;
  if (result.error) throw result.error;
  return true;
}

export async function retryChatAttachmentJob(
  tenantContext: TenantContext,
  attachmentId: string,
  correlation: AttachmentJobCorrelation,
) {
  assertTenantContext(tenantContext);
  assertCorrelation(correlation);
  const supabase = client();
  const now = new Date().toISOString();
  const attachment = await supabase
    .from("chat_attachments")
    .update({ status: "quarantined", processing_status: "queued", processed_at: null, deleted_at: null })
    .eq("tenant_id", tenantContext.tenantId)
    .eq("id", attachmentId);
  if (attachment.error) throw attachment.error;
  const result = await supabase.from("chat_attachment_jobs").upsert({
    tenant_id: tenantContext.tenantId,
    tenant_claim: signTenantClaim(tenantContext, { audience: "worker", subject: `attachment:${attachmentId}` }, runtimeEnvironment()),
    request_id: correlation.requestId.trim(),
    trace_id: correlation.traceId,
    traceparent: correlation.traceparent,
    attachment_id: attachmentId,
    status: "queued",
    attempts: 0,
    available_at: now,
    locked_at: null,
    lock_token: null,
    last_error: null,
    completed_at: null,
  }, { onConflict: "attachment_id" });
  if (result.error) throw result.error;
}

export async function getChatAttachmentQueueStatus() {
  const result = await client()
    .from("chat_attachment_jobs")
    .select("status,attempts,created_at");
  if (result.error && isQueueUnavailable(result.error)) {
    return { available: false, depth: 0, retryCount: 0, failed: 0, oldestCreatedAt: null };
  }
  if (result.error) throw result.error;
  const rows = result.data || [];
  const active = rows.filter((row) => row.status === "queued" || row.status === "processing");
  return {
    available: true,
    depth: active.length,
    retryCount: rows.filter((row) => row.status === "queued" && Number(row.attempts) > 0).length,
    failed: rows.filter((row) => row.status === "failed").length,
    oldestCreatedAt: active.map((row) => row.created_at).filter(Boolean).sort()[0] || null,
  };
}
