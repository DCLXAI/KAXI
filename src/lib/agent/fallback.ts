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
  const copy = FALLBACK_COPY[ctx.lang];

  steps.push({
    type: "tool_call",
    content: copy.toolCall(toolName),
    toolCall: { tool: toolName, args: displayArgs },
    timestamp: Date.now(),
  });

  let toolResult: ToolResult;
  try {
    const { result, summary } = await tool.execute(args, ctx);
    toolResult = {
      tool: toolName,
      args: displayArgs,
      result,
      summary,
      success: true,
    };
  } catch (error) {
    const summary = copy.toolUnavailable(toolName);
    toolResult = {
      tool: toolName,
      args: displayArgs,
      result: { status: "unavailable", reason: "tool_execution_failed" },
      summary,
      success: false,
    };
    console.warn(`[Fallback tool unavailable: ${toolName}]`, error instanceof Error ? error.message : error);
  }

  toolResults.push(toolResult);
  steps.push({
    type: "tool_result",
    content: toolResult.summary,
    toolResult,
    timestamp: Date.now(),
  });

  return toolResult;
}

// This agent runs when the planner LLM is unavailable, so its output is the
// entire answer — and every label in it was `isKo ? Korean : English`. A
// Vietnamese or Mongolian user hitting an outage got an English report, which is
// the worst moment to drop them out of their language. MISSING_SLOT_LABELS below
// already had all four locales; the rest of the copy did not.
const FALLBACK_COPY: Record<Lang, {
  toolCall: (tool: string) => string;
  toolUnavailable: (tool: string) => string;
  intro: string;
  searchIncomplete: string;
  schools: string;
  cost: string;
  estimatedTotal: string;
  documentsSuffix: string;
  knowledge: string;
  source: string;
  checked: string;
  status: string;
  path: string;
  recommendedPath: string;
  prepTime: string;
  estimatedCost: string;
  partner: string;
  received: (question: string) => string;
  missingIntro: string;
  safety: string;
}> = {
  ko: {
    toolCall: (tool) => `${tool} 호출`,
    toolUnavailable: (tool) => `${tool} 도구를 지금 사용할 수 없습니다.`,
    intro: "KARXY 내장 도구로 확인한 결과입니다.",
    searchIncomplete: "공식 자료 검색을 지금 완료하지 못해 확인되지 않은 내용을 추측하지 않았습니다.",
    schools: "추천 학교:",
    cost: "비용 계산:",
    estimatedTotal: "플랫폼 예상 총액",
    documentsSuffix: "필수 서류:",
    knowledge: "공식 정보 검색 결과:",
    source: "출처",
    checked: "확인일",
    status: "검수상태",
    path: "맞춤 경로 진단:",
    recommendedPath: "추천 경로",
    prepTime: "준비 기간",
    estimatedCost: "예상 비용",
    partner: "상담 연결:",
    received: (question) =>
      `질문을 확인했습니다: "${question}". 학교, 비용, 서류, 비자 중 하나를 조금 더 구체적으로 적어주세요.`,
    missingIntro: "더 정확한 추천을 위해 확인하면 좋은 정보:",
    safety:
      "허위서류, 불법취업, 비자 보장 요청은 도와드릴 수 없습니다. 대신 합법적인 서류 준비, 비용 비교, 행정사 상담 연결은 안내할 수 있습니다.",
  },
  vi: {
    toolCall: (tool) => `Gọi ${tool}`,
    toolUnavailable: (tool) => `Công cụ ${tool} hiện không dùng được.`,
    intro: "Đây là kết quả kiểm tra bằng công cụ tích hợp của KARXY.",
    searchIncomplete:
      "Hiện chưa hoàn tất tìm kiếm nguồn chính thức, nên tôi không suy đoán những chi tiết chưa được xác minh.",
    schools: "Trường phù hợp:",
    cost: "Dự toán chi phí:",
    estimatedTotal: "Tổng dự kiến",
    documentsSuffix: "hồ sơ bắt buộc:",
    knowledge: "Kết quả tra cứu thông tin chính thức:",
    source: "Nguồn",
    checked: "Ngày kiểm tra",
    status: "Trạng thái duyệt",
    path: "Lộ trình phù hợp:",
    recommendedPath: "Lộ trình đề xuất",
    prepTime: "Thời gian chuẩn bị",
    estimatedCost: "Chi phí dự kiến",
    partner: "Kết nối tư vấn:",
    received: (question) =>
      `Tôi đã nhận câu hỏi: "${question}". Vui lòng nêu cụ thể hơn một trong các mục: trường, chi phí, hồ sơ hoặc visa.`,
    missingIntro: "Thông tin nên bổ sung để đề xuất chính xác hơn:",
    safety:
      "Tôi không thể hỗ trợ giấy tờ giả, làm việc bất hợp pháp hoặc bảo đảm visa. Tôi có thể hướng dẫn chuẩn bị hồ sơ hợp pháp, so sánh chi phí và kết nối tư vấn chuyên gia hành chính.",
  },
  mn: {
    toolCall: (tool) => `${tool} дуудлага`,
    toolUnavailable: (tool) => `${tool} хэрэгсэл одоогоор ажиллахгүй байна.`,
    intro: "Энэ бол KARXY-ийн дотоод хэрэгслээр шалгасан хариу юм.",
    searchIncomplete:
      "Албан эх сурвалжийн хайлтыг одоо гүйцээж чадаагүй тул батлагдаагүй агуулгыг таамаглаагүй.",
    schools: "Тохирох сургуулиуд:",
    cost: "Зардлын тооцоо:",
    estimatedTotal: "Төлөвлөсөн нийт дүн",
    documentsSuffix: "шаардлагатай баримт:",
    knowledge: "Албан мэдээллийн хайлтын хариу:",
    source: "Эх сурвалж",
    checked: "Шалгасан өдөр",
    status: "Хянан магадлах төлөв",
    path: "Тохирсон замын үнэлгээ:",
    recommendedPath: "Зөвлөх зам",
    prepTime: "Бэлтгэх хугацаа",
    estimatedCost: "Төсөвлөсөн зардал",
    partner: "Зөвлөгөө холбох:",
    received: (question) =>
      `Асуултыг хүлээж авлаа: "${question}". Сургууль, зардал, баримт, виз гэсний аль нэгийг илүү тодруулж бичнэ үү.`,
    missingIntro: "Илүү тодорхой зөвлөмж гаргахад хэрэгтэй мэдээлэл:",
    safety:
      "Хуурамч баримт, хууль бус хөдөлмөр, виз батлан даах хүсэлтэд тусалж чадахгүй. Харин хууль ёсны баримт бүрдүүлэх, зардлын харьцуулалт, мэргэжлийн зөвлөгөө холбох талаар чиглүүлж чадна.",
  },
  en: {
    toolCall: (tool) => `Calling ${tool}`,
    toolUnavailable: (tool) => `${tool} is temporarily unavailable.`,
    intro: "I checked this with KARXY's built-in tools.",
    searchIncomplete: "I could not complete the official-source search, so I did not guess at unverified details.",
    schools: "School matches:",
    cost: "Cost estimate:",
    estimatedTotal: "Estimated total",
    documentsSuffix: "documents:",
    knowledge: "Knowledge results:",
    source: "Source",
    checked: "Checked",
    status: "Review status",
    path: "Personalized path:",
    recommendedPath: "Recommended path",
    prepTime: "Preparation time",
    estimatedCost: "Estimated cost",
    partner: "Partner request:",
    received: (question) => `I received: "${question}". Please specify school, cost, documents, or visa.`,
    missingIntro: "Details that would improve the recommendation:",
    safety:
      "I cannot help with fake documents, illegal work, or visa guarantees. I can help with legal document preparation, cost comparison, and administrative-scrivener consultation.",
  },
};

