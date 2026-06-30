import type { Lang } from "@/lib/i18n/translations";
import type { AgentResponse, AgentStep } from "@/lib/agent/agent";
import { TOOL_MAP, type ToolContext, type ToolResult } from "@/lib/agent/tools";

function includesAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

function parseKrwBudget(text: string): number | undefined {
  const manwon = text.match(/(\d+(?:\.\d+)?)\s*만\s*원/);
  if (manwon) return Math.round(Number(manwon[1]) * 10_000);

  const millionWon = text.match(/(\d+(?:\.\d+)?)\s*(?:m|million)\s*(?:krw|won|원)?/i);
  if (millionWon) return Math.round(Number(millionWon[1]) * 1_000_000);

  const rawWon = text.match(/(\d{6,})\s*(?:krw|won|원)?/i);
  if (rawWon) return Number(rawWon[1]);

  return undefined;
}

function detectRegion(text: string): string {
  if (includesAny(text, ["서울", "seoul"])) return "seoul";
  if (includesAny(text, ["경기", "gyeonggi"])) return "gyeonggi";
  if (includesAny(text, ["부산", "busan"])) return "busan";
  if (includesAny(text, ["대구", "daegu"])) return "daegu";
  if (includesAny(text, ["광주", "gwangju"])) return "gwangju";
  return "all";
}

function detectVisaType(text: string): "D-2" | "D-4" {
  return /d-2|d2|학위|대학|degree/i.test(text) ? "D-2" : "D-4";
}

function detectNationality(text: string): string {
  if (includesAny(text, ["베트남", "vietnam", "vietnamese", "việt"])) return "vn";
  if (includesAny(text, ["몽골", "mongolia", "mongolian"])) return "mn";
  if (includesAny(text, ["중국", "china", "chinese"])) return "cn";
  if (includesAny(text, ["우즈벡", "uzbek"])) return "uz";
  return "other";
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

  steps.push({
    type: "tool_call",
    content: `${toolName} 호출`,
    toolCall: { tool: toolName, args },
    timestamp: Date.now(),
  });

  const { result, summary } = await tool.execute(args, ctx);
  const toolResult: ToolResult = {
    tool: toolName,
    args,
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
  const text = question.toLowerCase();
  const steps: AgentStep[] = [];
  const toolResults: ToolResult[] = [];

  if (includesAny(text, ["허위", "fake", "불법", "illegal", "비자 보장", "visa guarantee"])) {
    const answer =
      lang === "ko"
        ? "허위서류, 불법취업, 비자 보장 요청은 도와드릴 수 없습니다. 대신 합법적인 서류 준비, 비용 비교, 행정사 상담 연결은 안내할 수 있습니다."
        : "I cannot help with fake documents, illegal work, or visa guarantees. I can help with legal document preparation, cost comparison, and expert consultation.";
    steps.push({ type: "final_answer", content: answer, timestamp: Date.now() });
    return { answer, steps, toolResults, iterations: 1 };
  }

  const asksSchool = includesAny(text, ["학교", "어학당", "대학", "school", "university", "language"]);
  const asksCost = includesAny(text, ["비용", "견적", "예산", "cost", "budget", "tuition"]);
  const asksDocs = includesAny(text, ["서류", "문서", "documents", "visa", "비자", "d-2", "d-4"]);
  const asksPartner = includesAny(text, ["상담", "연결", "행정사", "partner", "consult"]);

  if (asksSchool || asksCost) {
    const schools = await runTool(
      "search_schools",
      {
        region: detectRegion(text),
        program: includesAny(text, ["어학", "language"]) ? "language" : "all",
        accreditation: includesAny(text, ["인증", "accredited"]) ? "accredited" : "all",
        max_tuition: parseKrwBudget(text),
        limit: 5,
      },
      ctx,
      steps,
      toolResults
    );

    if (asksCost && Array.isArray(schools?.result) && schools.result[0]?.id) {
      await runTool(
        "calculate_cost",
        {
          school_id: schools.result[0].id,
          include_dormitory: true,
        },
        ctx,
        steps,
        toolResults
      );
    }
  }

  if (asksDocs) {
    await runTool(
      "get_documents",
      {
        visa_type: detectVisaType(text),
        nationality: detectNationality(text),
      },
      ctx,
      steps,
      toolResults
    );
    await runTool("search_knowledge", { query: question, top_k: 3 }, ctx, steps, toolResults);
  }

  if (asksPartner) {
    await runTool(
      "request_partner",
      {
        partner_type: includesAny(text, ["번역", "공증"]) ? "translation" : "admin",
        question,
      },
      ctx,
      steps,
      toolResults
    );
  }

  if (toolResults.length === 0) {
    await runTool("search_knowledge", { query: question, top_k: 3 }, ctx, steps, toolResults);
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
