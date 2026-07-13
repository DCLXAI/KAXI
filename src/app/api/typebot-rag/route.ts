import { after, NextRequest, NextResponse } from "next/server";
import { parseLimit, rateLimit } from "@/lib/api/security";
import { JsonBodyError, readJsonBody } from "@/lib/api/json-body";
import { persistCanonicalHandoffTask, persistChatExchange } from "@/lib/chat/persistence";
import { CHAT_SESSION_COOKIE, verifyChatSessionToken } from "@/lib/chat/session-token";
import { getReadyChatAttachmentsForRuntime } from "@/lib/chat/attachment-processing";
import { inferChatCategory } from "@/lib/chat/category";
import {
  DIRECT_LEXICAL_PROVENANCE,
  DIRECT_LEXICAL_RUNTIME_PATH,
  DIRECT_HYBRID_RUNTIME_PATH,
  runDirectRagFallback,
  shouldUseDirectLexicalFallback,
  type DirectLexicalResponse,
} from "@/lib/chat/direct-lexical-fallback";
import { createChatRequestIdentity } from "@/lib/chat/request-identity";
import {
  applyChatResponseGuardrail,
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

function n8nRuntimeTimeoutMs() {
  const configured = Number(process.env.N8N_RAG_TIMEOUT_MS);
  if (!Number.isFinite(configured)) return 15_000;
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
    const category = inferChatCategory(question, body?.category);
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

    const identity = createChatRequestIdentity({ requestId: body?.requestId, source, sessionId, question });

    const startedAt = Date.now();
    const n8nRequest = {
      question,
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

    const n8nAttempt = await requestN8nRuntime(n8nRequest);
    let upstreamPayload: ReturnType<typeof normalizeN8nPayload> | DirectLexicalResponse;
    let provenance: RagProvenance;

    if (n8nAttempt.ok) {
      upstreamPayload = n8nAttempt.payload;
      provenance = n8nAttempt.provenance;
    } else {
      console.warn("[POST /api/typebot-rag] using direct lexical fallback", {
        reason: n8nAttempt.fallbackReason,
        httpStatus: n8nAttempt.httpStatus,
      });
      try {
        upstreamPayload = await runDirectRagFallback({
          question,
          category,
          locale,
          tenantId: "default",
          requestId: identity.requestId,
          fallbackReason: n8nAttempt.fallbackReason,
          attachmentCount: verifiedAttachments.length,
        });
        provenance = resolveRagProvenance(upstreamPayload);
        reportOpsEventAsync(
          "n8n_runtime_fallback_succeeded",
          "KAXI served the request through its direct Supabase RAG fallback.",
          provenance,
          upstreamPayload.executionId,
          {
            runtimePath: upstreamPayload.runtimePath,
            fallbackReason: n8nAttempt.fallbackReason,
            n8nHttpStatus: n8nAttempt.httpStatus,
            n8nWorkflowId: n8nAttempt.provenance.workflowId,
          },
          "warning",
        );
      } catch (fallbackError) {
        console.error("[POST /api/typebot-rag] direct lexical fallback failed", fallbackError);
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
            fallbackReason: n8nAttempt.fallbackReason,
            n8nHttpStatus: n8nAttempt.httpStatus,
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
