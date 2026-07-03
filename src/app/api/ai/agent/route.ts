import { NextRequest, NextResponse } from "next/server";
import type { Lang } from "@/lib/i18n/translations";
import { canWriteRuntimeDatabase, db } from "@/lib/db";
import { runAgent } from "@/lib/agent/agent";
import { runFallbackAgent } from "@/lib/agent/fallback";
import type { ToolContext } from "@/lib/agent/tools";
import { buildAgentMeta } from "@/lib/agent/meta";
import { runAgentPreflight, type AgentPreflightResult } from "@/lib/agent/preflight";
import {
  getCodexRunMode,
  runCodexServerless,
  shouldRequireAdminForCodexAgent,
} from "@/lib/codex/serverless";
import { getAgentBackend, shouldRequireAgentLlm } from "@/lib/ai/backend-selector";
import {
  getRemoteCodexBridgeDiagnostics,
  isRemoteCodexBridgeEnabled,
  runRemoteCodexBridge,
} from "@/lib/codex/remote-bridge";
import {
  consumeDailyQuota,
  getClientIp,
  parseLimit,
  parsePositiveInt,
  rateLimit,
  requireAdmin,
  sanitizeAiBody,
  withTimeout,
} from "@/lib/api/security";
import { canPersistChatQuestion, protectChatQuestion } from "@/lib/privacy/chat-log";
import { isPiiEncryptionConfigured } from "@/lib/privacy/pii";
import { isEnvFalse, isEnvTrue } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 60;
const AGENT_REMOTE_BRIDGE_MAX_WAIT_MS = 52_000;

function isFallbackBackend(backend: string): boolean {
  return backend === "tool-fallback" || backend === "official-summary";
}

