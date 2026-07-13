import { after, NextRequest, NextResponse } from "next/server";
import { parseLimit, rateLimit } from "@/lib/api/security";
import { JsonBodyError, readJsonBody } from "@/lib/api/json-body";
import { persistCanonicalHandoffTask, persistChatExchange } from "@/lib/chat/persistence";
import { CHAT_SESSION_COOKIE, verifyChatSessionToken } from "@/lib/chat/session-token";
import { getReadyChatAttachmentsForRuntime } from "@/lib/chat/attachment-processing";
import { inferChatCategory } from "@/lib/chat/category";
import {
  clarificationNextStep,
  mediateRagQuestion,
  questionMediationMetadata,
  questionMediationProvenance,
  questionMediationRuntimePayload,
  type QuestionMediation,
} from "@/lib/chat/question-mediator";
import {
  DIRECT_LEXICAL_PROVENANCE,
  DIRECT_LEXICAL_RUNTIME_PATH,
  DIRECT_HYBRID_RUNTIME_PATH,
  runDirectRagFallback,
  shouldUseDirectLexicalFallback,
} from "@/lib/chat/direct-lexical-fallback";
import { createChatRequestIdentity } from "@/lib/chat/request-identity";
import {
  applyChatResponseGuardrail,
  type GuardedChatResponse,
  type GuardrailLocale,
} from "@/lib/chat/response-guardrail";
import {
  ragProvenanceHeaders,
  resolveRagProvenance,
  type RagProvenance,
} from "@/lib/n8n/provenance";
import { createTypebotHandoffToken, signN8nPayload } from "@/lib/n8n/signature";
import { recordOpsEvent } from "@/lib/ops/events";
import { verifyTypebotGatewayHeaders } from "@/lib/typebot/gateway-auth";

const SUPPORTED_LOCALES = new Set<GuardrailLocale>(["ko", "en", "vi", "mn"]);

type ChatAttachment = {
  id?: unknown;
  bucket?: unknown;
  storageKey?: unknown;
  name?: unknown;
  size?: unknown;
  type?: unknown;
  sha256?: unknown;
};

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function normalizeLocale(value: unknown): GuardrailLocale {
  if (typeof value !== "string") return "ko";
  return SUPPORTED_LOCALES.has(value as GuardrailLocale) ? value as GuardrailLocale : "ko";
}

function normalizeSource(value: unknown) {
  return value === "typebot" ? "typebot" : "kaxi-site";
}

function normalizeAttachments(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 3).flatMap((attachment: ChatAttachment) => {
    const storageKey = normalizeText(attachment?.storageKey, 500);
    const bucket = normalizeText(attachment?.bucket, 120);
    if (!storageKey || !bucket) return [];

    return {
      id: normalizeText(attachment?.id, 120),
      bucket,
      storageKey,
      name: normalizeText(attachment?.name, 160),
      size: typeof attachment?.size === "number" ? attachment.size : undefined,
      type: normalizeText(attachment?.type, 120),
      sha256: normalizeText(attachment?.sha256, 80),
    };
  });
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
    runtimePath,
  };
}

function addProvenanceHeaders(response: NextResponse, provenance = resolveRagProvenance()) {
  for (const [name, value] of Object.entries(ragProvenanceHeaders(provenance))) {
    response.headers.set(name, value);
  }
  return response;
}

function ragJson(
  body: Record<string, unknown>,
  init?: ResponseInit,
  provenanceInput?: unknown,
) {
  const provenance = resolveRagProvenance(provenanceInput);
  return addProvenanceHeaders(NextResponse.json({ ...body, ...provenance }, init), provenance);
}

async function ragRateLimitJson(response: NextResponse) {
  const payload = await response.json().catch(() => ({ error: "Rate limit unavailable" }));
  const body = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : { error: "Rate limit unavailable" };
  const headers = new Headers();
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) headers.set("retry-after", retryAfter);
  return ragJson(body, { status: response.status, headers });
}

function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return false;
}

