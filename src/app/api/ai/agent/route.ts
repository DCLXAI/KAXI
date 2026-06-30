import { NextRequest, NextResponse } from "next/server";
import type { Lang } from "@/lib/i18n/translations";
import { db } from "@/lib/db";
import { runAgent } from "@/lib/agent/agent";
import { runFallbackAgent } from "@/lib/agent/fallback";
import type { ToolContext } from "@/lib/agent/tools";
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

    const configuredBackend = getAgentBackend();
    if (configuredBackend === "remote-bridge" || isRemoteCodexBridgeEnabled()) {
      try {
        const result = await runRemoteCodexBridge({
          question,
          lang,
          history,
          requestIp:
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            req.headers.get("x-real-ip") ||
            undefined,
          timeoutMs: parsePositiveInt(process.env.CODEX_REMOTE_BRIDGE_TIMEOUT_MS, 55_000),
        });

        return NextResponse.json({
          answer: result.answer,
          backend: result.backend,
          codexMode: result.codexMode,
          steps: result.steps,
          toolResults: result.toolResults,
          iterations: result.iterations,
          durationMs: result.durationMs,
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
          question,
          lang,
          history,
          timeoutMs: parsePositiveInt(process.env.CODEX_EXEC_TIMEOUT_MS, 45_000),
        });

        return NextResponse.json({
          answer: result.answer,
          backend: result.mode === "local-auth" ? "codex-cli-local" : "codex-cli",
          codexMode: result.mode,
          steps: [
            {
              type: "final_answer",
              content: result.answer,
              timestamp: Date.now(),
            },
          ],
          toolResults: [],
          iterations: 1,
          durationMs: result.durationMs,
        });
      } catch (codexErr) {
        console.warn(
          "[Codex backend fallback]",
          codexErr instanceof Error ? codexErr.message : codexErr
        );
        const ctx: ToolContext = { lang, leadId };
        const fallback = await runFallbackAgent(question, lang, ctx);
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
      const ctx: ToolContext = { lang, leadId };
      const fallback = await runFallbackAgent(question, lang, ctx);
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

    const ctx: ToolContext = { lang, leadId };

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
