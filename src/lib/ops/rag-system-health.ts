import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { getRagServingProjectionStatus } from "@/lib/knowledge/serving-projection";
import { sendOpsAlert } from "@/lib/ops/alerts";
import { extractRagProvenance, resolveRagProvenance } from "@/lib/n8n/provenance";
import { signN8nPayload } from "@/lib/n8n/signature";
import {
  TypebotRuntimeTurn,
  typebotRuntimeBlockId,
  typebotRuntimeMessageTextById,
  validatePublishedTypebotRuntime,
} from "@/lib/typebot/runtime-health";
import { enforceTypebotResultRetention } from "@/lib/typebot/result-retention";
import {
  checkManagedAttachmentScanner,
  getChatAttachmentSecurityDiagnostics,
} from "@/lib/chat/attachment-security";

export type SystemHealthCheck = {
  key: string;
  ok: boolean;
  required: boolean;
  detail: string;
  latencyMs: number;
  metadata?: Record<string, unknown>;
};

export function summarizeRagSystemHealth(checks: SystemHealthCheck[]) {
  const failed = checks.filter((check) => !check.ok);
  const requiredFailed = failed.filter((check) => check.required);
  const warningFailed = failed.filter((check) => !check.required);
  return {
    failed,
    requiredFailed,
    warningFailed,
    status: requiredFailed.length > 0 ? "degraded" as const : warningFailed.length > 0 ? "warning" as const : "healthy" as const,
    severity: requiredFailed.length > 0 ? "error" as const : warningFailed.length > 0 ? "warning" as const : null,
  };
}

function configured(value: string | undefined) {
  const text = value?.trim() || "";
  return text && !/^replace-with-/i.test(text) ? text : "";
}

async function timed(key: string, required: boolean, run: () => Promise<Omit<SystemHealthCheck, "key" | "required" | "latencyMs">>) {
  const started = Date.now();
  try {
    const result = await run();
    return { key, required, latencyMs: Date.now() - started, ...result };
  } catch (error) {
    return {
      key,
      required,
      ok: false,
      detail: error instanceof Error ? error.message.slice(0, 240) : String(error).slice(0, 240),
      latencyMs: Date.now() - started,
    };
  }
}

function serviceClient() {
  const url = configured(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = configured(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) throw new Error("Supabase service configuration is missing");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function endpointHealth(urlValue: string, path: string) {
  const url = new URL(path, urlValue);
  const response = await fetch(url, { signal: AbortSignal.timeout(8_000), cache: "no-store" });
  return { ok: response.ok, status: response.status, origin: url.origin };
}

export async function checkPublishedTypebotRuntime() {
  const publicUrl = configured(process.env.TYPEBOT_PUBLIC_URL);
  const publicId = configured(process.env.TYPEBOT_PUBLIC_ID);
  if (!publicUrl || !publicId) throw new Error("TYPEBOT_PUBLIC_URL and TYPEBOT_PUBLIC_ID are required");

  const endpoint = new URL(`/api/v1/typebots/${encodeURIComponent(publicId)}/startChat`, new URL(publicUrl).origin);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      isOnlyRegistering: false,
      isStreamEnabled: false,
      prefilledVariables: { KAXI_HEALTH_CHECK: "true", locale: "ko" },
      textBubbleContentFormat: "markdown",
    }),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as TypebotRuntimeTurn & { resultId?: string; logs?: unknown[] };
  if (!response.ok) throw new Error(`Typebot startChat returned HTTP ${response.status}`);
  if (typeof payload.sessionId !== "string" || !payload.sessionId) {
    throw new Error("Typebot startChat did not return a sessionId");
  }

  const continuationEndpoint = new URL(
    `/api/v1/sessions/${encodeURIComponent(payload.sessionId)}/continueChat`,
    endpoint.origin,
  );
  const continuationResponse = await fetch(continuationEndpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "한국 유학 준비에 필요한 주요 비용 항목을 간단히 알려주세요." }),
    signal: AbortSignal.timeout(45_000),
    cache: "no-store",
  });
  const continuation = await continuationResponse.json().catch(() => ({})) as TypebotRuntimeTurn;
  if (!continuationResponse.ok) {
    throw new Error(`Typebot continueChat returned HTTP ${continuationResponse.status}`);
  }
  const errors = validatePublishedTypebotRuntime(payload, continuation);
  if (errors.length > 0) throw new Error(errors.join("; "));
  const answerLength = typebotRuntimeMessageTextById(
    continuation,
    typebotRuntimeBlockId("ko", "answer"),
  ).length;

  return {
    ok: true,
    detail: "Published Typebot completed a real grounded-answer turn.",
    metadata: {
      startStatus: response.status,
      continuationStatus: continuationResponse.status,
      sessionCreated: true,
      resultCreated: typeof payload.resultId === "string" && Boolean(payload.resultId),
      initialMessageCount: Array.isArray(payload.messages) ? payload.messages.length : 0,
      continuationMessageCount: Array.isArray(continuation.messages) ? continuation.messages.length : 0,
      answerLength,
      nextInputId: continuation.input?.id || null,
      logCount: Array.isArray(payload.logs) ? payload.logs.length : 0,
    },
  };
}