function withQuestionMediation(
  payload: GuardedChatResponse,
  mediation: QuestionMediation,
): GuardedChatResponse {
  const searchMeta = payload.searchMeta && typeof payload.searchMeta === "object" && !Array.isArray(payload.searchMeta)
    ? payload.searchMeta as Record<string, unknown>
    : {};
  return {
    ...payload,
    searchMeta: {
      ...searchMeta,
      ...questionMediationMetadata(mediation),
    },
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
  const configured = Number(process.env.N8N_RAG_TIMEOUT_MS);
  if (!Number.isFinite(configured)) return 35_000;
  return Math.min(Math.max(Math.trunc(configured), 1_000), 45_000);
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
      headers: signed.headers,
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
    return {
      ok: false,
      fallbackReason: `n8n_http_${response.status}`,
      provenance,
      executionId: normalized.executionId,
      httpStatus: response.status,
    };
  }
  if (!rawText.trim() && shouldUseDirectLexicalFallback({ emptyResponse: true })) {
    return {
      ok: false,
      fallbackReason: "n8n_empty_response",
      provenance,
      executionId: normalized.executionId,
      httpStatus: response.status,
    };
  }
  if (invalidJson && shouldUseDirectLexicalFallback({ invalidResponse: true })) {
    return {
      ok: false,
      fallbackReason: "n8n_invalid_json",
      provenance,
      executionId: normalized.executionId,
      httpStatus: response.status,
    };
  }
  if (!normalized.answer?.trim() && shouldUseDirectLexicalFallback({ invalidResponse: true })) {
    return {
      ok: false,
      fallbackReason: "n8n_invalid_response",
      provenance,
      executionId: normalized.executionId,
      httpStatus: response.status,
    };
  }

  return { ok: true, payload: normalized, provenance };
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, {
    key: "typebot-rag",
    limit: parseLimit(process.env.TYPEBOT_RAG_RATE_LIMIT, 20),
    windowMs: 60 * 1000,
  });
  if (limited) return ragRateLimitJson(limited);

  try {
    const body = await readJsonBody<Record<string, unknown>>(req, 64 * 1024);
    const question = normalizeText(body?.question, 1200);
    const sessionId = normalizeText(body?.sessionId, 120);
    const locale = normalizeLocale(body?.locale);
    const source = normalizeSource(body?.source);
    const typebotResultId = normalizeText(body?.typebotResultId, 120);
    const deterministicCategory = inferChatCategory(question, body?.category);
    const attachments = normalizeAttachments(body?.attachments);

    if (!question || !sessionId) {
      return ragJson({ error: "question and sessionId are required" }, { status: 400 });
    }
    if (source === "typebot" && (!typebotResultId || sessionId !== `typebot-${typebotResultId}`)) {
      return ragJson({ error: "Invalid Typebot session" }, { status: 400 });
    }
    if (source === "typebot" && !verifyTypebotGatewayHeaders(req.headers)) {
      return ragJson({ error: "Unauthorized Typebot gateway" }, { status: 401 });
    }
    if (source === "typebot" && attachments.length > 0) {
      return ragJson({ error: "Typebot attachments are not supported by this gateway" }, { status: 400 });
    }
    if (source === "kaxi-site" && !verifyChatSessionToken(req.cookies.get(CHAT_SESSION_COOKIE)?.value, sessionId)) {
      return ragJson({ error: "Invalid or expired chat session" }, { status: 401 });
    }
    let verifiedAttachments = attachments;
    if (source === "kaxi-site" && attachments.length > 0) {
      try {
        verifiedAttachments = await getReadyChatAttachmentsForRuntime(sessionId, attachments);
      } catch (error) {
        console.warn("[POST /api/typebot-rag] attachment validation failed", error);
        return ragJson({ error: "Attachment is not ready or does not belong to this session" }, { status: 409 });
      }
    }

    const startedAt = Date.now();
    const identity = createChatRequestIdentity({ requestId: body?.requestId, source, sessionId, question });
    const mediation = await mediateRagQuestion({
      question,
      locale,
      deterministicCategory,
    });
    const category = mediation.category;

    const n8nRequest = {
      ...n8nQuestionPlan(question, mediation),
      sessionId,
      tenant_id: "default",
      category,
      source,
      locale,
      typebotResultId: typebotResultId || undefined,
      requestId: identity.requestId,
      idempotencyKey: identity.idempotencyKey,
      externalRequestId: identity.externalRequestId,
      attachments: verifiedAttachments,
    };

    const persistFailure = async (
      errorCode: string,
      provenance: RagProvenance,
      executionId?: string,
    ) => {
      try {
        await persistChatExchange({
          requestId: identity.requestId,
          idempotencyKey: identity.idempotencyKey,
          sessionKey: sessionId,
          tenantId: "default",
          locale,
          source,
          typebotResultId: typebotResultId || undefined,
          question,
          answer: "",
          attachments: verifiedAttachments,
          executionId,
          provenance,
          latencyMs: Date.now() - startedAt,
          status: "failed",
          errorCode,
        });
      } catch (persistError) {
        console.error("[POST /api/typebot-rag] failure persistence failed", persistError);
      }
    };

    const reportOpsEventAsync = (
      eventType: string,
      message: string,
      provenance: RagProvenance,
      executionId?: string,
      payload: Record<string, unknown> = {},
      severity: "warning" | "error" = "error",
    ) => {
      after(async () => {
        await recordOpsEvent({
          source: "kaxi-typebot-gateway",
          severity,
          eventType,
          message,
          workflowId: provenance.workflowId,
          workflowVersionId: provenance.workflowVersionId,
          modelVersion: provenance.modelVersion,
          promptVersion: provenance.promptVersion,
          executionId: executionId || identity.requestId,
          payload: {
            requestId: identity.requestId,
            source,
            locale,
            category,
            ...payload,
          },
        }).catch((alertError) => {
          console.error("[POST /api/typebot-rag] operations alert failed", alertError);
        });
      });
    };

    let upstreamPayload: GuardedChatResponse;
    let provenance: RagProvenance;
    if (mediation.action === "clarify") {
      provenance = questionMediationProvenance(mediation);
      upstreamPayload = {
        answer: mediation.clarificationQuestion,
        nextStep: clarificationNextStep(locale),
        needsHuman: false,
        riskLevel: "low",
        leadStage: "none",
        sources: [],
        searchMeta: {
          type: "question-mediation",
          retrievalMode: "not-run",
          scoreVersion: "not-applicable",
          runtimePath: "kaxi-question-mediator",
          answerMode: "clarification",
          retrievedCount: 0,
          noContext: false,
          noContextReason: null,
          category,
          locale,
        },
        executionId: `mediator-${identity.requestId}`,
        runtimePath: "kaxi-question-mediator",
        ...provenance,
      };
    } else {
      const n8nAttempt = await requestN8nRuntime(n8nRequest);
      const n8nNeedsCanonicalRetry = n8nAttempt.ok && shouldRetryN8nNoContext(n8nAttempt.payload);
      const fallbackReason = n8nAttempt.ok ? "n8n_no_context" : n8nAttempt.fallbackReason;
      const fallbackHttpStatus = n8nAttempt.ok ? 200 : n8nAttempt.httpStatus;
      const fallbackExecutionId = n8nAttempt.ok ? n8nAttempt.payload.executionId : n8nAttempt.executionId;

      if (n8nAttempt.ok && !n8nNeedsCanonicalRetry) {
        upstreamPayload = n8nAttempt.payload;
        provenance = n8nAttempt.provenance;
      } else {
        console.warn("[POST /api/typebot-rag] using canonical Supabase fallback", {
          reason: fallbackReason,
          httpStatus: fallbackHttpStatus,
        });
        try {
          upstreamPayload = await runDirectRagFallback({
            question,
            retrievalQuery: mediation.searchQuery,
            category,
            locale,
            tenantId: "default",
            requestId: identity.requestId,
            fallbackReason,
            attachmentCount: verifiedAttachments.length,
            mediation,
          });
          provenance = resolveRagProvenance(upstreamPayload);
          reportOpsEventAsync(
            "n8n_runtime_fallback_succeeded",
            "KAXI served the mediated request through its direct Supabase RAG fallback.",
            provenance,
            upstreamPayload.executionId,
            {
              runtimePath: upstreamPayload.runtimePath,
              fallbackReason,
              n8nHttpStatus: fallbackHttpStatus,
              n8nWorkflowId: n8nAttempt.provenance.workflowId,
            },
            "warning",
          );
        } catch (fallbackError) {
          console.error("[POST /api/typebot-rag] direct lexical fallback failed", fallbackError);
          if (n8nAttempt.ok) {
            upstreamPayload = n8nAttempt.payload;
            provenance = n8nAttempt.provenance;
            reportOpsEventAsync(
              "n8n_no_context_canonical_retry_failed",
              "The mediated canonical Supabase retry failed, so KAXI retained the n8n no-context response.",
              provenance,
              fallbackExecutionId,
              {
                runtimePath: "n8n-workflow",
                fallbackReason,
                directError: fallbackError instanceof Error ? fallbackError.message.slice(0, 240) : "unknown",
              },
              "warning",
            );
          } else {
            const directExecutionId = `direct-${identity.requestId}`;
            await persistFailure("rag_runtime_unavailable", DIRECT_LEXICAL_PROVENANCE, directExecutionId);
            reportOpsEventAsync(
              "rag_runtime_unavailable",
              "Both the n8n runtime and KAXI direct Supabase fallback failed.",
              DIRECT_LEXICAL_PROVENANCE,
              directExecutionId,
              {
                runtimePath: "unavailable",
                attemptedRuntimePaths: ["n8n-workflow", DIRECT_HYBRID_RUNTIME_PATH, DIRECT_LEXICAL_RUNTIME_PATH],
                fallbackReason,
                n8nHttpStatus: fallbackHttpStatus,
                directError: fallbackError instanceof Error ? fallbackError.message.slice(0, 240) : "unknown",
              },
            );
            return ragJson({
              error: "RAG runtime unavailable",
              runtimePath: "unavailable",
              attemptedRuntimePaths: ["n8n-workflow", DIRECT_HYBRID_RUNTIME_PATH, DIRECT_LEXICAL_RUNTIME_PATH],
            }, { status: 502 }, DIRECT_LEXICAL_PROVENANCE);
          }
        }
      }
    }

    upstreamPayload = withQuestionMediation(upstreamPayload, mediation);
    if (mediation.needsHumanReview && mediation.action === "retrieve") {
      upstreamPayload = {
        ...upstreamPayload,
        needsHuman: true,
        riskLevel: upstreamPayload.riskLevel === "high" ? "high" : "medium",
        leadStage: upstreamPayload.riskLevel === "high" ? "urgent" : "review",
      };
    }

    const guardedPayload = applyChatResponseGuardrail(upstreamPayload, question, locale);
    const normalizedPayload = { ...guardedPayload, ...provenance };

    let storedMessageId: string | undefined;
    let persistenceMode: string | undefined;
    let handoffTaskPersisted = false;
    try {
      const needsHuman = normalizeBoolean(normalizedPayload.needsHuman);
      const riskLevel = typeof normalizedPayload.riskLevel === "string" ? normalizedPayload.riskLevel : "low";
      const persisted = await persistChatExchange({
        requestId: identity.requestId,
        idempotencyKey: identity.idempotencyKey,
        sessionKey: sessionId,
        tenantId: "default",
        locale,
        source,
        typebotResultId: typebotResultId || undefined,
        question,
        answer: normalizedPayload.answer || "",
        riskLevel,
        needsHuman,
        leadStage: typeof normalizedPayload.leadStage === "string" ? normalizedPayload.leadStage : undefined,
        nextStep: normalizedPayload.nextStep,
        attachments: verifiedAttachments,
        executionId: normalizedPayload.executionId,
        provenance,
        sources: normalizedPayload.sources,
        searchMeta: normalizedPayload.searchMeta,
        latencyMs: Date.now() - startedAt,
      });
      storedMessageId = persisted.id.toString();
      persistenceMode = persisted.mode;
      if (needsHuman) {
        try {
          handoffTaskPersisted = await persistCanonicalHandoffTask({
            requestId: identity.requestId,
            idempotencyKey: identity.idempotencyKey,
            messageId: persisted.id,
            sessionKey: sessionId,
            tenantId: "default",
            locale,
            source,
            typebotResultId: typebotResultId || undefined,
            question,
            answer: normalizedPayload.answer || "",
            riskLevel,
            needsHuman,
            leadStage: typeof normalizedPayload.leadStage === "string" ? normalizedPayload.leadStage : undefined,
            nextStep: normalizedPayload.nextStep,
            executionId: normalizedPayload.executionId,
            provenance,
            sources: normalizedPayload.sources,
            searchMeta: normalizedPayload.searchMeta,
            latencyMs: Date.now() - startedAt,
          });
        } catch (handoffError) {
          console.error("[POST /api/typebot-rag] canonical handoff persistence failed", handoffError);
          reportOpsEventAsync(
            "handoff_persistence_failed",
            "A required human handoff could not be persisted.",
            provenance,
            normalizedPayload.executionId,
          );
        }
      }
    } catch (persistError) {
      console.error("[POST /api/typebot-rag] chat persistence failed", persistError);
      reportOpsEventAsync(
        "chat_persistence_failed",
        "A chatbot exchange could not be persisted.",
        provenance,
        normalizedPayload.executionId,
      );
    }

    const handoffToken = source === "typebot" ? createTypebotHandoffToken(sessionId) : undefined;
    return ragJson({
      ...normalizedPayload,
      requestId: identity.requestId,
      handoffToken,
      persisted: Boolean(storedMessageId),
      messageId: storedMessageId,
      persistenceMode,
      handoffTaskPersisted,
    }, undefined, provenance);
  } catch (error) {
    if (error instanceof JsonBodyError) {
      return ragJson({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error && error.message === "N8N_WEBHOOK_NOT_CONFIGURED") {
      return ragJson({ error: "n8n runtime is not configured" }, { status: 503 });
    }
    console.error("[POST /api/typebot-rag]", error);
    return ragJson({ error: "Internal error" }, { status: 500 });
  }
}
