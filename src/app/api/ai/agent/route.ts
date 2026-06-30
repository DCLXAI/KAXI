import { NextRequest, NextResponse } from "next/server";
import type { Lang } from "@/lib/i18n/translations";
import { db } from "@/lib/db";
import { runAgent } from "@/lib/agent/agent";
import type { ToolContext } from "@/lib/agent/tools";

// POST /api/ai/agent - 에이전트 대화 (도구 호출 + 다중 단계 추론)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      question,
      lang = "ko" as Lang,
      history = [],
      leadId = null,
    } = body || {};

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Missing question" },
        { status: 400 }
      );
    }

    const ctx: ToolContext = { lang, leadId };

    // 에이전트 실행
    const result = await runAgent(question, lang, history, ctx);

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