export async function checkN8nRagWorkflow(supabase = serviceClient()) {
  const requestId = randomUUID();
  const sessionId = `kaxi-health-${requestId}`;
  const signed = signN8nPayload("typebot-runtime", {
    question: "한국 유학 준비에 필요한 주요 비용 항목을 한 문장으로 알려주세요.",
    sessionId,
    tenant_id: "default",
    category: "cost",
    source: "kaxi-site",
    locale: "ko",
    requestId,
    idempotencyKey: `health:${requestId}`,
    externalRequestId: requestId,
    attachments: [],
    healthCheck: true,
  });

  try {
    const response = await fetch(signed.url, {
      method: "POST",
      headers: signed.headers,
      body: signed.body,
      signal: AbortSignal.timeout(45_000),
      cache: "no-store",
    });
    const rawText = await response.text();
    const payload = rawText ? JSON.parse(rawText) as Record<string, unknown> : {};
    const normalized = payload.data && typeof payload.data === "object"
      ? payload.data as Record<string, unknown>
      : payload;
    const answer = typeof normalized.answer === "string" ? normalized.answer.trim() : "";
    const sources = Array.isArray(normalized.sources) ? normalized.sources : [];
    const provenance = extractRagProvenance(normalized);
    if (!response.ok) throw new Error(`n8n RAG workflow returned HTTP ${response.status}`);
    if (answer.length < 20) throw new Error("n8n RAG workflow returned an empty or incomplete answer");
    if (sources.length === 0) throw new Error("n8n RAG workflow returned no grounded sources");
    if (!provenance) throw new Error("n8n RAG workflow returned incomplete provenance");

    return {
      ok: true,
      detail: "Signed n8n RAG request returned a grounded answer.",
      metadata: {
        status: response.status,
        answerLength: answer.length,
        sourceCount: sources.length,
        executionTracked: typeof normalized.executionId === "string",
        ...provenance,
      },
    };
  } finally {
    await supabase.from("n8n_audit_messages").delete().eq("session_id", sessionId).then(() => undefined);
  }
}

