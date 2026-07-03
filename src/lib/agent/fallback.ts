import type { Lang } from "@/lib/i18n/translations";
import type { AgentResponse, AgentStep } from "@/lib/agent/agent";
import { analyzeAgentIntent, type AgentIntentAnalysis, type AgentMissingSlot } from "@/lib/agent/planner";
import { sanitizeToolArgsForDisplay, TOOL_MAP, type ToolContext, type ToolResult } from "@/lib/agent/tools";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function recordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(asRecord).filter((item): item is Record<string, unknown> => Boolean(item)) : [];
}

function textField(record: Record<string, unknown>, key: string, fallback = ""): string {
  const value = record[key];
  return typeof value === "string" ? value : fallback;
}

function numberField(record: Record<string, unknown>, key: string, fallback = 0): number {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

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

const MISSING_SLOT_LABELS: Record<Lang, Record<AgentMissingSlot, string>> = {
  ko: {
    region: "희망 지역",
    program: "과정",
    budget: "6개월 예산",
    visa_type: "D-2/D-4 비자 종류",
    nationality: "국적",
    education: "최종 학력",
    korean_level: "한국어/TOPIK 수준",
    goal: "유학 목표",
  },
  vi: {
    region: "khu vực mong muốn",
    program: "chương trình",
    budget: "ngân sách 6 tháng",
    visa_type: "loại visa D-2/D-4",
    nationality: "quốc tịch",
    education: "trình độ học vấn",
    korean_level: "trình độ tiếng Hàn/TOPIK",
    goal: "mục tiêu du học",
  },
  mn: {
    region: "хүссэн бүс",
    program: "хөтөлбөр",
    budget: "6 сарын төсөв",
    visa_type: "D-2/D-4 виз",
    nationality: "иргэншил",
    education: "боловсрол",
    korean_level: "солонгос хэл/TOPIK",
    goal: "суралцах зорилго",
  },
  en: {
    region: "preferred region",
    program: "program type",
    budget: "6-month budget",
    visa_type: "D-2/D-4 visa type",
    nationality: "nationality",
    education: "education level",
    korean_level: "Korean/TOPIK level",
    goal: "study goal",
  },
};

function formatFallbackAnswer(
  lang: Lang,
  question: string,
  toolResults: ToolResult[],
  analysis: AgentIntentAnalysis
): string {
  const lines: string[] = [];
  const isKo = lang === "ko";
  let citationIndex = 1;

  lines.push(
    isKo
      ? "KAXI 내장 도구로 확인한 결과입니다."
      : "I checked this with KAXI's built-in tools."
  );

  for (const item of toolResults) {
    if (item.tool === "search_schools" && Array.isArray(item.result)) {
      lines.push("");
      lines.push(isKo ? "추천 학교:" : "School matches:");
      for (const school of recordArray(item.result).slice(0, 5)) {
        const citation = `[${citationIndex++}]`;
        lines.push(
          `- ${textField(school, "name")}: ${textField(school, "region")}, ${textField(school, "program")}, ${numberField(school, "tuition").toLocaleString()} KRW/semester, ${textField(school, "accreditation")} ${citation}`
        );
      }
    }

    if (item.tool === "calculate_cost" && item.result) {
      const result = asRecord(item.result);
      if (!result) continue;
      lines.push("");
      lines.push(isKo ? "비용 계산:" : "Cost estimate:");
      lines.push(`- ${item.summary}`);
      lines.push(`- ${isKo ? "플랫폼 예상 총액" : "Estimated total"}: ${numberField(result, "total").toLocaleString()} KRW`);
      if (result.warning) lines.push(`- ${String(result.warning)}`);
    }

    if (item.tool === "get_documents" && item.result) {
      const result = asRecord(item.result);
      if (!result) continue;
      lines.push("");
      lines.push(`${textField(result, "visa_type")} ${isKo ? "필수 서류:" : "documents:"}`);
      for (const doc of recordArray(result.documents).slice(0, 10)) {
        lines.push(`- ${textField(doc, "doc")}: ${textField(doc, "note")}`);
      }
    }

    if (item.tool === "search_knowledge" && Array.isArray(item.result)) {
      lines.push("");
      lines.push(isKo ? "공식 정보 검색 결과:" : "Knowledge results:");
      for (const doc of recordArray(item.result).slice(0, 3)) {
        const sourceMeta = asRecord(doc.sourceMeta);
        const ragMeta = asRecord(doc.ragMeta);
        const citation = `[${citationIndex++}]`;
        lines.push(`- ${textField(doc, "title")}: ${textField(doc, "content").slice(0, 180)}... ${citation}`);
        if (typeof sourceMeta?.url === "string") lines.push(`  Source: ${sourceMeta.url}`);
        if (typeof ragMeta?.last_checked_at === "string") {
          lines.push(`  Checked: ${ragMeta.last_checked_at}, status=${String(ragMeta.review_status || "")}`);
        }
      }
    }

    if (item.tool === "diagnose_path" && item.result) {
      const result = asRecord(item.result);
      if (!result) continue;
      lines.push("");
      lines.push(isKo ? "맞춤 경로 진단:" : "Personalized path:");
      lines.push(`- ${isKo ? "추천 경로" : "Recommended path"}: ${textField(result, "path")}`);
      lines.push(`- ${isKo ? "준비 기간" : "Preparation time"}: ${textField(result, "prep_time")}`);
      lines.push(`- ${isKo ? "예상 비용" : "Estimated cost"}: ${numberField(result, "estimated_cost").toLocaleString()} KRW`);
      for (const action of Array.isArray(result.next_actions) ? result.next_actions.slice(0, 4) : []) {
        lines.push(`- ${String(action)}`);
      }
      for (const warning of Array.isArray(result.warnings) ? result.warnings.slice(0, 2) : []) {
        lines.push(`- ${String(warning)}`);
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

  if (analysis.missingSlots.length > 0 && !analysis.safety) {
    const labels = analysis.missingSlots
      .slice(0, 4)
      .map((slot) => MISSING_SLOT_LABELS[lang][slot])
      .filter(Boolean);
    if (labels.length > 0) {
      lines.push("");
      lines.push(isKo ? "더 정확한 추천을 위해 확인하면 좋은 정보:" : "Details that would improve the recommendation:");
      for (const label of labels) lines.push(`- ${label}`);
    }
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

      const schoolResults = recordArray(schools?.result);
      if (analysis.cost && schoolResults.length > 0) {
        for (const school of schoolResults.slice(0, 3)) {
          const schoolId = textField(school, "id");
          if (!schoolId) continue;
          await runTool(
            "calculate_cost",
            {
              school_id: schoolId,
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

  const answer = formatFallbackAnswer(lang, question, toolResults, analysis);
  steps.push({ type: "final_answer", content: answer, timestamp: Date.now() });

  return {
    answer,
    steps,
    toolResults,
    iterations: Math.max(1, toolResults.length),
  };
}
