import type { Lang } from "@/lib/i18n/translations";
import type { AgentResponse, AgentStep } from "@/lib/agent/agent";
import { analyzeAgentIntent } from "@/lib/agent/planner";
import { sanitizeToolArgsForDisplay, TOOL_MAP, type ToolContext, type ToolResult } from "@/lib/agent/tools";

async function runTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
  steps: AgentStep[],
  toolResults: ToolResult[]
) {
  const tool = TOOL_MAP[toolName];
  if (!tool) return null;
  const displayArgs = sanitizeToolArgsForDisplay(args);

  steps.push({
    type: "tool_call",
    content: `${toolName} 호출`,
    toolCall: { tool: toolName, args: displayArgs },
    timestamp: Date.now(),
  });

  const { result, summary } = await tool.execute(args, ctx);
  const toolResult: ToolResult = {
    tool: toolName,
    args: displayArgs,
    result,
    summary,
    success: true,
  };

  toolResults.push(toolResult);
  steps.push({
    type: "tool_result",
    content: summary,
    toolResult,
    timestamp: Date.now(),
  });

  return toolResult;
}

function formatFallbackAnswer(lang: Lang, question: string, toolResults: ToolResult[]): string {
  const lines: string[] = [];
  const isKo = lang === "ko";

  lines.push(
    isKo
      ? "KAXI 내장 도구로 확인한 결과입니다."
      : "I checked this with KAXI's built-in tools."
  );

  for (const item of toolResults) {
    if (item.tool === "search_schools" && Array.isArray(item.result)) {
      lines.push("");
      lines.push(isKo ? "추천 학교:" : "School matches:");
      for (const school of item.result.slice(0, 5)) {
        lines.push(
          `- ${school.name}: ${school.region}, ${school.program}, ${Number(school.tuition).toLocaleString()} KRW/semester, ${school.accreditation}`
        );
      }
    }

    if (item.tool === "calculate_cost" && item.result) {
      lines.push("");
      lines.push(isKo ? "비용 계산:" : "Cost estimate:");
      lines.push(`- ${item.summary}`);
      lines.push(`- ${isKo ? "플랫폼 예상 총액" : "Estimated total"}: ${Number(item.result.total).toLocaleString()} KRW`);
      if (item.result.warning) lines.push(`- ${item.result.warning}`);
    }

    if (item.tool === "get_documents" && item.result?.documents) {
      lines.push("");
      lines.push(`${item.result.visa_type} ${isKo ? "필수 서류:" : "documents:"}`);
      for (const doc of item.result.documents.slice(0, 10)) {
        lines.push(`- ${doc.doc}: ${doc.note}`);
      }
    }

    if (item.tool === "search_knowledge" && Array.isArray(item.result)) {
      lines.push("");
      lines.push(isKo ? "공식 정보 검색 결과:" : "Knowledge results:");
      for (const doc of item.result.slice(0, 3)) {
        lines.push(`- ${doc.title}: ${String(doc.content).slice(0, 180)}...`);
        if (doc.sourceMeta?.url) lines.push(`  Source: ${doc.sourceMeta.url}`);
      }
    }

    if (item.tool === "diagnose_path" && item.result) {
      lines.push("");
      lines.push(isKo ? "맞춤 경로 진단:" : "Personalized path:");
      lines.push(`- ${isKo ? "추천 경로" : "Recommended path"}: ${item.result.path}`);
      lines.push(`- ${isKo ? "준비 기간" : "Preparation time"}: ${item.result.prep_time}`);
      lines.push(`- ${isKo ? "예상 비용" : "Estimated cost"}: ${Number(item.result.estimated_cost).toLocaleString()} KRW`);
      for (const action of (item.result.next_actions || []).slice(0, 4)) {
        lines.push(`- ${action}`);
      }
      for (const warning of (item.result.warnings || []).slice(0, 2)) {
        lines.push(`- ${warning}`);
      }
    }

    if (item.tool === "request_partner") {
      lines.push("");
      lines.push(isKo ? "상담 연결:" : "Partner request:");
      lines.push(`- ${item.summary}`);
    }
  }

  if (toolResults.length === 0) {
    lines.push("");
    lines.push(
      isKo
        ? `질문을 확인했습니다: "${question}". 학교, 비용, 서류, 비자 중 하나를 조금 더 구체적으로 적어주세요.`
        : `I received: "${question}". Please specify school, cost, documents, or visa.`
    );
  }

  lines.push("");
  return lines.join("\n");
}

export async function runFallbackAgent(
  question: string,
  lang: Lang,
  ctx: ToolContext
): Promise<AgentResponse> {
  const analysis = analyzeAgentIntent(question, lang);
  const steps: AgentStep[] = [];
  const toolResults: ToolResult[] = [];

  if (analysis.safety) {
    const answer =
      lang === "ko"
        ? "허위서류, 불법취업, 비자 보장 요청은 도와드릴 수 없습니다. 대신 합법적인 서류 준비, 비용 비교, 행정사 상담 연결은 안내할 수 있습니다."
        : "I cannot help with fake documents, illegal work, or visa guarantees. I can help with legal document preparation, cost comparison, and expert consultation.";
    steps.push({ type: "final_answer", content: answer, timestamp: Date.now() });
    return { answer, steps, toolResults, iterations: 1 };
  }

  for (const planned of analysis.plan) {
    const toolCtx = planned.tool === "request_partner" ? { ...ctx, dryRun: true } : ctx;

    if (planned.tool === "search_schools") {
      const schools = await runTool(planned.tool, planned.args, toolCtx, steps, toolResults);

      if (analysis.cost && Array.isArray(schools?.result)) {
        for (const school of schools.result.slice(0, 3)) {
          if (!school?.id) continue;
          await runTool(
            "calculate_cost",
            {
              school_id: school.id,
              include_dormitory: true,
              broker_quote: analysis.budget,
            },
            ctx,
            steps,
            toolResults
          );
        }
      }
      continue;
    }

    await runTool(planned.tool, planned.args, toolCtx, steps, toolResults);
  }

  const answer = formatFallbackAnswer(lang, question, toolResults);
  steps.push({ type: "final_answer", content: answer, timestamp: Date.now() });

  return {
    answer,
    steps,
    toolResults,
    iterations: Math.max(1, toolResults.length),
  };
}