export async function runRagSystemHealth(triggerSource = "manual") {
  const started = Date.now();
  const supabase = serviceClient();
  const provenance = resolveRagProvenance();
  const bucket = configured(process.env.SUPABASE_CHAT_ATTACHMENTS_BUCKET) || configured(process.env.SUPABASE_STORAGE_BUCKET) || "kaxi-documents";
  const n8nWebhook = configured(process.env.N8N_TYPEBOT_RAG_WEBHOOK_URL);
  const typebotUrl = configured(process.env.TYPEBOT_PUBLIC_URL);
  const attachmentSecurity = getChatAttachmentSecurityDiagnostics();

  const checks = await Promise.all([
    timed("supabase.database", true, async () => {
      const result = await supabase.from("chat_sessions").select("id", { head: true, count: "exact" });
      if (result.error) throw result.error;
      return { ok: true, detail: "Supabase service-role database access succeeded.", metadata: { sessionCount: result.count || 0 } };
    }),
    timed("supabase.private_bucket", true, async () => {
      const result = await supabase.storage.getBucket(bucket);
      if (result.error || !result.data) throw new Error(result.error?.message || "Attachment bucket not found");
      return { ok: result.data.public === false, detail: result.data.public ? "Attachment bucket must be private." : "Private attachment bucket is reachable.", metadata: { bucket, public: result.data.public } };
    }),
    timed("attachments.external_malware_scanner", attachmentSecurity.externalScannerRequired, async () => {
      const result = await checkManagedAttachmentScanner();
      return {
        ok: result.ok,
        detail: result.detail,
        metadata: {
          engine: result.engine,
          configured: attachmentSecurity.externalScannerConfigured,
          required: attachmentSecurity.externalScannerRequired,
          uploadsEnabled: attachmentSecurity.uploadsEnabled,
        },
      };
    }),
    timed("n8n.workflow", true, async () => {
      if (!n8nWebhook) throw new Error("N8N_TYPEBOT_RAG_WEBHOOK_URL is not configured");
      const endpoint = await endpointHealth(n8nWebhook, "/healthz");
      if (!endpoint.ok) throw new Error(`n8n health returned HTTP ${endpoint.status}`);
      const workflow = await checkN8nRagWorkflow(supabase);
      return { ...workflow, metadata: { ...endpoint, ...workflow.metadata } };
    }),
    timed("typebot.runtime", true, async () => {
      if (!typebotUrl) throw new Error("TYPEBOT_PUBLIC_URL is not configured");
      return checkPublishedTypebotRuntime();
    }),
    timed("typebot.result_retention", true, async () => {
      const result = await enforceTypebotResultRetention({ dryRun: true });
      const ok = result.configured && result.apiFailures === 0;
      return {
        ok,
        detail: ok
          ? `Typebot result retention is reachable with ${result.eligible} result(s) eligible for deletion.`
          : result.error || "Typebot result retention credentials are not configured.",
        metadata: {
          configured: result.configured,
          retentionDays: result.retentionDays,
          examined: result.examined,
          eligible: result.eligible,
          apiFailures: result.apiFailures,
        },
      };
    }),
    timed("rag.serving_projection", true, async () => {
      const status = await getRagServingProjectionStatus();
      const ok = status.eligibleChunks > 0 && status.readyChunks === status.eligibleChunks && status.citationReadyChunks === status.eligibleChunks;
      return { ok, detail: ok ? "All eligible chunks are embedded and citation-ready." : "Serving projection is incomplete.", metadata: status as unknown as Record<string, unknown> };
    }),
    timed("ops.open_events", false, async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const result = await supabase
        .from("ops_events")
        .select("id,severity,event_type,source,created_at")
        .is("acknowledged_at", null)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20);
      if (result.error) throw result.error;
      const events = result.data || [];
      return {
        ok: events.length === 0,
        detail: events.length === 0 ? "No unacknowledged operations events in the last 24 hours." : `${events.length} unacknowledged operations events require review.`,
        metadata: { count: events.length, events },
      };
    }),
    timed("attachments.processing_queue", false, async () => {
      const result = await supabase
        .from("chat_attachment_jobs")
        .select("status,attempts,max_attempts,available_at,locked_at")
        .in("status", ["queued", "processing", "failed"])
        .limit(100);
      if (result.error) throw result.error;
      const rows = result.data || [];
      const counts = rows.reduce<Record<string, number>>((acc, row) => {
        acc[row.status] = (acc[row.status] || 0) + 1;
        return acc;
      }, {});
      const staleBefore = Date.now() - 10 * 60 * 1000;
      const stale = rows.filter((row) =>
        row.status === "failed" ||
        (row.status === "processing" && row.locked_at && new Date(row.locked_at).getTime() < staleBefore)
      ).length;
      return {
        ok: stale === 0,
        detail: stale === 0 ? "Attachment queue has no terminal or stale jobs." : `${stale} attachment jobs require recovery.`,
        metadata: { counts, stale, sampled: rows.length },
      };
    }),
  ]);

  const summary = summarizeRagSystemHealth(checks);
  const { failed, status } = summary;
  const alertableFailed = failed.filter((check) => check.key !== "ops.open_events");
  const alertableRequiredFailed = alertableFailed.filter((check) => check.required);
  const alertableWarningFailed = alertableFailed.filter((check) => !check.required);
  const durationMs = Date.now() - started;
  const inserted = await supabase.from("system_health_runs").insert({
    status,
    trigger_source: triggerSource,
    checks,
    failed_checks: failed.length,
    duration_ms: durationMs,
    workflow_id: provenance.workflowId,
    workflow_version_id: provenance.workflowVersionId,
    model_version: provenance.modelVersion,
    prompt_version: provenance.promptVersion,
  }).select("id").single();
  if (inserted.error) throw inserted.error;

  let alert: Awaited<ReturnType<typeof sendOpsAlert>> | {
    attempted: false;
    sent: false;
    skippedReason: "not_required";
  } = { attempted: false, sent: false, skippedReason: "not_required" };
  if (alertableFailed.length > 0 && summary.severity) {
    const eventType = alertableRequiredFailed.length > 0 ? "daily_health_degraded" : "daily_health_warning";
    const message = alertableRequiredFailed.length > 0
      ? `${alertableRequiredFailed.length} required RAG system health checks failed.`
      : `${alertableWarningFailed.length} RAG operations checks require review.`;
    await supabase.from("ops_events").insert({
      source: "kaxi-health",
      severity: summary.severity,
      event_type: eventType,
      workflow_id: provenance.workflowId,
      workflow_version_id: provenance.workflowVersionId,
      model_version: provenance.modelVersion,
      prompt_version: provenance.promptVersion,
      execution_id: inserted.data.id,
      message,
      payload: {
        failedKeys: alertableFailed.map((item) => item.key),
        requiredFailedKeys: alertableRequiredFailed.map((item) => item.key),
        warningFailedKeys: alertableWarningFailed.map((item) => item.key),
        checks,
      },
    });
    alert = await sendOpsAlert({
      kind: "kaxi_ops_alert",
      source: "kaxi-health",
      severity: summary.severity,
      eventType,
      message,
      occurredAt: new Date().toISOString(),
      details: {
        healthRunId: inserted.data.id,
        failedKeys: alertableFailed.map((item) => item.key),
        requiredFailedKeys: alertableRequiredFailed.map((item) => item.key),
      },
      adminUrl: `${configured(process.env.NEXT_PUBLIC_APP_URL) || "https://kaxi.vercel.app"}/admin`,
    });
  }
  return { id: inserted.data.id, status, checkedAt: new Date().toISOString(), durationMs, checks, alert, ...provenance };
}

export async function getLatestRagSystemHealth() {
  const result = await serviceClient().from("system_health_runs").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (result.error) throw result.error;
  return result.data;
}
