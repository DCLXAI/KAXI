import { runtimeEnvironment } from "@/infrastructure/config/runtime-environment";
import { createSupabaseServiceRoleClient } from "@/infrastructure/supabase/service-role-client";
import { randomUUID } from "crypto";
import { PLATFORM_TENANT_ID } from "@/application/tenancy/tenant-context";
import { getRagServingProjectionStatus } from "@/lib/knowledge/serving-projection";
import { describeCorpusDrift, detectStaticCorpusDrift } from "@/lib/knowledge/corpus-drift";
import { sendOpsAlert } from "@/lib/ops/alerts";
import { siteBaseUrl } from "@/lib/config/site-url";
import { extractRagProvenance, resolveRagProvenance } from "@/lib/n8n/provenance";
import { classifyRunProvenance, describeRunProvenance } from "@/lib/ops/provenance-verdict";
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
import {
  createRagQueryEmbedding,
  getRagEmbeddingStrategy,
  isOpenAiQueryEmbedding,
} from "@/lib/chat/query-embedding";
import { probeManagedLlmProviders } from "@/lib/ai/llm-gateway";
import { evaluateProductionEvaluationTarget } from "@/lib/ops/evaluation-target";

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

type EvaluationHealthRow = {
  id?: string;
  status?: string;
  case_count?: number;
  passed_count?: number;
  metrics?: unknown;
  workflow_id?: string;
  workflow_version_id?: string;
  model_version?: string;
  prompt_version?: string;
  completed_at?: string;
};

function metric(value: unknown, key: string) {
  const metrics = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const result = Number(metrics[key]);
  return Number.isFinite(result) ? result : null;
}

function metricRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

/** Runtime paths the run recorded, so a mixed run is visible instead of collapsed. */
function runtimePathsFromMetrics(value: unknown): string[] {
  const metrics = metricRecord(value);
  const raw = metrics.runtimePathDistribution ?? metrics.runtimePaths;
  if (Array.isArray(raw)) return raw.filter((item): item is string => typeof item === "string");
  return Object.keys(metricRecord(raw));
}

function retrievalIdentityFromMetrics(value: unknown) {
  const retrieval = metricRecord(metricRecord(value).retrieval);
  const model = typeof retrieval.embeddingModel === "string" ? retrieval.embeddingModel : undefined;
  const dimensions = Number(retrieval.embeddingDimensions);
  const provider = typeof retrieval.provider === "string" ? retrieval.provider : undefined;
  if (!model && !provider && !Number.isFinite(dimensions)) return null;
  return {
    provider,
    embeddingModel: model,
    embeddingDimensions: Number.isFinite(dimensions) ? dimensions : undefined,
  };
}

/**
 * The orchestration identity an operator explicitly declared, or null.
 *
 * Deliberately does NOT fall back to the built-in default. That literal is what
 * went stale on three of four fields and turned this check into permanent noise;
 * "nobody declared one" is reported as unverifiable instead of asserted wrongly.
 */
function configuredOrchestrationExpectation(env: NodeJS.ProcessEnv = runtimeEnvironment()) {
  const workflowId = env.N8N_RAG_WORKFLOW_ID?.trim() || "";
  const workflowVersionId = env.N8N_RAG_WORKFLOW_VERSION_ID?.trim() || "";
  return workflowId || workflowVersionId ? { workflowId, workflowVersionId } : null;
}

