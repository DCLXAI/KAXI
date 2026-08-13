import { after, NextRequest, NextResponse } from "next/server";
import {
  consumeDailyQuota,
  getClientIp,
  rateLimit,
  sanitizeAiBody,
} from "@/lib/api/security";
import {
  decideUnifiedAiRoute,
  type UnifiedAiCapability,
  type UnifiedExpertMode,
} from "@/lib/ai/unified-router";
import { runUnifiedAiUseCase } from "@/application/ai/unified-ai";
import type {
  AiRequestContext,
  ApplicationError,
} from "@/application/ai/contracts";
import { currentAuthenticatedStudentProfileId } from "@/lib/cases/current-student";
import { CHAT_SESSION_COOKIE, verifyChatSessionToken } from "@/lib/chat/session-token";
import { persistChatExchange } from "@/lib/chat/persistence";
import type { Lang } from "@/lib/i18n/translations";
import { platformAnonymousTenantContext } from "@/application/tenancy/tenant-context";
import { getApplicationAiRuntimeConfig } from "@/infrastructure/config/application-ai-config";
import {
  attachAiResponseIdentity,
  createAiHttpRequestIdentity,
  observeAiHttpRequest,
  observeDetachedAiStage,
  type AiHttpRequestIdentity,
  type ObserveAiHttpStage,
} from "@/adapters/http/ai/trace-observer";
import type { ApplicationAiRuntimeConfig } from "@/application/ai/runtime-config";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function boolean(value: unknown): boolean {
  return value === true;
}

function previousCapability(value: unknown): UnifiedAiCapability | null {
  return value === "action" || value === "expert" ? value : null;
}

function previousExpertMode(value: unknown): UnifiedExpertMode | null {
  return value === "general" || value === "visa" || value === "documents" || value === "appeal" || value === "business"
    ? value
    : null;
}

function requestToken(req: NextRequest, header: string): string | null {
  const value = req.headers.get(header)?.trim();
  return value ? value.slice(0, 128) : null;
}

function applicationStatus(error: ApplicationError): number {
  if (error.code === "invalid_input") return 400;
  if (error.code === "cancelled") return 499;
  if (error.code === "deadline_exceeded") return 504;
  if (error.code === "llm_unavailable" || error.code === "retrieval_unavailable") return 503;
  return 500;
}

function requestContext(
  req: NextRequest,
  locale: Lang,
  capability: UnifiedAiCapability,
  runtimeConfig: ApplicationAiRuntimeConfig,
  identity: AiHttpRequestIdentity,
  principalSessionId: string,
): AiRequestContext {
  const deadlineDefault = capability === "expert" ? 58_000 : 24_000;
  return {
    requestId: identity.requestId,
    idempotencyKey: requestToken(req, "idempotency-key") || `unified-${identity.requestId}`,
    principal: { kind: "anonymous-session", sessionId: principalSessionId },
    tenantContext: platformAnonymousTenantContext(principalSessionId),
    locale,
    channel: "web",
    traceId: identity.traceId,
    traceparent: identity.traceparent,
    clientIp: getClientIp(req),
    signal: req.signal,
    deadlineAt: Date.now() + (runtimeConfig.unifiedRequestDeadlineMs || deadlineDefault),
  };
}

