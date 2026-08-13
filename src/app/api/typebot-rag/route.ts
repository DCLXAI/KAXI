import { runtimeEnvironment } from "@/infrastructure/config/runtime-environment";
import { after, NextRequest, NextResponse } from "next/server";
import { parseLimit, rateLimit } from "@/lib/api/security";
import { JsonBodyError, readJsonBody } from "@/lib/api/json-body";
import { persistChatExchange } from "@/lib/chat/persistence";
import { persistAtomicChatTurn } from "@/infrastructure/chat/prisma-chat-unit-of-work";
import { CHAT_SESSION_COOKIE, verifyChatSessionToken } from "@/lib/chat/session-token";
import { getReadyChatAttachmentsForRuntime } from "@/lib/chat/attachment-status";
import { inferChatCategory } from "@/lib/chat/category";
import { loadChatSessionSnapshot } from "@/lib/chat/history";
import {
  extractProfileSignals,
  fillSessionProfile,
  fillSessionProfileOverAccount,
  hasProfileFacts,
  mergeSessionProfile,
  parseSessionProfile,
  resolveSessionProfileMetadata,
} from "@/lib/chat/session-profile";
import {
  accountEligibleSignals,
  sessionProfileToStudentFills,
  studentFieldsToSessionSignals,
  type StudentChatProfileFields,
} from "@/lib/chat/account-profile";
import {
  fillStudentChatProfile,
  loadStudentChatProfile,
  resolveLoggedInStudentId,
} from "@/lib/chat/account-profile-repository";
import {
  clarificationNextStep,
  isTemplateClarification,
  mediateRagQuestion,
  questionMediationMetadata,
  questionMediationProvenance,
  type QuestionMediation,
} from "@/lib/chat/question-mediator";
import { generateLlmClarification } from "@/lib/chat/clarification-writer";
import {
  DIRECT_LEXICAL_PROVENANCE,
  DIRECT_LEXICAL_RUNTIME_PATH,
  DIRECT_HYBRID_RUNTIME_PATH,
} from "@/lib/chat/direct-lexical-fallback";
import { runRagAnswerUseCase } from "@/application/ai/rag-answer";
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
import { createTypebotHandoffToken } from "@/lib/n8n/signature";
import {
  n8nQuestionPlan,
  ragRuntimePrimary,
  requestN8nRuntime,
  shouldRetryN8nNoContext,
} from "@/lib/n8n/typebot-runtime";
import { recordOpsEvent } from "@/lib/ops/events";
import { verifyTypebotGatewayHeaders } from "@/lib/typebot/gateway-auth";
import { recordServerProductEvent } from "@/lib/analytics/server";
import { requestTraceContext } from "@/infrastructure/observability/trace-context";
import { withSpan } from "@/infrastructure/observability/tracing";
import {
  PLATFORM_TENANT_ID,
  platformAnonymousTenantContext,
} from "@/application/tenancy/tenant-context";

export const maxDuration = 60;

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

async function ragRateLimitJson(
  response: NextResponse,
  correlation?: { requestId: string; traceId: string; traceparent: string },
) {
  const payload = await response.json().catch(() => ({ error: "Rate limit unavailable" }));
  const body = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : { error: "Rate limit unavailable" };
  const headers = new Headers();
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) headers.set("retry-after", retryAfter);
  if (correlation) {
    headers.set("x-request-id", correlation.requestId);
    headers.set("traceparent", correlation.traceparent);
  }
  return ragJson({
    ...body,
    ...(correlation ? { requestId: correlation.requestId, traceId: correlation.traceId } : {}),
  }, { status: response.status, headers });
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

