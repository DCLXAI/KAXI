import { NextRequest, NextResponse } from "next/server";
import type { Lang } from "@/lib/i18n/translations";
import { canWriteRuntimeDatabase, db } from "@/lib/db";
import { runAgent } from "@/lib/agent/agent";
import { runFallbackAgent } from "@/lib/agent/fallback";
import type { ToolContext } from "@/lib/agent/tools";
import { buildAgentMeta } from "@/lib/agent/meta";
import { runAgentPreflight, type AgentPreflightResult } from "@/lib/agent/preflight";
import { getAiBackendDiagnostics, shouldRequireAgentLlm } from "@/lib/ai/backend-selector";
import { isClaudeNotConfiguredError } from "@/lib/ai/claude-gateway";
import {
  consumeDailyQuota,
  getClientIp,
  parseLimit,
  parsePositiveInt,
  rateLimit,
  sanitizeAiBody,
  withTimeout,
} from "@/lib/api/security";
import { canPersistChatQuestion, protectChatQuestion } from "@/lib/privacy/chat-log";
import { isPiiEncryptionConfigured } from "@/lib/privacy/pii";
import { isEnvFalse, isEnvTrue } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 60;

function llmUnavailableResponse(message: string) {
  return NextResponse.json(
    {
      error: "LLM backend unavailable",
      message: "Claude LLM gateway is unavailable. Built-in tool fallback is disabled for this deployment.",
      detail: message.slice(0, 500),
      backend: "llm-unavailable",
    },
    { status: 503 }
  );
}

function emptyPreflight(question: string): AgentPreflightResult {
  return {
    enabled: false,
    groundedQuestion: question,
    groundingContext: "",
    steps: [],
    toolResults: [],
  };
}

function shouldPersistAgentLog(): boolean {
  if (isEnvFalse(process.env.AI_AGENT_LOGGING_ENABLED)) return false;
  return canWriteRuntimeDatabase();
}

function shouldPersistAgentLedger(): boolean {
  if (isEnvFalse(process.env.AI_AGENT_LEDGER_ENABLED)) return false;
  return canWriteRuntimeDatabase();
}

function estimateTokens(question: string, answer: string, preflight: AgentPreflightResult): number {
  const groundedContextChars = preflight.groundingContext.length;
  return Math.max(1, Math.ceil((question.length + answer.length + groundedContextChars) / 4));
}

async function persistAgentLog({
  lang,
  question,
  answer,
  backend,
  preflight,
  steps,
  toolResults,
  iterations,
}: {
  lang: Lang;
  question: string;
  answer: string;
  backend: string;
  preflight: AgentPreflightResult;
  steps: Array<{ type: string; content: string }>;
  toolResults: Array<{ tool: string; summary: string; success: boolean }>;
  iterations: number;
}) {
  if (!shouldPersistAgentLog() || !canPersistChatQuestion(question)) return;

  try {
    const protectedQuestion = protectChatQuestion(question);
    await db.chatLog.create({
      data: {
        lang,
        ...protectedQuestion,
        answer,
        source: "agent",
        retrievedDocs: JSON.stringify({
          iterations,
          backend,
          preflight: {
            enabled: preflight.enabled,
            toolCount: preflight.toolResults.length,
            grounded: Boolean(preflight.groundingContext),
          },
          toolResults: toolResults.map((r) => ({
            tool: r.tool,
            summary: r.summary,
            success: r.success,
          })),
          steps: steps.map((s) => ({ type: s.type, content: String(s.content || "").substring(0, 200) })),
        }),
      },
    });
  } catch (logErr) {
    console.warn("[ChatLog save skipped]", logErr);
  }
}

async function persistAgentLedger({
  req,
  leadId,
  question,
  answer,
  backend,
  durationMs,
  success,
  errorType,
  errorMessage,
  preflight,
  toolCount,
}: {
  req: NextRequest;
  leadId?: string | null;
  question: string;
  answer?: string;
  backend: string;
  durationMs?: number;
  success: boolean;
  errorType?: string;
  errorMessage?: string;
  preflight: AgentPreflightResult;
  toolCount: number;
}) {
  if (!shouldPersistAgentLedger()) return;

  try {
    const finalAnswer = answer || "";
    await db.agentRequestLedger.create({
      data: {
        ip: getClientIp(req),
        userId: leadId || null,
        questionChars: question.length,
        answerChars: finalAnswer.length,
        backend,
        durationMs: durationMs ? Math.round(durationMs) : null,
        tokenEstimate: estimateTokens(question, finalAnswer, preflight),
        success,
        errorType: errorType || null,
        errorMessage: errorMessage ? errorMessage.slice(0, 500) : null,
        grounded: Boolean(preflight.groundingContext),
        toolCount,
      },
    });
  } catch (ledgerErr) {
    console.warn("[Agent ledger save skipped]", ledgerErr);
  }
}