function llmUnavailableResponse(message: string) {
  return NextResponse.json(
    {
      error: "LLM backend unavailable",
      message: "Codex LLM bridge is unavailable. Built-in tool fallback is disabled for this deployment.",
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
  codexMode,
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
  codexMode?: string;
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
        codexMode: codexMode || null,
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
  const backend = getAgentBackend();
  const hostedRuntime = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
  const codexApiKeyConfigured = Boolean(process.env.CODEX_API_KEY || process.env.OPENAI_API_KEY);
  let codexMode: string | null = null;
  let codexReady = true;
  let codexIssue: string | null = null;

  try {
    codexMode = getCodexRunMode();
    codexReady = codexMode === "local-auth" ? !hostedRuntime : codexApiKeyConfigured;
    if (!codexReady && codexMode === "api-key") {
      codexIssue = "CODEX_API_KEY or OPENAI_API_KEY is not configured";
    }
  } catch (error) {
    codexReady = false;
    codexIssue = error instanceof Error ? error.message : "Codex mode check failed";
  }

  const remoteBridgeEnabled = isRemoteCodexBridgeEnabled();
  const remoteBridgeDiagnostics = getRemoteCodexBridgeDiagnostics();
  const backendReady =
    backend === "tool-fallback" ||
    backend === "zai" ||
    (backend === "remote-bridge" ? remoteBridgeEnabled && !remoteBridgeDiagnostics.issue : codexReady);

  return NextResponse.json({
    ok: backendReady,
    status: backendReady ? "ready" : "needs_configuration",
    backend,
    runtime: {
      hosted: hostedRuntime,
      vercelEnv: process.env.VERCEL_ENV || null,
      maxDuration,
    },
    codex: {
      mode: codexMode,
      ready: codexReady,
      apiKeyConfigured: codexApiKeyConfigured,
      localAuthAllowed: !hostedRuntime,
      issue: codexIssue,
      requireAdmin: shouldRequireAdminForCodexAgent(),
    },
    remoteBridge: remoteBridgeDiagnostics,
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
  });
}

// POST /api/ai/agent - 에이전트 대화 (도구 호출 + 다중 단계 추론)
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

    const quotaExceeded = await consumeDailyQuota(
      req,
      "ai:agent",
      parseLimit(process.env.AI_AGENT_DAILY_QUOTA, 30)
    );
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

    const configuredBackend = getAgentBackend();
    const preflightEnabled = isEnvTrue(process.env.AI_AGENT_PREFLIGHT_ENABLED);
    const shouldPreflight =
      preflightEnabled &&
      (configuredBackend === "remote-bridge" ||
        configuredBackend === "codex" ||
        isRemoteCodexBridgeEnabled());
    let preflight = emptyPreflight(question);

    if (shouldPreflight) {
      try {
        preflight = await withTimeout(
          runAgentPreflight(question, lang, ctx),
          parsePositiveInt(process.env.AI_AGENT_PREFLIGHT_TIMEOUT_MS, 12_000),
          "Agent preflight"
        );
      } catch (preflightErr) {
        console.warn(
          "[Agent preflight skipped]",
          preflightErr instanceof Error ? preflightErr.message : preflightErr
        );
      }
    }
    ledgerContext.preflight = preflight;

    if (configuredBackend === "remote-bridge" || isRemoteCodexBridgeEnabled()) {
      try {
        const remoteBridgeTimeoutMs = Math.min(
          parsePositiveInt(process.env.CODEX_REMOTE_BRIDGE_TIMEOUT_MS, AGENT_REMOTE_BRIDGE_MAX_WAIT_MS),
          AGENT_REMOTE_BRIDGE_MAX_WAIT_MS
        );
        const result = await withTimeout(
          runRemoteCodexBridge({
            question: preflight.groundedQuestion,
            lang,
            history,
            requestIp: getClientIp(req),
            timeoutMs: remoteBridgeTimeoutMs,
          }),
          remoteBridgeTimeoutMs + 500,
          "Agent remote Codex bridge"
        );
        if (isFallbackBackend(result.backend)) {
          throw new Error(`Remote Codex bridge returned fallback backend: ${result.backend}`);
        }
        const steps = [...preflight.steps, ...result.steps];
        const toolResults = [...preflight.toolResults, ...result.toolResults];
        await persistAgentLog({
          lang,
          question,
          answer: result.answer,
          backend: result.backend,
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
          backend: result.backend,
          codexMode: result.codexMode,
          durationMs: result.durationMs || Date.now() - requestStartedAt,
          success: true,
          preflight,
          toolCount: toolResults.length,
        });

        return NextResponse.json({
          answer: result.answer,
          backend: result.backend,
          codexMode: result.codexMode,
          steps,
          toolResults,
          iterations: result.iterations,
          durationMs: result.durationMs,
          grounded: Boolean(preflight.groundingContext),
          meta: buildAgentMeta({
            lang,
            question,
            backend: result.backend,
            grounded: Boolean(preflight.groundingContext),
            toolResults,
            durationMs: result.durationMs,
          }),
        });
      } catch (bridgeErr) {
        console.warn(
          "[Remote Codex bridge fallback]",
          bridgeErr instanceof Error ? bridgeErr.message : bridgeErr
        );
        if (configuredBackend === "remote-bridge") {
          if (shouldRequireAgentLlm(configuredBackend)) {
            await persistAgentLedger({
              req,
              leadId,
              question,
              backend: "llm-unavailable",
              durationMs: Date.now() - requestStartedAt,
              success: false,
              errorType: "remote_bridge_unavailable",
              errorMessage: bridgeErr instanceof Error ? bridgeErr.message : "Unknown bridge error",
              preflight,
              toolCount: preflight.toolResults.length,
            });
            return llmUnavailableResponse(
              bridgeErr instanceof Error ? bridgeErr.message : "Unknown bridge error"
            );
          }
          const fallback = await runFallbackAgent(question, lang, ctx);
          await persistAgentLog({
            lang,
            question,
            answer: fallback.answer,
            backend: "tool-fallback",
            preflight,
            steps: fallback.steps,
            toolResults: fallback.toolResults,
            iterations: fallback.iterations,
          });
          await persistAgentLedger({
            req,
            leadId,
            question,
            answer: fallback.answer,
            backend: "tool-fallback",
            durationMs: Date.now() - requestStartedAt,
            success: true,
            errorType: "remote_bridge_fallback",
            errorMessage: bridgeErr instanceof Error ? bridgeErr.message : "Unknown bridge error",
            preflight,
            toolCount: fallback.toolResults.length,
          });
          return NextResponse.json({
            answer: fallback.answer,
            backend: "tool-fallback",
            steps: fallback.steps,
            toolResults: fallback.toolResults,
            iterations: fallback.iterations,
            durationMs: Date.now() - requestStartedAt,
            grounded: Boolean(preflight.groundingContext),
            meta: buildAgentMeta({
              lang,
              question,
              backend: "tool-fallback",
              grounded: Boolean(preflight.groundingContext),
              toolResults: fallback.toolResults,
              durationMs: Date.now() - requestStartedAt,
            }),
          });
        }
      }
    }

    if (configuredBackend === "codex") {
      if (shouldRequireAdminForCodexAgent()) {
        const unauthorized = await requireAdmin(req);
        if (unauthorized) return unauthorized;
      }

      try {
        const result = await runCodexServerless({
          question: preflight.groundedQuestion,
          lang,
          history,
          timeoutMs: parsePositiveInt(process.env.CODEX_EXEC_TIMEOUT_MS, 45_000),
        });
        const steps = [
          ...preflight.steps,
          {
            type: "final_answer" as const,
            content: result.answer,
            timestamp: Date.now(),
          },
        ];
        const toolResults = preflight.toolResults;
        const backend = result.mode === "local-auth" ? "codex-cli-local" : "codex-cli";
        await persistAgentLog({
          lang,
          question,
          answer: result.answer,
          backend,
          preflight,
          steps,
          toolResults,
          iterations: 1,
        });
        await persistAgentLedger({
          req,
          leadId,
          question,
          answer: result.answer,
          backend,
          codexMode: result.mode,
          durationMs: result.durationMs || Date.now() - requestStartedAt,
          success: true,
          preflight,
          toolCount: toolResults.length,
        });

        return NextResponse.json({
          answer: result.answer,
          backend,
          codexMode: result.mode,
          steps,
          toolResults,
          iterations: 1,
          durationMs: result.durationMs,
          grounded: Boolean(preflight.groundingContext),
          meta: buildAgentMeta({
            lang,
            question,
            backend,
            grounded: Boolean(preflight.groundingContext),
            toolResults,
            durationMs: result.durationMs,
          }),
        });
      } catch (codexErr) {
        console.warn(
          "[Codex backend fallback]",
          codexErr instanceof Error ? codexErr.message : codexErr
        );
        if (shouldRequireAgentLlm(configuredBackend)) {
          await persistAgentLedger({
            req,
            leadId,
            question,
            backend: "llm-unavailable",
            durationMs: Date.now() - requestStartedAt,
            success: false,
            errorType: "codex_backend_unavailable",
            errorMessage: codexErr instanceof Error ? codexErr.message : "Unknown Codex error",
            preflight,
            toolCount: preflight.toolResults.length,
          });
          return llmUnavailableResponse(codexErr instanceof Error ? codexErr.message : "Unknown Codex error");
        }
        const fallback = await runFallbackAgent(question, lang, ctx);
        await persistAgentLog({
          lang,
          question,
          answer: fallback.answer,
          backend: "tool-fallback",
          preflight,
          steps: fallback.steps,
          toolResults: fallback.toolResults,
          iterations: fallback.iterations,
        });
        await persistAgentLedger({
          req,
          leadId,
          question,
          answer: fallback.answer,
          backend: "tool-fallback",
          durationMs: Date.now() - requestStartedAt,
          success: true,
          errorType: "codex_backend_fallback",
          errorMessage: codexErr instanceof Error ? codexErr.message : "Unknown Codex error",
          preflight,
          toolCount: fallback.toolResults.length,
        });
        return NextResponse.json({
          answer: fallback.answer,
          backend: "tool-fallback",
          steps: fallback.steps,
          toolResults: fallback.toolResults,
          iterations: fallback.iterations,
          durationMs: Date.now() - requestStartedAt,
          grounded: Boolean(preflight.groundingContext),
          meta: buildAgentMeta({
            lang,
            question,
            backend: "tool-fallback",
            grounded: Boolean(preflight.groundingContext),
            toolResults: fallback.toolResults,
            durationMs: Date.now() - requestStartedAt,
          }),
        });
      }
    }

    if (configuredBackend === "tool-fallback") {
      if (shouldRequireAgentLlm(configuredBackend)) {
        await persistAgentLedger({
          req,
          leadId,
          question,
          backend: "llm-unavailable",
          durationMs: Date.now() - requestStartedAt,
          success: false,
          errorType: "tool_fallback_configured",
          errorMessage: "AGENT_BACKEND=tool-fallback while AI_REQUIRE_LLM=true",
          preflight,
          toolCount: preflight.toolResults.length,
        });
        return llmUnavailableResponse("AGENT_BACKEND=tool-fallback while AI_REQUIRE_LLM=true");
      }
      const fallback = await runFallbackAgent(question, lang, ctx);
      await persistAgentLog({
        lang,
        question,
        answer: fallback.answer,
        backend: "tool-fallback",
        preflight,
        steps: fallback.steps,
        toolResults: fallback.toolResults,
        iterations: fallback.iterations,
      });
      await persistAgentLedger({
        req,
        leadId,
        question,
        answer: fallback.answer,
        backend: "tool-fallback",
        durationMs: Date.now() - requestStartedAt,
        success: true,
        preflight,
        toolCount: fallback.toolResults.length,
      });
      return NextResponse.json({
        answer: fallback.answer,
        backend: "tool-fallback",
        steps: fallback.steps,
        toolResults: fallback.toolResults,
        iterations: fallback.iterations,
        durationMs: Date.now() - requestStartedAt,
        grounded: Boolean(preflight.groundingContext),
        meta: buildAgentMeta({
          lang,
          question,
          backend: "tool-fallback",
          grounded: Boolean(preflight.groundingContext),
          toolResults: fallback.toolResults,
          durationMs: Date.now() - requestStartedAt,
        }),
      });
    }

    if (shouldRequireAdminForCodexAgent()) {
      const unauthorized = await requireAdmin(req);
      if (unauthorized) return unauthorized;
    }

    // 에이전트 실행. 배포 환경에 외부 AI 설정이 없으면 내장 도구 fallback으로 응답한다.
    let result;
    let backend = "zai";
    try {
      result = await withTimeout(
        runAgent(question, lang, history, ctx),
        parsePositiveInt(process.env.AI_AGENT_TIMEOUT_MS, 45_000),
        "Agent execution"
      );
    } catch (agentErr) {
      console.warn(
        "[Agent backend fallback]",
        agentErr instanceof Error ? agentErr.message : agentErr
      );
      if (shouldRequireAgentLlm(configuredBackend)) {
        await persistAgentLedger({
          req,
          leadId,
          question,
          backend: "llm-unavailable",
          durationMs: Date.now() - requestStartedAt,
          success: false,
          errorType: "zai_backend_unavailable",
          errorMessage: agentErr instanceof Error ? agentErr.message : "Unknown Agent backend error",
          preflight,
          toolCount: preflight.toolResults.length,
        });
        return llmUnavailableResponse(agentErr instanceof Error ? agentErr.message : "Unknown Agent backend error");
      }
      backend = "tool-fallback";
      result = await runFallbackAgent(question, lang, ctx);
      await persistAgentLedger({
        req,
        leadId,
        question,
        answer: result.answer,
        backend,
        durationMs: Date.now() - requestStartedAt,
        success: true,
        errorType: "zai_backend_fallback",
        errorMessage: agentErr instanceof Error ? agentErr.message : "Unknown Agent backend error",
        preflight,
        toolCount: result.toolResults.length,
      });
    }

    // ChatLog 저장 (도구 호출 이력 포함)
    await persistAgentLog({
      lang,
      question,
      answer: result.answer,
      backend,
      preflight,
      steps: result.steps,
      toolResults: result.toolResults,
      iterations: result.iterations,
    });
    if (backend !== "tool-fallback") {
      await persistAgentLedger({
        req,
        leadId,
        question,
        answer: result.answer,
        backend,
        durationMs: Date.now() - requestStartedAt,
        success: true,
        preflight,
        toolCount: result.toolResults.length,
      });
    }

    return NextResponse.json({
      answer: result.answer,
      backend,
      steps: result.steps,
      toolResults: result.toolResults,
      iterations: result.iterations,
      durationMs: Date.now() - requestStartedAt,
      grounded: Boolean(preflight.groundingContext),
      meta: buildAgentMeta({
        lang,
        question,
        backend,
        grounded: Boolean(preflight.groundingContext),
        toolResults: result.toolResults,
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
