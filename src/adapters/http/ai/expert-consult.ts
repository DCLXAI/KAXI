import { NextRequest, NextResponse } from "next/server";
import {
  consumeDailyQuota,
  getClientIp,
  rateLimit,
  sanitizeAiBody,
} from "@/lib/api/security";
import { currentAuthenticatedStudentProfileId } from "@/lib/cases/current-student";
import { CHAT_SESSION_COOKIE, verifyChatSessionToken } from "@/lib/chat/session-token";
import {
  runExpertConsultUseCase,
  type ExpertMode,
} from "@/application/ai/expert-consult";
import type { AiRequestContext, ApplicationError } from "@/application/ai/contracts";
import type { Lang } from "@/lib/i18n/translations";
import { platformAnonymousTenantContext } from "@/application/tenancy/tenant-context";
import { getApplicationAiRuntimeConfig } from "@/infrastructure/config/application-ai-config";
import {
  attachAiResponseIdentity,
  createAiHttpRequestIdentity,
  observeAiHttpRequest,
  type AiHttpRequestIdentity,
} from "@/adapters/http/ai/trace-observer";
import type { ApplicationAiRuntimeConfig } from "@/application/ai/runtime-config";

const EXPERT_MODES: ExpertMode[] = ["general", "visa", "documents", "appeal", "business"];

function applicationStatus(error: ApplicationError): number {
  if (error.code === "invalid_input") return 400;
  if (error.code === "cancelled") return 499;
  if (error.code === "deadline_exceeded") return 504;
  if (error.code === "llm_unavailable" || error.code === "retrieval_unavailable") return 503;
  return 500;
}

function requestToken(req: NextRequest, header: string): string | null {
  const value = req.headers.get(header)?.trim();
  return value ? value.slice(0, 128) : null;
}

function expertRequestContext(
  req: NextRequest,
  locale: Lang,
  runtimeConfig: ApplicationAiRuntimeConfig,
  identity: AiHttpRequestIdentity,
  principalSessionId: string,
): AiRequestContext {
  return {
    requestId: identity.requestId,
    idempotencyKey: requestToken(req, "idempotency-key") || `consult-${identity.requestId}`,
    principal: { kind: "anonymous-session", sessionId: principalSessionId },
    tenantContext: platformAnonymousTenantContext(principalSessionId),
    locale,
    channel: "web",
    traceId: identity.traceId,
    traceparent: identity.traceparent,
    clientIp: getClientIp(req),
    signal: req.signal,
    deadlineAt: Date.now() + runtimeConfig.expertRequestDeadlineMs,
  };
}

export async function runExpertConsultHttpAdapter(
  req: NextRequest,
  suppliedBody?: Record<string, unknown>,
) {
  const identity = createAiHttpRequestIdentity(req.headers);
  try {
    return await observeAiHttpRequest({
      identity,
      operation: "expert-consult",
      run: async (observeStage) => {
        const runtimeConfig = getApplicationAiRuntimeConfig();
        const admission = await observeStage("rate_limit", async () => {
          const limited = await rateLimit(req, {
            key: "ai:consult",
            limit: runtimeConfig.expertRateLimit,
            windowMs: 60 * 1000,
          });
          if (limited) return limited;
          return consumeDailyQuota(req, "ai:consult", runtimeConfig.expertDailyQuota);
        });
        if (admission) return attachAiResponseIdentity(admission, identity);

        const parsed = await observeStage("validation", async () => {
          const body = suppliedBody || await req.json();
          return sanitizeAiBody(body || {}, {
            maxQuestionLength: runtimeConfig.expertMaxQuestionChars,
            maxHistoryItems: 8,
            maxHistoryItemLength: 1500,
            allowedModes: EXPERT_MODES,
          });
        });
        if (parsed.error) return attachAiResponseIdentity(parsed.error, identity);

        const principalSessionId = await observeStage("auth", async () => {
          const session = verifyChatSessionToken(req.cookies.get(CHAT_SESSION_COOKIE)?.value);
          return session?.sessionId || identity.requestId;
        });
        const context = expertRequestContext(
          req,
          parsed.value.lang as Lang,
          runtimeConfig,
          identity,
          principalSessionId,
        );
        const result = await runExpertConsultUseCase({
          context,
          question: parsed.value.question,
          history: parsed.value.history,
          mode: (parsed.value.mode || "general") as ExpertMode,
        }, {
          resolveStudentProfileId: currentAuthenticatedStudentProfileId,
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
            backend: result.error.code === "llm_unavailable" ? "llm-unavailable" : undefined,
            requestId: context.requestId,
            traceId: context.traceId,
          }, { status: applicationStatus(result.error) }), identity);
        }

        return attachAiResponseIdentity(NextResponse.json({
          ...result.value,
          requestId: context.requestId,
          traceId: context.traceId,
        }), identity);
      },
    });
  } catch (error) {
    console.error("[expert consult HTTP adapter]", error);
    return attachAiResponseIdentity(NextResponse.json({
      error: "Internal error",
      requestId: identity.requestId,
      traceId: identity.traceId,
    }, { status: 500 }), identity);
  }
}
