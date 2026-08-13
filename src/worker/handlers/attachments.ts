import { runtimeEnvironment } from "@/infrastructure/config/runtime-environment";
import { createSupabaseServiceRoleClient } from "@/infrastructure/supabase/service-role-client";
import { processChatAttachment } from "@/lib/chat/attachment-processing";
import { isTerminalChatAttachmentError } from "@/lib/chat/attachment-security";
import { recordOpsEvent } from "@/lib/ops/events";
import { assertSameTenant, verifyTenantClaim } from "@/application/tenancy/tenant-context";
import { newTraceContext, parseTraceparent } from "@/infrastructure/observability/trace-context";
import { withSpan } from "@/infrastructure/observability/tracing";

type JobRow = {
  id: string;
  attachment_id: string;
  tenant_id: string;
  tenant_claim: string | null;
  request_id: string;
  trace_id: string;
  traceparent: string | null;
  attempts: number;
  max_attempts: number;
  lock_token: string;
};

function safeError(error: unknown) {
  return (error instanceof Error ? error.message : String(error)).slice(0, 500);
}

export async function drainChatAttachmentJobs(options: { limit?: number; leaseSeconds?: number } = {}) {
  const supabase = createSupabaseServiceRoleClient();
  const limit = Math.min(Math.max(options.limit || 3, 1), 20);
  const leaseSeconds = Math.min(Math.max(options.leaseSeconds || 120, 30), 900);
  const claimed = await supabase.rpc("kaxi_claim_chat_attachment_jobs", {
    p_limit: limit,
    p_lease_seconds: leaseSeconds,
  });
  if (claimed.error) throw claimed.error;

  const jobs = (claimed.data || []) as JobRow[];
  let completed = 0;
  let retried = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      const tenantContext = verifyTenantClaim(job.tenant_claim || "", {
        audience: "worker",
        subject: `attachment:${job.attachment_id}`,
      }, runtimeEnvironment());
      assertSameTenant(tenantContext, job.tenant_id);
      const parent = parseTraceparent(job.traceparent) || newTraceContext(job.trace_id);
      await withSpan({
        name: "worker.attachment.process",
        parent,
        attributes: {
          requestId: job.request_id,
          attachmentJobId: job.id,
          tenantId: job.tenant_id,
          attempt: job.attempts,
        },
        run: () => processChatAttachment(tenantContext, job.attachment_id),
      });
      const updated = await supabase
        .from("chat_attachment_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          locked_at: null,
          lock_token: null,
          last_error: null,
        })
        .eq("id", job.id)
        .eq("lock_token", job.lock_token);
      if (updated.error) throw updated.error;
      completed += 1;
    } catch (error) {
      const terminal = isTerminalChatAttachmentError(error) || job.attempts >= job.max_attempts;
      const delaySeconds = Math.min(30 * 2 ** Math.max(0, job.attempts - 1), 3_600);
      const updated = await supabase
        .from("chat_attachment_jobs")
        .update({
          status: terminal ? "failed" : "queued",
          available_at: new Date(Date.now() + delaySeconds * 1000).toISOString(),
          locked_at: null,
          lock_token: null,
          last_error: safeError(error),
          completed_at: terminal ? new Date().toISOString() : null,
        })
        .eq("id", job.id)
        .eq("lock_token", job.lock_token);
      if (updated.error) throw updated.error;
      if (terminal) {
        const attachment = await supabase
          .from("chat_attachments")
          .update({ processing_status: "failed", processed_at: new Date().toISOString() })
          .eq("tenant_id", job.tenant_id)
          .eq("id", job.attachment_id);
        if (attachment.error) throw attachment.error;
      }
      if (terminal) failed += 1;
      else retried += 1;
    }
  }

  if (failed > 0) {
    const minuteBucket = Math.floor(Date.now() / 60_000);
    await recordOpsEvent({
      source: "kaxi-worker",
      severity: "error",
      eventType: "attachment_processing_failed",
      message: `${failed} attachment processing job(s) reached a terminal failure.`,
      executionId: `attachment-drain:${minuteBucket}`,
      payload: { claimed: jobs.length, completed, retried, failed },
    }).catch(() => undefined);
  }

  return { available: true, claimed: jobs.length, completed, retried, failed };
}
