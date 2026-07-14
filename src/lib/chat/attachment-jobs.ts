import { createClient } from "@supabase/supabase-js";
import { processChatAttachment } from "@/lib/chat/attachment-processing";
import { isTerminalChatAttachmentError } from "@/lib/chat/attachment-security";
import { recordOpsEvent } from "@/lib/ops/events";

type JobRow = {
  id: string;
  attachment_id: string;
  attempts: number;
  max_attempts: number;
  lock_token: string;
};

type SupabaseErrorLike = { code?: string; message?: string };

function configured(value: string | undefined) {
  const text = value?.trim() || "";
  return text && !/^(replace-with-|change_me)/i.test(text) ? text : "";
}

function client() {
  const url = configured(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = configured(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) throw new Error("SUPABASE_CHAT_JOBS_NOT_CONFIGURED");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
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

function safeError(error: unknown) {
  return (error instanceof Error ? error.message : String(error)).slice(0, 500);
}

export async function enqueueChatAttachmentJob(attachmentId: string) {
  const result = await client().from("chat_attachment_jobs").upsert(
    {
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

export async function retryChatAttachmentJob(attachmentId: string) {
  const supabase = client();
  const now = new Date().toISOString();
  const attachment = await supabase
    .from("chat_attachments")
    .update({ status: "quarantined", processing_status: "queued", processed_at: null, deleted_at: null })
    .eq("id", attachmentId);
  if (attachment.error) throw attachment.error;
  const result = await supabase.from("chat_attachment_jobs").upsert({
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

export async function drainChatAttachmentJobs(options: { limit?: number; leaseSeconds?: number } = {}) {
  const supabase = client();
  const limit = Math.min(Math.max(options.limit || 3, 1), 20);
  const leaseSeconds = Math.min(Math.max(options.leaseSeconds || 120, 30), 900);
  const claimed = await supabase.rpc("kaxi_claim_chat_attachment_jobs", {
    p_limit: limit,
    p_lease_seconds: leaseSeconds,
  });
  if (claimed.error && isQueueUnavailable(claimed.error)) {
    return { available: false, claimed: 0, completed: 0, retried: 0, failed: 0 };
  }
  if (claimed.error) throw claimed.error;

  const jobs = (claimed.data || []) as JobRow[];
  let completed = 0;
  let retried = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      await processChatAttachment(job.attachment_id);
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
      source: "kaxi-attachment-worker",
      severity: "error",
      eventType: "attachment_processing_failed",
      message: `${failed} attachment processing job(s) reached a terminal failure.`,
      executionId: `attachment-drain:${minuteBucket}`,
      payload: { claimed: jobs.length, completed, retried, failed },
    }).catch((alertError) => {
      console.error("[chat attachment worker] operations alert failed", alertError);
    });
  }

  return { available: true, claimed: jobs.length, completed, retried, failed };
}