export function evaluateRagQualityRun(
  row: EvaluationHealthRow | null,
  /**
   * The orchestration identity to assert, or undefined to take whatever the
   * environment declares.
   *
   * Deliberately has NO default. The old default was resolveRagProvenance(),
   * which always returns the built-in literal, so "the caller declared an
   * expectation" and "nobody declared one" were indistinguishable — and the
   * literal had gone stale, so every run failed. Undefined now means undefined.
   */
  expectedOrchestration?: { workflowId?: string; workflowVersionId?: string } | null,
  now = Date.now(),
) {
  if (!row) {
    return {
      ok: false,
      unverified: true,
      detail: "No complete full-suite RAG evaluation run exists. Run `bun run rag:evaluation:full` to establish the quality baseline.",
      metadata: {},
    };
  }
  const completedAt = row.completed_at ? new Date(row.completed_at).getTime() : Number.NaN;
  const ageHours = Number.isFinite(completedAt) ? Math.max(0, (now - completedAt) / 3_600_000) : null;
  const thresholds = {
    passRate: 0.95,
    minimumGroupPassRate: 0.9,
    expectedDocumentRecall: 0.95,
    citationValidityRate: 1,
    strictCategoryAccuracy: 1,
    localeSourceAccuracy: 1,
    highRiskRecall: 1,
    noContextAccuracy: 0.95,
  } as const;
  const failures = Object.entries(thresholds)
    .filter(([key, threshold]) => (metric(row.metrics, key) ?? -1) < threshold)
    .map(([key]) => key);
  const productionTarget = evaluateProductionEvaluationTarget(metricRecord(row.metrics).baseUrl);
  if (!productionTarget.ok) failures.push("productionTarget");
  // P0-7. Judge each component against the expectation that applies to it.
  // This used to compare all four fields against the n8n workflow identity,
  // which a correct direct-hybrid run can never match — it records the
  // RETRIEVER's identity, not the orchestrator's. The comparison fired on every
  // run and was muted; now only real drift fires.
  const provenanceVerdict = classifyRunProvenance({
    observedPaths: runtimePathsFromMetrics(row.metrics),
    retrieval: retrievalIdentityFromMetrics(row.metrics),
    orchestration: { workflowId: row.workflow_id, workflowVersionId: row.workflow_version_id },
    expectedOrchestration: expectedOrchestration === undefined
      ? configuredOrchestrationExpectation()
      : expectedOrchestration,
  });
  if (provenanceVerdict.drifted) failures.push("provenance");
  if (row.status !== "passed") failures.push("status");
  if ((row.case_count || 0) < 64) failures.push("caseCount");
  if (ageHours === null || ageHours > 24 * 7) failures.push("freshness");
  // "We measured quality and it regressed" and "nobody has measured quality
  // lately" are different operational facts, and only the first one means
  // production is serving worse answers. Reporting both as a required failure
  // held /api/ops/health at `degraded` every day for weeks over an evaluation
  // that has no scheduled runner at all — which is how a real n8n/Typebot
  // outage came to look like just another line in the same daily alert.
  // Staleness and provenance drift still surface, as a warning.
  const measuredFailures = failures.filter((key) => key !== "freshness" && key !== "provenance");
  const unverified = measuredFailures.length === 0 && failures.length > 0;

  return {
    ok: failures.length === 0,
    unverified,
    detail: failures.length === 0
      ? `Latest ${row.case_count}-case RAG evaluation meets the production quality gate.`
      : unverified
        ? `No trustworthy recent RAG evaluation: ${failures.join(", ")}. The last run's measured quality passed; re-run \`bun run rag:evaluation:full\` against the production provenance to restore the signal.`
        : `Latest full-suite RAG evaluation failed: ${failures.join(", ")}. ${describeRunProvenance(provenanceVerdict)}`,
    metadata: {
      runId: row.id || null,
      caseCount: row.case_count || 0,
      passedCount: row.passed_count || 0,
      ageHours,
      failures,
      // Per-component, so a reader can tell "the retriever changed" from
      // "an external workflow moved" from "nobody told us what to expect" —
      // three facts the single boolean could not distinguish.
      provenance: {
        summary: describeRunProvenance(provenanceVerdict),
        orchestration: provenanceVerdict.orchestration,
        retrieval: provenanceVerdict.retrieval,
        observedPaths: provenanceVerdict.observedPaths,
        mixedPaths: provenanceVerdict.mixedPaths,
        unverifiable: provenanceVerdict.unverifiable,
        // What the run itself recorded, so a failed gate is reproducible
        // without going back to the database.
        recorded: {
          workflowId: row.workflow_id || null,
          workflowVersionId: row.workflow_version_id || null,
          modelVersion: row.model_version || null,
          promptVersion: row.prompt_version || null,
        },
      },
      metrics: row.metrics || {},
      productionTarget,
    },
  };
}

type TimedResult = Omit<SystemHealthCheck, "key" | "required" | "latencyMs"> & { unverified?: boolean };

async function timed(
  key: string,
  // A predicate lets a check decide, from its own result, whether the failure
  // means production is broken (required) or merely unmeasured (warning).
  required: boolean | ((result: TimedResult) => boolean),
  run: () => Promise<TimedResult>,
) {
  const started = Date.now();
  try {
    const { unverified: _unverified, ...result } = await run() as TimedResult;
    const resolved = typeof required === "function"
      ? required({ ...result, unverified: _unverified })
      : required;
    return { key, required: resolved, latencyMs: Date.now() - started, ...result };
  } catch (error) {
    return {
      key,
      // An exception is a real failure, never a "not measured yet".
      required: typeof required === "function" ? true : required,
      ok: false,
      detail: error instanceof Error ? error.message.slice(0, 240) : String(error).slice(0, 240),
      latencyMs: Date.now() - started,
    };
  }
}

function serviceClient() {
  try {
    return createSupabaseServiceRoleClient();
  } catch {
    throw new Error("Supabase service configuration is missing");
  }
}

async function endpointHealth(urlValue: string, path: string) {
  const url = new URL(path, urlValue);
  const response = await fetch(url, { signal: AbortSignal.timeout(8_000), cache: "no-store" });
  return { ok: response.ok, status: response.status, origin: url.origin };
}

