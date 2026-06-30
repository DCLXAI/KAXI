import { NextRequest, NextResponse } from "next/server";
import type { Lang } from "@/lib/i18n/translations";
import { db } from "@/lib/db";
import { runAgent } from "@/lib/agent/agent";
import type { ToolContext } from "@/lib/agent/tools";
import {
  consumeDailyQuota,
  parsePositiveInt,
  rateLimit,
  sanitizeAiBody,
  withTimeout,
} from "@/lib/api/security";

// POST /api/ai/agent - 에이전트 대화 (도구 호출 + 다중 단계 추론)
export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, {
      key: "ai:agent",
      limit: parsePositiveInt(process.env.AI_AGENT_RATE_LIMIT, 6),
      windowMs: 60 * 1000,
    });
    if (limited) return limited;

    const quotaExceeded = consumeDailyQuota(
      req,
      "ai:agent",
      parsePositiveInt(process.env.AI_AGENT_DAILY_QUOTA, 30)
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

    // 에이전트 실행
    const result = await withTimeout(
      runAgent(question, lang, history, ctx),
      parsePositiveInt(process.env.AI_AGENT_TIMEOUT_MS, 45_000),
      "Agent execution"
    );

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
      steps: result.steps,
      toolResults: result.toolResults,
      iterations: result.iterations,
    });
  } catch (e) {
    console.error("[POST /api/ai/agent]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