export async function GET() {
  const backendPolicy = getAiBackendDiagnostics();
  const backendReady = backendPolicy.agent.ready && backendPolicy.issues.length === 0;

  return NextResponse.json({
    ok: backendReady,
    status: backendReady ? "ready" : "needs_configuration",
    backend: backendPolicy.agent.backend,
    runtime: {
      hosted: backendPolicy.runtime.hosted,
      vercelEnv: process.env.VERCEL_ENV || null,
      maxDuration,
    },
    claude: backendPolicy.claude,
    preflight: {
      enabled: isEnvTrue(process.env.AI_AGENT_PREFLIGHT_ENABLED),
      timeoutMs: parsePositiveInt(process.env.AI_AGENT_PREFLIGHT_TIMEOUT_MS, 12_000),
    },
    limits: {
      rateLimit: parseLimit(process.env.AI_AGENT_RATE_LIMIT, 6),
      dailyQuota: parseLimit(process.env.AI_AGENT_DAILY_QUOTA, 30),
      maxQuestionChars: parsePositiveInt(process.env.AI_AGENT_MAX_CHARS, 2000),
      timeoutMs: parsePositiveInt(process.env.AI_AGENT_TIMEOUT_MS, 45_000),
    },
    persistence: {
      writableDatabase: canWriteRuntimeDatabase(),
      chatLog: shouldPersistAgentLog(),
      ledger: shouldPersistAgentLedger(),
      piiEncryption: isPiiEncryptionConfigured(),
    },
    backendPolicy,
  });
}

export async function POST(req: NextRequest) {
  const requestStartedAt = Date.now();
  let ledgerContext: {
    question: string;
    leadId: string | null;
    preflight: AgentPreflightResult;
  } | null = null;

  try {
    const limited = await rateLimit(req, {
      key: "ai:agent",
      limit: parseLimit(process.env.AI_AGENT_RATE_LIMIT, 6),
      windowMs: 60 * 1000,
    });
    if (limited) return limited;

    const quotaExceeded = await consumeDailyQuota(req, "ai:agent", parseLimit(process.env.AI_AGENT_DAILY_QUOTA, 30));
    if (quotaExceeded) return quotaExceeded;

    const body = await req.json();
    const parsed = sanitizeAiBody(body || {}, {
      maxQuestionLength: parsePositiveInt(process.env.AI_AGENT_MAX_CHARS, 2000),
      maxHistoryItems: 6,
      maxHistoryItemLength: 1200,
    });
    if (parsed.error) return parsed.error;

    const { question, history, leadId } = parsed.value;
    const lang = parsed.value.lang as Lang;
    const ctx: ToolContext = { lang, leadId };
    ledgerContext = { question, leadId, preflight: emptyPreflight(question) };

    let preflight = emptyPreflight(question);
    if (isEnvTrue(process.env.AI_AGENT_PREFLIGHT_ENABLED)) {
      try {
        preflight = await withTimeout(
          runAgentPreflight(question, lang, ctx),
          parsePositiveInt(process.env.AI_AGENT_PREFLIGHT_TIMEOUT_MS, 12_000),
          "Agent preflight"
        );
      } catch (preflightErr) {
        console.warn("[Agent preflight skipped]", preflightErr instanceof Error ? preflightErr.message : preflightErr);
      }
    }
    ledgerContext.preflight = preflight;

    let result;
    let backend = "claude";
    let errorType: string | undefined;
    let errorMessage: string | undefined;

    try {
      result = await withTimeout(
        runAgent(preflight.groundedQuestion, lang, history, ctx),
        parsePositiveInt(process.env.AI_AGENT_TIMEOUT_MS, 45_000),
        "Claude Agent execution"
      );
    } catch (agentErr) {
      console.warn("[Claude Agent fallback]", agentErr instanceof Error ? agentErr.message : agentErr);
      if (shouldRequireAgentLlm()) {
        await persistAgentLedger({
          req,
          leadId,
          question,
          backend: "llm-unavailable",
          durationMs: Date.now() - requestStartedAt,
          success: false,
          errorType: isClaudeNotConfiguredError(agentErr) ? "claude_not_configured" : "claude_backend_unavailable",
          errorMessage: agentErr instanceof Error ? agentErr.message : "Unknown Claude error",
          preflight,
          toolCount: preflight.toolResults.length,
        });
        return llmUnavailableResponse(agentErr instanceof Error ? agentErr.message : "Unknown Claude error");
      }

      backend = "tool-fallback";
      errorType = isClaudeNotConfiguredError(agentErr) ? "claude_not_configured_fallback" : "claude_backend_fallback";
      errorMessage = agentErr instanceof Error ? agentErr.message : "Unknown Claude error";
      result = await runFallbackAgent(question, lang, ctx);
    }

    const steps = backend === "claude" ? [...preflight.steps, ...result.steps] : result.steps;
    const toolResults = backend === "claude" ? [...preflight.toolResults, ...result.toolResults] : result.toolResults;

    await persistAgentLog({
      lang,
      question,
      answer: result.answer,
      backend,
      preflight,
      steps,
      toolResults,
      iterations: result.iterations,
    });
    await persistAgentLedger({
      req,
      leadId,
      question,
      answer: result.answer,
      backend,
      durationMs: Date.now() - requestStartedAt,
      success: true,
      errorType,
      errorMessage,
      preflight,
      toolCount: toolResults.length,
    });

    return NextResponse.json({
      answer: result.answer,
      backend,
      steps,
      toolResults,
      iterations: result.iterations,
      durationMs: Date.now() - requestStartedAt,
      grounded: Boolean(preflight.groundingContext),
      meta: buildAgentMeta({
        lang,
        question,
        backend,
        grounded: Boolean(preflight.groundingContext),
        toolResults,
        durationMs: Date.now() - requestStartedAt,
      }),
    });
  } catch (e) {
    console.error("[POST /api/ai/agent]", e);
    if (ledgerContext) {
      await persistAgentLedger({
        req,
        leadId: ledgerContext.leadId,
        question: ledgerContext.question,
        backend: "unknown",
        durationMs: Date.now() - requestStartedAt,
        success: false,
        errorType: "internal_error",
        errorMessage: e instanceof Error ? e.message : "Unknown internal error",
        preflight: ledgerContext.preflight,
        toolCount: ledgerContext.preflight.toolResults.length,
      });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