export async function checkPublishedTypebotRuntime() {
  const publicUrl = configured(runtimeEnvironment().TYPEBOT_PUBLIC_URL);
  const publicId = configured(runtimeEnvironment().TYPEBOT_PUBLIC_ID);
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
    tenant_id: PLATFORM_TENANT_ID,
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
  const bucket = configured(runtimeEnvironment().SUPABASE_CHAT_ATTACHMENTS_BUCKET) || configured(runtimeEnvironment().SUPABASE_STORAGE_BUCKET) || "kaxi-documents";
  const n8nWebhook = configured(runtimeEnvironment().N8N_TYPEBOT_RAG_WEBHOOK_URL);
  const typebotUrl = configured(runtimeEnvironment().TYPEBOT_PUBLIC_URL);
  const attachmentSecurity = getChatAttachmentSecurityDiagnostics();
  const embeddingStrategy = getRagEmbeddingStrategy();
  const openAiEmbeddingRequired = true;

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
      const ok = status.cutoverReady;
      const detail = ok
        ? "OpenAI text-embedding-3-small covers every eligible, citation-ready serving chunk."
        : status.readyChunks === status.eligibleChunks
          ? `${status.lexicalOnlyReadyChunks} serving chunk(s) are citation-ready but still require OpenAI vector embeddings.`
          : "The governed OpenAI serving projection is incomplete.";
      return { ok, detail, metadata: status as unknown as Record<string, unknown> };
    }),
    // Deliberately a warning, not required. The corpus is EXPECTED to be ahead of
    // the database between the PR that edits it and the operator action that
    // ingests it, so this must never flip production to degraded or block a
    // release. It only has to stop the gap from being invisible: the daily cron
    // surfaces failing keys regardless of severity, so a stale corpus now shows up
    // in the ops alert instead of sitting unnoticed for weeks, which is exactly
    // what happened to the 행정사 corrections in PR #65.
    //
    // Note this runs in runRagSystemHealth, not in the readiness payload, so the
    // deploy canary cannot be blocked by it.
    timed("rag.corpus_freshness", false, async () => {
      const report = await detectStaticCorpusDrift(serviceClient());
      return {
        ok: report.inSync,
        detail: describeCorpusDrift(report),
        metadata: {
          totalDocuments: report.totalDocuments,
          matchedDocuments: report.matchedDocuments,
          driftedDocuments: report.driftedDocuments,
        },
      };
    }),
    timed("rag.openai_query_embedding", openAiEmbeddingRequired, async () => {
      const embedding = await createRagQueryEmbedding(
        "한국 유학 D-10 구직 비자 체류자격 변경",
      );
      const endpointConfigured = embedding.status !== "not_configured";
      const ready = isOpenAiQueryEmbedding(embedding);
      const ok = ready;
      return {
        ok,
        detail: ready
          ? "OpenAI returned a valid text-embedding-3-small 1536d query embedding."
          : !endpointConfigured
            ? "The dedicated OpenAI embedding credential is not configured. Production retrieval has no E5/TF-IDF fallback."
            : `The OpenAI query embedding probe failed: ${embedding.failureReason || embedding.status}.`,
        metadata: {
          configured: endpointConfigured,
          required: openAiEmbeddingRequired,
          strategy: embeddingStrategy,
          status: embedding.status,
          provider: embedding.provider,
          model: embedding.model,
          dimensions: embedding.dimensions,
          failureReason: embedding.failureReason,
          latencyMs: embedding.latencyMs,
        },
      };
    }),
    timed("ai.managed_provider_generation", true, async () => {
      const providers = await probeManagedLlmProviders();
      const failed = providers.filter((provider) => !provider.ok);
      return {
        ok: failed.length === 0,
        detail: failed.length === 0
          ? "OpenAI and Anthropic both completed an independent generation probe."
          : `Managed LLM generation failed for ${failed.map((provider) => `${provider.backend}:${provider.failureCode}`).join(", ")}.`,
        metadata: { providers },
      };
    }),
    timed("rag.quality_evaluation", (result) => !result.unverified, async () => {
      const result = await supabase
        .from("rag_evaluation_runs")
        .select("id,status,case_count,passed_count,metrics,workflow_id,workflow_version_id,model_version,prompt_version,completed_at")
        .gte("case_count", 64)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (result.error) throw result.error;
      // Not `provenance` (= resolveRagProvenance()). That resolves to the
      // built-in literal when nothing is configured, which is what made this
      // gate assert a stale version on every run. Passing undefined lets the
      // evaluator take the environment's declaration, or report the gap.
      return evaluateRagQualityRun(result.data as EvaluationHealthRow | null);
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
      adminUrl: `${siteBaseUrl()}/admin`,
    });
  }
  return { id: inserted.data.id, status, checkedAt: new Date().toISOString(), durationMs, checks, alert, ...provenance };
}

export { getLatestRagSystemHealth } from "@/lib/ops/rag-system-health-status";