export async function POST(req: NextRequest) {
  let trackChatProductEvent: ((
    eventName: "chatbot_question_sent" | "chatbot_answer_succeeded" | "chatbot_answer_failed" | "chatbot_no_context" | "chatbot_retry" | "chatbot_fallback",
    properties?: Record<string, string | number | boolean | null>,
  ) => void) | null = null;
  const trace = requestTraceContext(req.headers);

  try {
    const body = await readJsonBody<Record<string, unknown>>(req, 64 * 1024);
    const question = normalizeText(body?.question, 1200);
    const sessionId = normalizeText(body?.sessionId, 120);
    const locale = normalizeLocale(body?.locale);
    const source = normalizeSource(body?.source);
    const typebotResultId = normalizeText(body?.typebotResultId, 120);
    const deterministicCategory = inferChatCategory(question, body?.category);
    const attachments = normalizeAttachments(body?.attachments);

    const startedAt = Date.now();
    const identity = createChatRequestIdentity({ requestId: body?.requestId, source, sessionId, question });
    const correlation = {
      requestId: identity.requestId,
      traceId: trace.traceId,
      traceparent: trace.traceparent,
    };
    const limited = await withSpan({
      name: "rag.rate_limit",
      parent: trace,
      attributes: { requestId: identity.requestId, channel: source, tenantId: PLATFORM_TENANT_ID },
      run: () => rateLimit(req, {
        key: "typebot-rag",
        limit: parseLimit(runtimeEnvironment().TYPEBOT_RAG_RATE_LIMIT, 20),
        windowMs: 60 * 1000,
      }),
    });
    if (limited) return ragRateLimitJson(limited, correlation);
    if (!question || !sessionId) {
      return ragJson({
        error: "question and sessionId are required",
        requestId: identity.requestId,
        traceId: trace.traceId,
      }, { status: 400, headers: { "x-request-id": identity.requestId, traceparent: trace.traceparent } });
    }
    const authorization = await withSpan({
      name: "rag.auth",
      parent: trace,
      attributes: { requestId: identity.requestId, channel: source, tenantId: PLATFORM_TENANT_ID },
      run: async () => {
        const tenantContext = platformAnonymousTenantContext(sessionId);
        if (source === "typebot" && (!typebotResultId || sessionId !== `typebot-${typebotResultId}`)) {
          return { error: ragJson({ error: "Invalid Typebot session", requestId: identity.requestId, traceId: trace.traceId }, { status: 400, headers: { "x-request-id": identity.requestId, traceparent: trace.traceparent } }) };
        }
        if (source === "typebot" && !verifyTypebotGatewayHeaders(req.headers)) {
          return { error: ragJson({ error: "Unauthorized Typebot gateway", requestId: identity.requestId, traceId: trace.traceId }, { status: 401, headers: { "x-request-id": identity.requestId, traceparent: trace.traceparent } }) };
        }
        if (source === "typebot" && attachments.length > 0) {
          return { error: ragJson({ error: "Typebot attachments are not supported by this gateway", requestId: identity.requestId, traceId: trace.traceId }, { status: 400, headers: { "x-request-id": identity.requestId, traceparent: trace.traceparent } }) };
        }
        if (source === "kaxi-site" && !verifyChatSessionToken(req.cookies.get(CHAT_SESSION_COOKIE)?.value, sessionId)) {
          return { error: ragJson({ error: "Invalid or expired chat session", requestId: identity.requestId, traceId: trace.traceId }, { status: 401, headers: { "x-request-id": identity.requestId, traceparent: trace.traceparent } }) };
        }
        let verifiedAttachments = attachments;
        if (source === "kaxi-site" && attachments.length > 0) {
          try {
            verifiedAttachments = await getReadyChatAttachmentsForRuntime(tenantContext, sessionId, attachments);
          } catch (error) {
            console.warn("[POST /api/typebot-rag] attachment validation failed", error);
            return { error: ragJson({ error: "Attachment is not ready or does not belong to this session", requestId: identity.requestId, traceId: trace.traceId }, { status: 409, headers: { "x-request-id": identity.requestId, traceparent: trace.traceparent } }) };
          }
        }
        return { tenantContext, verifiedAttachments };
      },
    });
    if ("error" in authorization) return authorization.error;
    const { tenantContext, verifiedAttachments } = authorization;
    trackChatProductEvent = (
      eventName: "chatbot_question_sent" | "chatbot_answer_succeeded" | "chatbot_answer_failed" | "chatbot_no_context" | "chatbot_retry" | "chatbot_fallback",
      properties: Record<string, string | number | boolean | null> = {},
    ) => {
      after(() => recordServerProductEvent({
        eventName,
        sessionId,
        locale,
        surface: source === "typebot" ? "typebot_bubble" : "kaxi_chat",
        properties,
      }).catch((analyticsError) => {
        console.warn("[POST /api/typebot-rag] product analytics failed", analyticsError);
      }));
    };
    trackChatProductEvent("chatbot_question_sent", { category: deterministicCategory });
    let conversationHistory: Array<{ question: string; answer: string }> = [];
    let sessionMetadata: Record<string, unknown> = {};
    let profile = parseSessionProfile(null);
    let snapshotLoaded = false;
    let turnIndex = 1;
    let studentId: string | null = null;
    let accountRow: StudentChatProfileFields | null = null;
    try {
      const snapshot = await loadChatSessionSnapshot(tenantContext, sessionId, {
        source,
        messageLimit: 4,
        attachmentLimit: 1,
      });
      sessionMetadata = (snapshot?.metadata && typeof snapshot.metadata === "object")
        ? { ...snapshot.metadata }
        : {};
      profile = parseSessionProfile(sessionMetadata.profile);
      conversationHistory = (snapshot?.messages || [])
        .filter((message) => message.status === "completed" && message.question && message.answer)
        .slice(-3)
        .map((message) => ({ question: message.question, answer: message.answer }));
      snapshotLoaded = true;
    } catch (historyError) {
      console.warn("[POST /api/typebot-rag] conversation history unavailable", historyError);
    }
    turnIndex = conversationHistory.length + 1;
    // Account-linkage read-back lives in its own guard, independent of the
    // history try above: linking a logged-in student's account must NEVER
    // escalate to the outer 500 handler (the feature's core promise is that
    // account linkage never blocks or fails the chat). The `accountRow` fetched
    // here is reused by the write-time link below — one fetch per turn.
    try {
      studentId = await resolveLoggedInStudentId();
      if (studentId) {
        accountRow = await loadStudentChatProfile(studentId);
        if (accountRow) {
          // Read-back is fill-only: account values seed the session only where the
          // session profile has nothing yet; session-stated values keep priority.
          // Stamped source "account" (not "deterministic") so a value the
          // student states or the mediator resolves THIS turn can still
          // overwrite a stale account seed (see fillSessionProfileOverAccount
          // below) instead of being permanently blocked by it.
          profile = fillSessionProfile(profile, studentFieldsToSessionSignals(accountRow), turnIndex, "account");
        }
      }
    } catch (linkError) {
      console.warn("[POST /api/typebot-rag] account-linkage read-back failed", linkError);
      studentId = null;
      accountRow = null;
    }
    try {
      profile = mergeSessionProfile(profile, extractProfileSignals(question, locale), turnIndex, "deterministic");
    } catch (profileError) {
      console.warn("[POST /api/typebot-rag] profile extraction failed", profileError);
    }
    const mediation = await withSpan({
      name: "rag.mediation",
      parent: trace,
      attributes: { requestId: identity.requestId, channel: source, tenantId: PLATFORM_TENANT_ID },
      run: () => mediateRagQuestion({
        question,
        locale,
        deterministicCategory,
        conversationHistory,
        profile,
      }),
    });
    if (mediation.profileSignals) {
      // Fill-over-account: a genuine session-stated value (deterministic or
      // mediation, this turn or a prior one) always wins ties; only a stale
      // account read-back seed may be overwritten by what the mediator
      // resolves this turn.
      profile = fillSessionProfileOverAccount(profile, mediation.profileSignals, turnIndex, "mediation");
    }
    // Account-linkage write-time link, in its own guard (same "never 500 from
    // linkage" contract as the read-back). Reuses the `accountRow` fetched at
    // read-back rather than re-querying the row. Deferred via after() so the
    // account UPDATE runs post-response and can never add latency to the
    // turn; only accountEligibleSignals() (this-turn, deterministic facts)
    // ever reaches the account, so a prior visitor's session state or an
    // LLM-mediated guess can never be written here.
    after(async () => {
      try {
        if (studentId && accountRow) {
          await fillStudentChatProfile(
            studentId,
            sessionProfileToStudentFills(accountEligibleSignals(profile, turnIndex), accountRow),
          );
        }
      } catch (linkError) {
        console.warn("[POST /api/typebot-rag] account-linkage write-time failed", linkError);
      }
    });
    // If the snapshot load failed above, we never loaded the prior metadata to
    // merge onto, so persisting here would overwrite (not merge) the stored
    // chat_sessions.metadata column. resolveSessionProfileMetadata returns
    // undefined in that case, leaving the existing row's metadata untouched
    // instead of clobbering it.
    const sessionMetadataWithProfile = resolveSessionProfileMetadata({
      snapshotLoaded,
      priorMetadata: sessionMetadata,
      profile,
    });
    const category = mediation.category;

    const n8nRequest = {
      ...n8nQuestionPlan(question, mediation),
      sessionId,
      tenant_id: PLATFORM_TENANT_ID,
      category,
      source,
      locale,
      typebotResultId: typebotResultId || undefined,
      requestId: identity.requestId,
      idempotencyKey: identity.idempotencyKey,
      externalRequestId: identity.externalRequestId,
      traceId: trace.traceId,
      traceparent: trace.traceparent,
      attachments: verifiedAttachments,
      conversationContext: conversationHistory,
      profile: hasProfileFacts(profile) ? profile : undefined,
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
          tenantContext,
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
          sessionMetadata: sessionMetadataWithProfile,
        });
      } catch (persistError) {
        console.error("[POST /api/typebot-rag] failure persistence failed", persistError);
      }
    };

    const recordGatewayOpsEvent = async (
      eventType: string,
      message: string,
      provenance: RagProvenance,
      executionId?: string,
      payload: Record<string, unknown> = {},
      severity: "warning" | "error" = "error",
    ) => {
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
    };

    const reportOpsEventAsync = (...args: Parameters<typeof recordGatewayOpsEvent>) => {
      after(() => recordGatewayOpsEvent(...args));
    };

    const runCanonicalRag = async (fallbackReason: string, allowStoredVectorExpansion?: boolean) => {
      const applicationResult = await runRagAnswerUseCase({
        context: {
          requestId: identity.requestId,
          idempotencyKey: identity.idempotencyKey,
          principal: { kind: "anonymous-session", sessionId },
          tenantContext,
          locale,
          channel: "typebot",
          traceId: trace.traceId,
          traceparent: trace.traceparent,
          signal: req.signal,
          deadlineAt: startedAt + 55_000,
        },
        question,
        retrievalQuery: mediation.searchQuery,
        category,
        fallbackReason,
        attachmentCount: verifiedAttachments.length,
        allowStoredVectorExpansion,
        requireOpenAiEmbedding: true,
        mediation,
        conversationHistory,
        profile,
      }, {
        observeStage: (stage, run) => withSpan({
          name: `rag.${stage}`,
          parent: trace,
          attributes: { requestId: identity.requestId, channel: source, tenantId: PLATFORM_TENANT_ID },
          run: () => run(),
        }),
      });
      if (!applicationResult.ok) {
        throw new Error(`${applicationResult.error.code}:${applicationResult.error.detail || applicationResult.error.message}`);
      }
      return applicationResult.value;
    };

    let upstreamPayload: GuardedChatResponse;
    let provenance: RagProvenance;
    let runtimeRecoveryReason: string | null = null;
    if (mediation.action === "clarify") {
      provenance = questionMediationProvenance(mediation);
      let clarificationAnswer = mediation.clarificationQuestion;
      let clarificationStep = clarificationNextStep(locale);
      let clarificationSource: "llm" | "template" =
        mediation.status === "llm" && !isTemplateClarification(clarificationAnswer, locale)
          ? "llm"
          : "template";
      let clarificationMeta: Record<string, unknown> = {};
      if (clarificationSource === "template") {
        const written = await generateLlmClarification({ question, locale, profile });
        if (written) {
          clarificationAnswer = written.question;
          if (written.nextStep) clarificationStep = written.nextStep;
          clarificationSource = "llm";
          clarificationMeta = {
            clarificationBackend: written.backend,
            clarificationModel: written.model,
            clarificationLatencyMs: written.durationMs,
          };
        }
      }
      upstreamPayload = {
        answer: clarificationAnswer,
        nextStep: clarificationStep,
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
          clarificationSource,
          ...clarificationMeta,
        },
        executionId: `mediator-${identity.requestId}`,
        runtimePath: "kaxi-question-mediator",
        ...provenance,
      };
    } else if (ragRuntimePrimary() === "direct") {
      try {
        upstreamPayload = await runCanonicalRag("kaxi_direct_primary", false);
        provenance = resolveRagProvenance(upstreamPayload);
      } catch (directError) {
        console.warn("[POST /api/typebot-rag] direct primary failed; trying n8n backup", directError);
        const n8nAttempt = await requestN8nRuntime(n8nRequest, { traceparent: trace.traceparent });
        if (n8nAttempt.ok) {
          runtimeRecoveryReason = "direct_primary_failed";
          upstreamPayload = n8nAttempt.payload;
          provenance = n8nAttempt.provenance;
          reportOpsEventAsync(
            "direct_runtime_n8n_backup_succeeded",
            "KARXY served the request through the signed n8n backup runtime.",
            provenance,
            upstreamPayload.executionId,
            {
              runtimePath: upstreamPayload.runtimePath,
              directError: directError instanceof Error ? directError.message.slice(0, 240) : "unknown",
            },
            "warning",
          );
        } else {
          const directExecutionId = `direct-${identity.requestId}`;
          await persistFailure("rag_runtime_unavailable", DIRECT_LEXICAL_PROVENANCE, directExecutionId);
          trackChatProductEvent("chatbot_answer_failed", { category, stage: "runtime", reason: "all_runtimes_failed" });
          reportOpsEventAsync(
            "rag_runtime_unavailable",
            "Both the KARXY direct runtime and n8n backup runtime failed.",
            DIRECT_LEXICAL_PROVENANCE,
            directExecutionId,
            {
              runtimePath: "unavailable",
              attemptedRuntimePaths: [DIRECT_HYBRID_RUNTIME_PATH, DIRECT_LEXICAL_RUNTIME_PATH, "n8n-workflow"],
              n8nFallbackReason: n8nAttempt.fallbackReason,
              n8nHttpStatus: n8nAttempt.httpStatus,
              directError: directError instanceof Error ? directError.message.slice(0, 240) : "unknown",
            },
          );
          return ragJson({
            error: "RAG runtime unavailable",
            runtimePath: "unavailable",
            attemptedRuntimePaths: [DIRECT_HYBRID_RUNTIME_PATH, DIRECT_LEXICAL_RUNTIME_PATH, "n8n-workflow"],
          }, { status: 502 }, DIRECT_LEXICAL_PROVENANCE);
        }
      }
    } else {
      const n8nAttempt = await requestN8nRuntime(n8nRequest, { traceparent: trace.traceparent });
      const n8nNeedsCanonicalRetry = n8nAttempt.ok && shouldRetryN8nNoContext(n8nAttempt.payload);
      const fallbackReason = n8nAttempt.ok ? "n8n_no_context" : n8nAttempt.fallbackReason;
      const fallbackHttpStatus = n8nAttempt.ok ? 200 : n8nAttempt.httpStatus;
      const fallbackExecutionId = n8nAttempt.ok ? n8nAttempt.payload.executionId : n8nAttempt.executionId;

      if (n8nAttempt.ok && !n8nNeedsCanonicalRetry) {
        upstreamPayload = n8nAttempt.payload;
        provenance = n8nAttempt.provenance;
      } else {
        runtimeRecoveryReason = fallbackReason;
        console.warn("[POST /api/typebot-rag] using canonical Supabase fallback", {
          reason: fallbackReason,
          httpStatus: fallbackHttpStatus,
        });
        try {
          upstreamPayload = await runCanonicalRag(fallbackReason);
          provenance = resolveRagProvenance(upstreamPayload);
          reportOpsEventAsync(
            "n8n_runtime_fallback_succeeded",
            "KARXY served the mediated request through its direct Supabase RAG fallback.",
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
              "The mediated canonical Supabase retry failed, so KARXY retained the n8n no-context response.",
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
            trackChatProductEvent("chatbot_answer_failed", { category, stage: "runtime", reason: "all_runtimes_failed" });
            reportOpsEventAsync(
              "rag_runtime_unavailable",
              "Both the n8n runtime and KARXY direct Supabase fallback failed.",
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
    // Retrieval responses already passed the shared Application guardrail in
    // runRagAnswerUseCase (including the signed n8n path). Clarification is the
    // only locally constructed response and therefore the only adapter-owned
    // guardrail invocation.
    const guardedPayload = mediation.action === "clarify"
      ? applyChatResponseGuardrail(upstreamPayload, question, locale)
      : upstreamPayload;
    const normalizedPayload = { ...guardedPayload, ...provenance };

    let storedMessageId: string | undefined;
    let persistenceMode: string | undefined;
    let handoffTaskPersisted = false;
    let persistenceAccepted = false;
    const persistSuccessfulExchange = async () => {
      try {
        const needsHuman = normalizeBoolean(normalizedPayload.needsHuman);
        const riskLevel = typeof normalizedPayload.riskLevel === "string" ? normalizedPayload.riskLevel : "low";
        const requiredState = await withSpan({
          name: "chat.transaction",
          parent: trace,
          attributes: { requestId: identity.requestId, channel: source, tenantId: PLATFORM_TENANT_ID },
          run: () => persistAtomicChatTurn({
          requestId: identity.requestId,
          idempotencyKey: identity.idempotencyKey,
          traceId: trace.traceId,
          sessionKey: sessionId,
          tenantContext,
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
          sessionMetadata: sessionMetadataWithProfile,
          }),
        });
        storedMessageId = requiredState.id.toString();
        persistenceMode = requiredState.mode;
        handoffTaskPersisted = requiredState.handoffTaskPersisted;
        return requiredState.persistenceAccepted;
      } catch (persistError) {
        console.error("[POST /api/typebot-rag] chat persistence failed", persistError);
        await recordGatewayOpsEvent(
          "chat_persistence_failed",
          "A chatbot exchange could not be persisted.",
          provenance,
          normalizedPayload.executionId,
        );
        return false;
      }
    };

    // Typebot branches on this value, so acknowledge persistence only after the
    // canonical message (and required handoff task) has actually been written.
    persistenceAccepted = await persistSuccessfulExchange();
    const responseSearchMeta = normalizedPayload.searchMeta && typeof normalizedPayload.searchMeta === "object"
      ? normalizedPayload.searchMeta as Record<string, unknown>
      : {};
    const noContext = responseSearchMeta.noContext === true;
    trackChatProductEvent(noContext ? "chatbot_no_context" : "chatbot_answer_succeeded", {
      category,
      persisted: persistenceAccepted,
      needsHuman: normalizeBoolean(normalizedPayload.needsHuman),
      sourceCount: Array.isArray(normalizedPayload.sources) ? normalizedPayload.sources.length : 0,
    });
    const answerMode = typeof responseSearchMeta.answerMode === "string" ? responseSearchMeta.answerMode : "unknown";
    const answerAttempts = Number(responseSearchMeta.answerAttempts || 0);
    const providerAttempts = Number(responseSearchMeta.answerProviderAttempts || 0);
    const mediationAttempts = Number(responseSearchMeta.mediationAttempts || 0);
    if (runtimeRecoveryReason || answerAttempts > 1 || providerAttempts > 1 || mediationAttempts > 1) {
      trackChatProductEvent("chatbot_retry", {
        category,
        stage: runtimeRecoveryReason ? "runtime" : providerAttempts > 1 ? "provider" : answerAttempts > 1 ? "answer" : "mediation",
        attempts: Math.max(answerAttempts, providerAttempts, mediationAttempts, runtimeRecoveryReason ? 2 : 0),
      });
    }
    if (runtimeRecoveryReason || answerMode.includes("fallback") || responseSearchMeta.serviceDegraded === true) {
      trackChatProductEvent("chatbot_fallback", {
        category,
        mode: answerMode.slice(0, 80),
        reason: (runtimeRecoveryReason || String(responseSearchMeta.answerGenerationFailureReason || "degraded_answer")).slice(0, 120),
        degraded: responseSearchMeta.serviceDegraded === true,
      });
    }

    const handoffToken = source === "typebot" ? createTypebotHandoffToken(sessionId) : undefined;
    return ragJson({
      ...normalizedPayload,
      requestId: identity.requestId,
      handoffToken,
      persisted: persistenceAccepted,
      persistenceAccepted,
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
    trackChatProductEvent?.("chatbot_answer_failed", { stage: "gateway", reason: "internal_error" });
    return ragJson({ error: "Internal error" }, { status: 500 });
  }
}
