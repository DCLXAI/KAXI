import { NextRequest, NextResponse } from "next/server";
import type { Lang } from "@/lib/i18n/translations";
import { db } from "@/lib/db";
import { runAgent } from "@/lib/agent/agent";
import { runFallbackAgent } from "@/lib/agent/fallback";
import type { ToolContext } from "@/lib/agent/tools";
import { runAgentPreflight, type AgentPreflightResult } from "@/lib/agent/preflight";
import {
  getAgentBackend,
  runCodexServerless,
  shouldRequireAdminForCodexAgent,
} from "@/lib/codex/serverless";
import { isRemoteCodexBridgeEnabled, runRemoteCodexBridge } from "@/lib/codex/remote-bridge";
import {
  consumeDailyQuota,
  parseLimit,
  parsePositiveInt,
  rateLimit,
  requireAdmin,
  sanitizeAiBody,
  withTimeout,
} from "@/lib/api/security";

export const runtime = "nodejs";
export const maxDuration = 60;

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
  if (process.env.AI_AGENT_LOGGING_ENABLED === "false") return false;

  const databaseUrl = process.env.DATABASE_URL?.trim() || "";
  const hostedRuntime = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
  if (hostedRuntime && databaseUrl.startsWith("file:")) return false;

  return true;
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
  if (!shouldPersistAgentLog()) return;

  try {
    await db.chatLog.create({
      data: {
        lang,
        question,
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

// POST /api/ai/agent - 에이전트 대화 (도구 호출 + 다중 단계 추론)
export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, {
      key: "ai:agent",
      limit: parseLimit(process.env.AI_AGENT_RATE_LIMIT, 6),
      windowMs: 60 * 1000,
    });
    if (limited) return limited;

    const quotaExceeded = consumeDailyQuota(
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

    const configuredBackend = getAgentBackend();
    const shouldPreflight =
      configuredBackend === "remote-bridge" ||
      configuredBackend === "codex" ||
      isRemoteCodexBridgeEnabled();
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

    if (configuredBackend === "remote-bridge" || isRemoteCodexBridgeEnabled()) {
      try {
        const result = await runRemoteCodexBridge({
          question: preflight.groundedQuestion,
          lang,
          history,
          requestIp:
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            req.headers.get("x-real-ip") ||
            undefined,
          timeoutMs: parsePositiveInt(process.env.CODEX_REMOTE_BRIDGE_TIMEOUT_MS, 55_000),
        });
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

        return NextResponse.json({
          answer: result.answer,
          backend: result.backend,
          codexMode: result.codexMode,
          steps,
          toolResults,
          iterations: result.iterations,
          durationMs: result.durationMs,
          grounded: Boolean(preflight.groundingContext),
        });
      } catch (bridgeErr) {
        console.warn(
          "[Remote Codex bridge fallback]",
          bridgeErr instanceof Error ? bridgeErr.message : bridgeErr
        );
        if (configuredBackend === "remote-bridge") {
          return NextResponse.json({
            error: "Remote Codex bridge is unavailable",
            backend: "codex-cli-remote-bridge",
            detail: bridgeErr instanceof Error ? bridgeErr.message : "Unknown bridge error",
          }, { status: 502 });
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
        await persistAgentLog({
          lang,
          question,
          answer: result.answer,
          backend: result.mode === "local-auth" ? "codex-cli-local" : "codex-cli",
          preflight,
          steps,
          toolResults,
          iterations: 1,
        });

        return NextResponse.json({
          answer: result.answer,
          backend: result.mode === "local-auth" ? "codex-cli-local" : "codex-cli",
          codexMode: result.mode,
          steps,
          toolResults,
          iterations: 1,
          durationMs: result.durationMs,
          grounded: Boolean(preflight.groundingContext),
        });
      } catch (codexErr) {
        console.warn(
          "[Codex backend fallback]",
          codexErr instanceof Error ? codexErr.message : codexErr
        );
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
        return NextResponse.json({
          answer: fallback.answer,
          backend: "tool-fallback",
          steps: fallback.steps,
          toolResults: fallback.toolResults,
          iterations: fallback.iterations,
        });
      }
    }

    if (configuredBackend === "tool-fallback") {
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
      return NextResponse.json({
        answer: fallback.answer,
        backend: "tool-fallback",
        steps: fallback.steps,
        toolResults: fallback.toolResults,
        iterations: fallback.iterations,
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
      backend = "tool-fallback";
      result = await runFallbackAgent(question, lang, ctx);
    }

    // ChatLog 저장 (도구 호출 이력 포함)
    try {
      await db.chatLog.create({
        data: {
          lang,
          question,
          answer: result.answer,
          source: "agent",
          retrievedDocs: JSON.stringify({
            iterations: result.iterations,
            backend,
            toolResults: result.toolResults.map((r) => ({
              tool: r.tool,
              summary: r.summary,
              success: r.success,
            })),
            steps: result.steps.map((s) => ({ type: s.type, content: s.content.substring(0, 200) })),
          }),
        },
      });
    } catch (logErr) {
      console.error("[ChatLog save error]", logErr);
    }

    return NextResponse.json({
      answer: result.answer,
      backend,
      steps: result.steps,
      toolResults: result.toolResults,
      iterations: result.iterations,
    });
  } catch (e) {
    console.error("[POST /api/ai/agent]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