const MISSING_SLOT_LABELS: Record<Lang, Record<AgentMissingSlot, string>> = {
  ko: {
    region: "희망 지역",
    program: "과정",
    budget: "6개월 예산",
    visa_type: "현재 또는 신청하려는 체류자격 코드",
    nationality: "국적",
    education: "최종 학력",
    korean_level: "한국어/TOPIK 수준",
    goal: "유학 목표",
  },
  vi: {
    region: "khu vực mong muốn",
    program: "chương trình",
    budget: "ngân sách 6 tháng",
    visa_type: "mã tư cách lưu trú hiện tại hoặc dự định",
    nationality: "quốc tịch",
    education: "trình độ học vấn",
    korean_level: "trình độ tiếng Hàn/TOPIK",
    goal: "mục tiêu du học",
  },
  mn: {
    region: "хүссэн бүс",
    program: "хөтөлбөр",
    budget: "6 сарын төсөв",
    visa_type: "одоогийн эсвэл хүсэж буй оршин суух код",
    nationality: "иргэншил",
    education: "боловсрол",
    korean_level: "солонгос хэл/TOPIK",
    goal: "суралцах зорилго",
  },
  en: {
    region: "preferred region",
    program: "program type",
    budget: "6-month budget",
    visa_type: "current or intended status code",
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
  const copy = FALLBACK_COPY[lang];
  let citationIndex = 1;

  lines.push(copy.intro);

  for (const item of toolResults) {
    if (!item.success) {
      lines.push("");
      lines.push(copy.searchIncomplete);
      continue;
    }

    if (item.tool === "search_schools" && Array.isArray(item.result)) {
      lines.push("");
      lines.push(copy.schools);
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
      lines.push(copy.cost);
      lines.push(`- ${item.summary}`);
      lines.push(`- ${copy.estimatedTotal}: ${numberField(result, "total").toLocaleString()} KRW`);
      if (result.warning) lines.push(`- ${String(result.warning)}`);
    }

    if (item.tool === "get_documents" && item.result) {
      const result = asRecord(item.result);
      if (!result) continue;
      lines.push("");
      lines.push(`${textField(result, "visa_type")} ${copy.documentsSuffix}`);
      for (const doc of recordArray(result.documents).slice(0, 10)) {
        lines.push(`- ${textField(doc, "doc")}: ${textField(doc, "note")}`);
      }
    }

    if (item.tool === "search_knowledge" && Array.isArray(item.result)) {
      lines.push("");
      lines.push(copy.knowledge);
      for (const doc of recordArray(item.result).slice(0, 3)) {
        const sourceMeta = asRecord(doc.sourceMeta);
        const ragMeta = asRecord(doc.ragMeta);
        const citation = `[${citationIndex++}]`;
        lines.push(`- ${textField(doc, "title")}: ${textField(doc, "content").slice(0, 180)}... ${citation}`);
        if (typeof sourceMeta?.url === "string") lines.push(`  ${copy.source}: ${sourceMeta.url}`);
        if (typeof ragMeta?.last_checked_at === "string") {
          lines.push(`  ${copy.checked}: ${ragMeta.last_checked_at}, ${copy.status}=${String(ragMeta.review_status || "")}`);
        }
      }
    }

    if (item.tool === "diagnose_path" && item.result) {
      const result = asRecord(item.result);
      if (!result) continue;
      lines.push("");
      lines.push(copy.path);
      lines.push(`- ${copy.recommendedPath}: ${textField(result, "path")}`);
      lines.push(`- ${copy.prepTime}: ${textField(result, "prep_time")}`);
      lines.push(`- ${copy.estimatedCost}: ${numberField(result, "estimated_cost").toLocaleString()} KRW`);
      for (const action of Array.isArray(result.next_actions) ? result.next_actions.slice(0, 4) : []) {
        lines.push(`- ${String(action)}`);
      }
      for (const warning of Array.isArray(result.warnings) ? result.warnings.slice(0, 2) : []) {
        lines.push(`- ${String(warning)}`);
      }
    }

    if (item.tool === "request_partner") {
      lines.push("");
      lines.push(copy.partner);
      lines.push(`- ${item.summary}`);
    }
  }

  if (toolResults.length === 0) {
    lines.push("");
    lines.push(copy.received(question));
  }

  if (analysis.missingSlots.length > 0 && !analysis.safety) {
    const labels = analysis.missingSlots
      .slice(0, 4)
      .map((slot) => MISSING_SLOT_LABELS[lang][slot])
      .filter(Boolean);
    if (labels.length > 0) {
      lines.push("");
      lines.push(copy.missingIntro);
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
    const answer = FALLBACK_COPY[lang].safety;
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
