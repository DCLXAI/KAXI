import { runtimeEnvironment } from "@/infrastructure/config/runtime-environment";
import { shouldUseDirectLexicalFallback } from "@/lib/chat/direct-lexical-fallback";
import {
  questionMediationRuntimePayload,
  type QuestionMediation,
} from "@/lib/chat/question-mediator";
import { resolveRagProvenance, type RagProvenance } from "@/lib/n8n/provenance";
import { signN8nPayload } from "@/lib/n8n/signature";

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return false;
}

function normalizeN8nPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return {};
  const data = payload as Record<string, unknown>;
  const nested = data.data && typeof data.data === "object" ? (data.data as Record<string, unknown>) : data;
  const runtimePath = typeof nested.runtimePath === "string" && nested.runtimePath.trim()
    ? nested.runtimePath.trim().slice(0, 80)
    : "n8n-workflow";
  const searchMeta = nested.searchMeta && typeof nested.searchMeta === "object" && !Array.isArray(nested.searchMeta)
    ? { ...(nested.searchMeta as Record<string, unknown>), runtimePath }
    : { runtimePath };

  return {
    answer: typeof nested.answer === "string" ? nested.answer : undefined,
    nextStep: typeof nested.nextStep === "string" ? nested.nextStep : undefined,
    needsHuman: nested.needsHuman,
    riskLevel: nested.riskLevel,
    leadStage: nested.leadStage,
    sources: nested.sources,
    searchMeta,
    executionId: typeof nested.executionId === "string" ? nested.executionId : undefined,
    workflowId: typeof nested.workflowId === "string" ? nested.workflowId : undefined,
    workflowVersionId: typeof nested.workflowVersionId === "string" ? nested.workflowVersionId : undefined,
    modelVersion: typeof nested.modelVersion === "string" ? nested.modelVersion : undefined,
    promptVersion: typeof nested.promptVersion === "string" ? nested.promptVersion : undefined,
    n8nExecutionId: typeof nested.n8nExecutionId === "string" ? nested.n8nExecutionId : undefined,
    n8nWorkflowId: typeof nested.n8nWorkflowId === "string" ? nested.n8nWorkflowId : undefined,
    n8nWorkflowVersionId: typeof nested.n8nWorkflowVersionId === "string" ? nested.n8nWorkflowVersionId : undefined,
    runtimePath,
  };
}

export function n8nQuestionPlan(question: string, mediation: QuestionMediation) {
  return {
    question,
    retrievalQuery: mediation.searchQuery || question,
    answerFocus: mediation.answerFocus,
    responseMode: mediation.responseMode,
    plannedIntents: mediation.intents,
    plannedVisaCodes: mediation.visaCodes,
    mediationPromptVersion: mediation.promptVersion,
    mediation: questionMediationRuntimePayload(mediation),
  };
}

export function shouldRetryN8nNoContext(payload: { searchMeta?: unknown }) {
  const searchMeta = payload.searchMeta && typeof payload.searchMeta === "object"
    ? payload.searchMeta as Record<string, unknown>
    : {};
  return normalizeBoolean(searchMeta.noContext)
    || normalizeBoolean(searchMeta.no_context)
    || normalizeText(searchMeta.noContextReason, 120).length > 0
    || normalizeText(searchMeta.no_context_reason, 120).length > 0;
}

export function n8nRuntimeTimeoutMs() {
  const configured = Number(runtimeEnvironment().N8N_RAG_TIMEOUT_MS);
  if (!Number.isFinite(configured)) return 35_000;
  return Math.min(Math.max(Math.trunc(configured), 1_000), 45_000);
}

export function ragRuntimePrimary(env: NodeJS.ProcessEnv = runtimeEnvironment()): "direct" | "n8n" {
  return env.KAXI_RAG_RUNTIME_PRIMARY?.trim().toLowerCase() === "n8n" ? "n8n" : "direct";
}

function runtimeErrorReason(error: unknown) {
  if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return "n8n_timeout";
  }
  if (error instanceof Error && error.message === "N8N_WEBHOOK_NOT_CONFIGURED") {
    return "n8n_not_configured";
  }
  return "n8n_unavailable";
}

type N8nRuntimeFailure = {
  ok: false;
  fallbackReason: string;
  provenance: RagProvenance;
  executionId?: string;
  httpStatus?: number;
};

type N8nRuntimeSuccess = {
  ok: true;
  payload: ReturnType<typeof normalizeN8nPayload>;
  provenance: RagProvenance;
};

export async function requestN8nRuntime(
  request: Record<string, unknown>,
  options: { traceparent?: string } = {},
): Promise<N8nRuntimeSuccess | N8nRuntimeFailure> {
  let signed: ReturnType<typeof signN8nPayload>;
  try {
    signed = signN8nPayload("typebot-runtime", request);
  } catch (error) {
    const fallbackReason = runtimeErrorReason(error);
    if (!shouldUseDirectLexicalFallback({ configurationError: true })) throw error;
    return { ok: false, fallbackReason, provenance: resolveRagProvenance() };
  }

  let response: Response;
  try {
    response = await fetch(signed.url, {
      method: "POST",
      headers: { ...signed.headers, ...(options.traceparent ? { traceparent: options.traceparent } : {}) },
      body: signed.body,
      signal: AbortSignal.timeout(n8nRuntimeTimeoutMs()),
    });
  } catch (error) {
    const fallbackReason = runtimeErrorReason(error);
    if (!shouldUseDirectLexicalFallback({ transportError: error })) throw error;
    return { ok: false, fallbackReason, provenance: resolveRagProvenance() };
  }

  let rawText = "";
  try {
    rawText = await response.text();
  } catch (error) {
    return {
      ok: false,
      fallbackReason: runtimeErrorReason(error),
      provenance: resolveRagProvenance(),
      httpStatus: response.status,
    };
  }

  let parsedPayload: unknown = {};
  let invalidJson = false;
  if (rawText.trim()) {
    try {
      parsedPayload = JSON.parse(rawText);
    } catch {
      invalidJson = true;
    }
  }
  const normalized = normalizeN8nPayload(parsedPayload);
  const provenance = resolveRagProvenance(normalized);

  if (!response.ok && shouldUseDirectLexicalFallback({ status: response.status })) {
    return { ok: false, fallbackReason: `n8n_http_${response.status}`, provenance, executionId: normalized.executionId, httpStatus: response.status };
  }
  if (!rawText.trim() && shouldUseDirectLexicalFallback({ emptyResponse: true })) {
    return { ok: false, fallbackReason: "n8n_empty_response", provenance, executionId: normalized.executionId, httpStatus: response.status };
  }
  if (invalidJson && shouldUseDirectLexicalFallback({ invalidResponse: true })) {
    return { ok: false, fallbackReason: "n8n_invalid_json", provenance, executionId: normalized.executionId, httpStatus: response.status };
  }
  if (!normalized.answer?.trim() && shouldUseDirectLexicalFallback({ invalidResponse: true })) {
    return { ok: false, fallbackReason: "n8n_invalid_response", provenance, executionId: normalized.executionId, httpStatus: response.status };
  }

  return { ok: true, payload: normalized, provenance };
}