async function runUnifiedAiHttpAdapterObserved(
  req: NextRequest,
  suppliedBody: Record<string, unknown> | undefined,
  options: {
    reportProgress?: (stage: "routing" | "searching" | "generating" | "finalizing") => void;
    reportVerifiedDelta?: (delta: string) => void;
  },
  identity: AiHttpRequestIdentity,
  observeStage: ObserveAiHttpStage,
) {
  const runtimeConfig = getApplicationAiRuntimeConfig();
  const requestInput = await observeStage("validation", async () => {
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (Number.isFinite(contentLength) && contentLength > 100_000) {
      return { kind: "response" as const, response: NextResponse.json({ error: "Request body is too large" }, { status: 413 }) };
    }
    let body: Record<string, unknown>;
    try {
      body = suppliedBody || record(await req.json());
    } catch {
      return { kind: "response" as const, response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }) };
    }
    const rawQuestion = text(body.question);
    if (!rawQuestion) {
      return { kind: "response" as const, response: NextResponse.json({ error: "Question is required" }, { status: 400 }) };
    }
    return {
      kind: "input" as const,
      body,
      routing: decideUnifiedAiRoute(rawQuestion, {
        previousCapability: previousCapability(body.previousCapability),
        previousExpertMode: previousExpertMode(body.previousExpertMode),
      }),
    };
  });
  if (requestInput.kind === "response") {
    return attachAiResponseIdentity(requestInput.response, identity);
  }
  const { body, routing } = requestInput;
  const isExpert = routing.capability === "expert";
  const admission = await observeStage("rate_limit", async () => {
    const limited = await rateLimit(req, {
      key: isExpert ? "ai:consult" : "ai:agent",
      limit: isExpert ? runtimeConfig.expertRateLimit : runtimeConfig.agentRateLimit,
      windowMs: 60 * 1000,
    });
    if (limited) return limited;
    return consumeDailyQuota(
      req,
      isExpert ? "ai:consult" : "ai:agent",
      isExpert ? runtimeConfig.expertDailyQuota : runtimeConfig.agentDailyQuota,
    );
  });
  if (admission) return attachAiResponseIdentity(admission, identity);

  const parsed = await observeStage("contract_validation", async () => sanitizeAiBody(body, {
      maxQuestionLength: isExpert
        ? runtimeConfig.expertMaxQuestionChars
        : runtimeConfig.agentMaxQuestionChars,
      maxHistoryItems: isExpert ? 8 : 6,
      maxHistoryItemLength: isExpert ? 1500 : 1200,
      allowedModes: ["general", "visa", "documents", "appeal", "business"],
    }));
  if (parsed.error) return attachAiResponseIdentity(parsed.error, identity);

  const principalSessionId = await observeStage("auth", async () => {
    const session = verifyChatSessionToken(req.cookies.get(CHAT_SESSION_COOKIE)?.value);
    return session?.sessionId || identity.requestId;
  });
  const context = requestContext(
    req,
    parsed.value.lang as Lang,
    routing.capability,
    runtimeConfig,
    identity,
    principalSessionId,
  );
  const result = await runUnifiedAiUseCase({
      context,
      question: parsed.value.question,
      history: parsed.value.history,
      leadId: parsed.value.leadId,
      previousCapability: previousCapability(body.previousCapability),
      previousExpertMode: previousExpertMode(body.previousExpertMode),
    }, {
      resolveStudentProfileId: currentAuthenticatedStudentProfileId,
      reportProgress: options.reportProgress,
      reportVerifiedDelta: options.reportVerifiedDelta,
      runtimeConfig,
      observeStage,
    });

  if (!result.ok) {
    const label = result.error.code === "llm_unavailable"
      ? "LLM backend unavailable"
      : result.error.code === "retrieval_unavailable"
        ? "RAG retrieval unavailable"
        : result.error.message;
    return attachAiResponseIdentity(NextResponse.json({
      error: label,
      message: result.error.message,
      detail: result.error.detail,
      requestId: context.requestId,
      traceId: context.traceId,
      routing,
    }, { status: applicationStatus(result.error) }), identity);
  }

  if (context.principal.kind === "anonymous-session") {
    const sessionId = context.principal.sessionId;
    const normalized = record(result.value);
    const quality = record(record(normalized.meta).quality);
    const answer = text(normalized.answer);
    after(async () => {
      try {
        if (!answer) return;
        await observeDetachedAiStage({
          context,
          operation: `unified-${routing.capability}`,
          stage: "chat.transaction",
          run: () => persistChatExchange({
          requestId: context.requestId,
          idempotencyKey: context.idempotencyKey,
          sessionKey: sessionId,
          tenantContext: context.tenantContext,
          locale: context.locale,
          source: "kaxi-site",
          question: parsed.value.question,
          answer,
          needsHuman: boolean(normalized.needsHumanExpert),
          provenance: {
            workflowId: "kaxi-unified-chat",
            workflowVersionId: "kaxi-unified-chat@2026-08-13.v2",
            modelVersion: text(quality.backend) || "unknown",
            promptVersion: `kaxi-unified-${routing.capability}@v2`,
          },
          sources: record(normalized.meta).sources,
          searchMeta: quality,
          }),
        });
      } catch (error) {
        console.warn("[unified chat persistence]", error instanceof Error ? error.message : error);
      }
    });
  }

  return attachAiResponseIdentity(NextResponse.json({
    ...result.value,
    requestId: context.requestId,
    traceId: context.traceId,
  }), identity);
}

export async function runUnifiedAiHttpAdapter(
  req: NextRequest,
  suppliedBody?: Record<string, unknown>,
  options: {
    reportProgress?: (stage: "routing" | "searching" | "generating" | "finalizing") => void;
    reportVerifiedDelta?: (delta: string) => void;
  } = {},
) {
  const identity = createAiHttpRequestIdentity(req.headers);
  try {
    return await observeAiHttpRequest({
      identity,
      operation: "unified-ai",
      run: (observeStage) => runUnifiedAiHttpAdapterObserved(
        req,
        suppliedBody,
        options,
        identity,
        observeStage,
      ),
    });
  } catch (error) {
    console.error("[unified AI HTTP adapter]", error);
    return attachAiResponseIdentity(NextResponse.json({
      error: "Internal error",
      requestId: identity.requestId,
      traceId: identity.traceId,
    }, { status: 500 }), identity);
  }
}
