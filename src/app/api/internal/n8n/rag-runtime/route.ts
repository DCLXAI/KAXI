import { NextRequest, NextResponse } from "next/server";
import { JsonBodyError, readJsonBody } from "@/lib/api/json-body";
import { parseLimit, rateLimit } from "@/lib/api/security";
import { inferChatCategory } from "@/lib/chat/category";
import { runDirectRagFallback } from "@/lib/chat/direct-lexical-fallback";
import { parseRuntimeQuestionMediation } from "@/lib/chat/question-mediator";
import { parseSessionProfile } from "@/lib/chat/session-profile";
import {
  applyChatResponseGuardrail,
  type GuardrailLocale,
} from "@/lib/chat/response-guardrail";
import { verifyN8nVerificationReceipt } from "@/lib/n8n/signature";

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
    limit: parseLimit(process.env.N8N_RAG_CORE_RATE_LIMIT, 240),
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
    const tenantId = text(payload.tenant_id, 120) || "default";
    const requestId = text(payload.requestId, 120) || verified.claims.nonce;
    const resolvedLocale = locale(payload.locale);
    if (!question || !sessionId || tenantId !== "default") {
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
    const direct = await runDirectRagFallback({
      question,
      retrievalQuery,
      category,
      locale: resolvedLocale,
      tenantId,
      requestId,
      fallbackReason: "n8n_orchestrated_runtime",
      attachmentCount: Array.isArray(payload.attachments) ? Math.min(payload.attachments.length, 3) : 0,
      allowStoredVectorExpansion: false,
      requireOpenAiEmbedding: true,
      mediation,
      conversationHistory: conversationHistory(payload.conversationContext),
      profile: parseSessionProfile(payload.profile),
    });
    const guarded = applyChatResponseGuardrail(direct, question, resolvedLocale);
    const currentSearchMeta = record(guarded.searchMeta) || {};

    return NextResponse.json({
      ...guarded,
      runtimePath: ORCHESTRATED_RUNTIME_PATH,
      searchMeta: {
        ...currentSearchMeta,
        runtimePath: ORCHESTRATED_RUNTIME_PATH,
        retrievalRuntimePath: direct.runtimePath,
        retrievalProvenance: {
          workflowId: direct.workflowId,
          workflowVersionId: direct.workflowVersionId,
          modelVersion: direct.modelVersion,
          promptVersion: direct.promptVersion,
        },
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
