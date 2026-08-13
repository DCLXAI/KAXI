import { runtimeEnvironment } from "@/infrastructure/config/runtime-environment";
import { NextRequest, NextResponse } from "next/server";
import { JsonBodyError, readJsonBody } from "@/lib/api/json-body";
import { parseLimit, rateLimit } from "@/lib/api/security";
import { inferChatCategory } from "@/lib/chat/category";
import { runRagAnswerUseCase } from "@/application/ai/rag-answer";
import { parseRuntimeQuestionMediation } from "@/lib/chat/question-mediator";
import { parseSessionProfile } from "@/lib/chat/session-profile";
import { type GuardrailLocale } from "@/lib/chat/response-guardrail";
import { verifyN8nVerificationReceipt } from "@/lib/n8n/signature";
import { resolveProvidedEmbedding } from "@/lib/n8n/provided-query-embedding";
import { parseTraceparent, requestTraceContext } from "@/infrastructure/observability/trace-context";
import { withSpan } from "@/infrastructure/observability/tracing";
import { tenantContextFromVerifiedChannelPayload } from "@/application/tenancy/tenant-context";

export const runtime = "nodejs";
export const maxDuration = 60;

const ORCHESTRATED_RUNTIME_PATH = "n8n-kaxi-orchestrated";
const SUPPORTED_LOCALES = new Set<GuardrailLocale>(["ko", "en", "vi", "mn"]);

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function locale(value: unknown): GuardrailLocale {
  const normalized = text(value, 8).toLowerCase();
  return SUPPORTED_LOCALES.has(normalized as GuardrailLocale)
    ? normalized as GuardrailLocale
    : "ko";
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function conversationHistory(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(-3).flatMap((item) => {
    const turn = record(item);
    const question = text(turn?.question, 600);
    if (!question) return [];
    return [{ question, answer: text(turn?.answer, 1_000) }];
  });
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, {
    key: "n8n-rag-runtime",
    limit: parseLimit(runtimeEnvironment().N8N_RAG_CORE_RATE_LIMIT, 240),
    windowMs: 60 * 1000,
  });
  if (limited) return limited;

  try {
    const body = await readJsonBody<Record<string, unknown>>(req, 128 * 1024);
    const verificationToken = text(body?.verificationToken, 4_500);
    const payload = record(body?.payload);
    if (!verificationToken || !payload) {
      return NextResponse.json({ ok: false, error: "Invalid verified runtime request" }, { status: 400 });
    }

    const verified = verifyN8nVerificationReceipt(
      verificationToken,
      "typebot-runtime",
      payload,
    );
    if (!verified.ok) {
      return NextResponse.json({ ok: false, error: "Invalid or expired verification receipt" }, { status: 401 });
    }

    const question = text(payload.question, 1_200);
    const sessionId = text(payload.sessionId, 120);
    const tenantContext = tenantContextFromVerifiedChannelPayload({
      tenantId: payload.tenant_id,
      purpose: "typebot-runtime",
      nonce: verified.claims.nonce,
      verified: true,
    });
    const tenantId = tenantContext.tenantId;
    const requestId = text(payload.requestId, 120) || verified.claims.nonce;
    const inboundTrace = parseTraceparent(text(payload.traceparent, 80)) || requestTraceContext(req.headers);
    const resolvedLocale = locale(payload.locale);
    if (!question || !sessionId) {
      return NextResponse.json({ ok: false, error: "Invalid runtime payload" }, { status: 400 });
    }

    const category = inferChatCategory(question, payload.category);
    const mediation = parseRuntimeQuestionMediation(payload.mediation, {
      question,
      locale: resolvedLocale,
      category,
    });
    const retrievalQuery = text(payload.retrievalQuery, 800)
      || mediation?.searchQuery
      || question;
    // Top-level on purpose: the verification receipt binds payloadHash, so the
    // signed payload n8n forwards must stay byte-identical; the vector rides
    // outside it and is treated as untrusted data (validated below).
    const providedEmbedding = resolveProvidedEmbedding(body?.queryEmbedding);
    const applicationResult = await runRagAnswerUseCase({
      context: {
        requestId,
        idempotencyKey: text(payload.idempotencyKey, 180) || `n8n-rag-${requestId}`,
        principal: { kind: "service", service: "n8n-rag-runtime" },
        tenantContext,
        locale: resolvedLocale,
        channel: "n8n",
        traceId: inboundTrace.traceId,
        traceparent: inboundTrace.traceparent,
        signal: req.signal,
        deadlineAt: Date.now() + 55_000,
      },
      question,
      retrievalQuery,
      category,
      fallbackReason: "n8n_orchestrated_runtime",
      attachmentCount: Array.isArray(payload.attachments) ? Math.min(payload.attachments.length, 3) : 0,
      allowStoredVectorExpansion: false,
      requireOpenAiEmbedding: true,
      mediation,
      conversationHistory: conversationHistory(payload.conversationContext),
      profile: parseSessionProfile(payload.profile),
    }, {
      ...providedEmbedding.dependencies,
      observeStage: (stage, run) => withSpan({
        name: `rag.${stage}`,
        parent: inboundTrace,
        attributes: { requestId, channel: "n8n", tenantId },
        run: () => run(),
      }),
    });
    if (!applicationResult.ok) {
      return NextResponse.json({
        ok: false,
        error: applicationResult.error.message,
        code: applicationResult.error.code,
        requestId,
      }, { status: applicationResult.error.code === "retrieval_unavailable" ? 503 : 502 });
    }
    const guarded = applicationResult.value;
    const currentSearchMeta = record(guarded.searchMeta) || {};

    return NextResponse.json({
      ...guarded,
      runtimePath: ORCHESTRATED_RUNTIME_PATH,
      searchMeta: {
        ...currentSearchMeta,
        runtimePath: ORCHESTRATED_RUNTIME_PATH,
        retrievalRuntimePath: guarded.runtimePath,
        retrievalProvenance: {
          workflowId: guarded.workflowId,
          workflowVersionId: guarded.workflowVersionId,
          modelVersion: guarded.modelVersion,
          promptVersion: guarded.promptVersion,
        },
        embeddingSource: providedEmbedding.embeddingSource,
        providedEmbeddingRejected: providedEmbedding.rejectedReason,
      },
      requestId,
      sessionId,
      category,
      locale: resolvedLocale,
    });
  } catch (error) {
    if (error instanceof JsonBodyError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    console.error("[POST /api/internal/n8n/rag-runtime]", error);
    return NextResponse.json({ ok: false, error: "RAG core unavailable" }, { status: 503 });
  }
}
