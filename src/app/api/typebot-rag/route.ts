import { after, NextRequest, NextResponse } from "next/server";
import { parseLimit, rateLimit } from "@/lib/api/security";
import { JsonBodyError, readJsonBody } from "@/lib/api/json-body";
import { persistCanonicalHandoffTask, persistChatExchange } from "@/lib/chat/persistence";
import { CHAT_SESSION_COOKIE, verifyChatSessionToken } from "@/lib/chat/session-token";
import { getReadyChatAttachmentsForRuntime } from "@/lib/chat/attachment-processing";
import { inferChatCategory } from "@/lib/chat/category";
import { createChatRequestIdentity } from "@/lib/chat/request-identity";
import { applyChatResponseGuardrail } from "@/lib/chat/response-guardrail";
import {
  ragProvenanceHeaders,
  resolveRagProvenance,
  type RagProvenance,
} from "@/lib/n8n/provenance";
import { createTypebotHandoffToken, signN8nPayload } from "@/lib/n8n/signature";
import { recordOpsEvent } from "@/lib/ops/events";
import { verifyTypebotGatewayHeaders } from "@/lib/typebot/gateway-auth";

const SUPPORTED_LOCALES = new Set(["ko", "en", "vi", "mn"]);

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

function normalizeLocale(value: unknown) {
  if (typeof value !== "string") return "ko";
  return SUPPORTED_LOCALES.has(value) ? value : "ko";
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

  return {
    answer: typeof nested.answer === "string" ? nested.answer : undefined,
    nextStep: typeof nested.nextStep === "string" ? nested.nextStep : undefined,
    needsHuman: nested.needsHuman,
    riskLevel: nested.riskLevel,
    leadStage: nested.leadStage,
    sources: nested.sources,
    searchMeta: nested.searchMeta,
    executionId: typeof nested.executionId === "string" ? nested.executionId : undefined,
    workflowId: typeof nested.workflowId === "string" ? nested.workflowId : undefined,
    workflowVersionId: typeof nested.workflowVersionId === "string" ? nested.workflowVersionId : undefined,
    modelVersion: typeof nested.modelVersion === "string" ? nested.modelVersion : undefined,
    promptVersion: typeof nested.promptVersion === "string" ? nested.promptVersion : undefined,
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

    const reportOpsFailure = (
      eventType: string,
      message: string,
      provenance: RagProvenance,
      executionId?: string,
      payload: Record<string, unknown> = {},
    ) => {
      after(async () => {
        await recordOpsEvent({
          source: "kaxi-typebot-gateway",
          severity: "error",
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

    const signed = signN8nPayload("typebot-runtime", n8nRequest);
    let response: Response;
    try {
      response = await fetch(signed.url, {
        method: "POST",
        headers: signed.headers,
        body: signed.body,
        signal: AbortSignal.timeout(45_000),
      });
    } catch (error) {
      console.error("[POST /api/typebot-rag] n8n unavailable", error);
      const provenance = resolveRagProvenance();
      await persistFailure("n8n_unavailable", provenance);
      reportOpsFailure(
        "n8n_runtime_unavailable",
        "KAXI could not reach the n8n RAG runtime.",
        provenance,
      );
      return ragJson({ error: "n8n request failed" }, { status: 502 }, provenance);
    }

    const rawText = await response.text();
    let payload: unknown = {};
    if (rawText) {
      try {
        payload = JSON.parse(rawText);
      } catch {
        payload = { answer: rawText };
      }
    }

    const upstreamPayload = normalizeN8nPayload(payload);
    const provenance = resolveRagProvenance(upstreamPayload);
    if (!response.ok) {
      console.error("[POST /api/typebot-rag] n8n error", response.status, rawText);
      await persistFailure(`n8n_http_${response.status}`, provenance, upstreamPayload.executionId);
      reportOpsFailure(
        "n8n_runtime_http_error",
        `The n8n RAG runtime returned HTTP ${response.status}.`,
        provenance,
        upstreamPayload.executionId,
        { httpStatus: response.status },
      );
      return ragJson({ error: "n8n request failed" }, { status: 502 }, provenance);
    }
    if (!upstreamPayload.answer?.trim()) {
      console.error("[POST /api/typebot-rag] n8n response missing answer", rawText);
      await persistFailure("n8n_invalid_response", provenance, upstreamPayload.executionId);
      reportOpsFailure(
        "n8n_runtime_invalid_response",
        "The n8n RAG runtime returned a response without an answer.",
        provenance,
        upstreamPayload.executionId,
      );
      return ragJson({ error: "n8n returned an invalid response" }, { status: 502 }, provenance);
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
          reportOpsFailure(
            "handoff_persistence_failed",
            "A required human handoff could not be persisted.",
            provenance,
            normalizedPayload.executionId,
          );
        }
      }
    } catch (persistError) {
      console.error("[POST /api/typebot-rag] chat persistence failed", persistError);
      reportOpsFailure(
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
