import type { AgentStep } from "@/lib/agent/agent";
import { sanitizeToolArgsForDisplay, TOOL_MAP, type ToolContext, type ToolResult } from "@/lib/agent/tools";
import type { Lang } from "@/lib/i18n/translations";
import { redactSensitiveText } from "@/lib/privacy/pii";

export interface AgentPreflightResult {
  enabled: boolean;
  groundedQuestion: string;
  groundingContext: string;
  steps: AgentStep[];
  toolResults: ToolResult[];
}

const DEFAULT_CONTEXT_MAX_CHARS = 2_400;
const DEFAULT_GROUNDED_QUESTION_MAX_CHARS = 3_800;

function includesAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}\n...[truncated]` : value;
}

function parseKrwBudget(text: string): number | undefined {
  const manwon = text.match(/(\d+(?:\.\d+)?)\s*만\s*원/);
  if (manwon) return Math.round(Number(manwon[1]) * 10_000);

  const eokWon = text.match(/(\d+(?:\.\d+)?)\s*억\s*원/);
  if (eokWon) return Math.round(Number(eokWon[1]) * 100_000_000);

  const millionWon = text.match(/(\d+(?:\.\d+)?)\s*(?:m|million)\s*(?:krw|won|원)?/i);
  if (millionWon) return Math.round(Number(millionWon[1]) * 1_000_000);

  const rawWon = text.match(/(\d{6,})\s*(?:krw|won|원)?/i);
  if (rawWon) return Number(rawWon[1]);

  return undefined;
}

function detectRegion(text: string): string {
  if (includesAny(text, ["서울", "seoul"])) return "seoul";
  if (includesAny(text, ["경기", "gyeonggi", "수원", "성남", "안양", "용인"])) return "gyeonggi";
  if (includesAny(text, ["부산", "busan"])) return "busan";
  if (includesAny(text, ["대구", "daegu"])) return "daegu";
  if (includesAny(text, ["광주", "gwangju"])) return "gwangju";
  return "all";
}

function detectProgram(text: string): string {
  if (includesAny(text, ["어학", "어학당", "한국어", "language", "d-4", "d4"])) return "language";
  if (includesAny(text, ["전문대", "college"])) return "college";
  if (includesAny(text, ["대학원", "석사", "박사", "graduate", "master", "phd"])) return "graduate";
  if (includesAny(text, ["학위", "대학교", "대학", "university", "degree", "d-2", "d2"])) return "university";
  if (includesAny(text, ["직업", "요양", "vocational", "career"])) return "vocational";
  return "all";
}

function detectAccreditation(text: string): string {
  if (includesAny(text, ["인증", "accredited", "인증대학"])) return "accredited";
  if (includesAny(text, ["비자심사", "강화", "주의", "caution", "strict"])) return "caution";
  return "all";
}

function detectVisaType(text: string): "D-2" | "D-4" {
  return /d-2|d2|학위|대학교|대학원|degree|university|graduate/i.test(text) ? "D-2" : "D-4";
}

function detectNationality(text: string): string {
  if (includesAny(text, ["베트남", "vietnam", "vietnamese", "việt", "việt nam"])) return "vn";
  if (includesAny(text, ["몽골", "mongolia", "mongolian", "монгол"])) return "mn";
  if (includesAny(text, ["중국", "china", "chinese"])) return "cn";
  if (includesAny(text, ["우즈벡", "uzbek", "uzbekistan"])) return "uz";
  return "other";
}

function isSmallTalk(text: string): boolean {
  const normalized = text.replace(/\s+/g, "").toLowerCase();
  return ["안녕", "hi", "hello", "테스트", "상태", "status"].some((word) => normalized.includes(word)) && normalized.length < 40;
}

async function runTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
  steps: AgentStep[],
  toolResults: ToolResult[]
): Promise<ToolResult | null> {
  const tool = TOOL_MAP[toolName];
  if (!tool) return null;
  const displayArgs = sanitizeToolArgsForDisplay(args);

  steps.push({
    type: "tool_call",
    content: `${toolName} preflight`,
    toolCall: { tool: toolName, args: displayArgs },
    timestamp: Date.now(),
  });

  try {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown preflight tool error";
    steps.push({
      type: "error",
      content: `${toolName} preflight failed: ${message}`,
      timestamp: Date.now(),
    });
    return null;
  }
}

function summarizeToolResult(item: ToolResult, lang: Lang): string[] {
  const lines: string[] = [`### ${item.tool}`, `Summary: ${item.summary}`];

  if (item.tool === "search_schools" && Array.isArray(item.result)) {
    for (const school of item.result.slice(0, 5)) {
      lines.push(
        `- ${school.name} | region=${school.region} | program=${school.program} | tuition=${Number(school.tuition).toLocaleString()} KRW/semester | accreditation=${school.accreditation} | id=${school.id} | official=${school.officialUrl || "n/a"}`
      );
    }
  } else if (item.tool === "calculate_cost" && item.result) {
    lines.push(`- school=${item.result.school}`);
    lines.push(`- total=${Number(item.result.total).toLocaleString()} KRW`);
    if (item.result.items) lines.push(`- items=${JSON.stringify(item.result.items)}`);
    if (item.result.warning) lines.push(`- warning=${item.result.warning}`);
  } else if (item.tool === "get_documents" && item.result?.documents) {
    lines.push(`- visa_type=${item.result.visa_type}`);
    lines.push(
      ...item.result.documents
        .slice(0, 10)
        .map((doc: { doc: string; note: string }) => `- ${doc.doc}: ${doc.note}`)
    );
  } else if (item.tool === "search_knowledge" && Array.isArray(item.result)) {
    for (const doc of item.result.slice(0, 4)) {
      lines.push(`- ${doc.title} (${doc.category}) score=${doc.score}`);
      lines.push(`  Source: ${doc.sourceMeta?.label || doc.source} <${doc.sourceMeta?.url || ""}>`);
      lines.push(`  ${truncate(String(doc.content), lang === "ko" ? 260 : 220)}`);
    }
  } else if (item.tool === "request_partner" && item.result) {
    lines.push(`- partner_type=${item.result.partner_type}`);
    lines.push(`- status=${item.result.status}`);
    lines.push(`- eta=${item.result.eta}`);
  }

  return lines;
}

function buildGroundingContext(toolResults: ToolResult[], lang: Lang): string {
  if (toolResults.length === 0) return "";
  return toolResults.flatMap((item) => summarizeToolResult(item, lang)).join("\n");
}

function buildGroundedQuestion(question: string, groundingContext: string): string {
  if (!groundingContext) return redactSensitiveText(question);
  const contextMaxChars = Number(process.env.AI_AGENT_CONTEXT_MAX_CHARS || DEFAULT_CONTEXT_MAX_CHARS);
  const totalMaxChars = Number(process.env.AI_AGENT_GROUNDED_QUESTION_MAX_CHARS || DEFAULT_GROUNDED_QUESTION_MAX_CHARS);
  const safeContextMax = Number.isFinite(contextMaxChars) && contextMaxChars > 500 ? contextMaxChars : DEFAULT_CONTEXT_MAX_CHARS;
  const safeTotalMax = Number.isFinite(totalMaxChars) && totalMaxChars > 1_000 ? totalMaxChars : DEFAULT_GROUNDED_QUESTION_MAX_CHARS;

  const prefix = `Original user question:
${redactSensitiveText(question)}

KAXI server-side tool context:
`;
  const suffix = `

Answer the original question using the KAXI tool context above as the primary source. If the context is insufficient or time-sensitive, say so briefly. Include source names/URLs when provided. Do not mention internal preflight implementation details.`;

  const contextBudget = Math.max(500, Math.min(safeContextMax, safeTotalMax - prefix.length - suffix.length));
  const cappedContext = truncate(groundingContext, contextBudget);

  return `${prefix}${cappedContext}${suffix}`;
}

export async function runAgentPreflight(
  question: string,
  lang: Lang,
  ctx: ToolContext
): Promise<AgentPreflightResult> {
  if (process.env.AI_AGENT_PREFLIGHT_ENABLED === "false") {
    return { enabled: false, groundedQuestion: question, groundingContext: "", steps: [], toolResults: [] };
  }

  const text = question.toLowerCase();
  const steps: AgentStep[] = [];
  const toolResults: ToolResult[] = [];
  const preflightCtx: ToolContext = { ...ctx, dryRun: true };

  if (isSmallTalk(text)) {
    return { enabled: true, groundedQuestion: question, groundingContext: "", steps, toolResults };
  }

  const asksSchool = includesAny(text, ["학교", "어학당", "대학", "school", "university", "language"]);
  const asksCost = includesAny(text, ["비용", "견적", "예산", "등록금", "학비", "cost", "budget", "tuition"]);
  const asksDocs = includesAny(text, ["서류", "문서", "documents", "hồ sơ", "비자", "visa", "d-2", "d-4", "d2", "d4"]);
  const asksKnowledge = asksDocs || includesAny(text, ["법", "불법", "허위", "보장", "거절", "체류", "출입국", "절차", "process", "refusal", "illegal"]);
  const asksPartner = includesAny(text, ["상담", "연결", "행정사", "partner", "consult", "lawyer"]);

  let schoolsResult: ToolResult | null = null;

  if (asksSchool || asksCost) {
    schoolsResult = await runTool(
      "search_schools",
      {
        region: detectRegion(text),
        program: detectProgram(text),
        accreditation: detectAccreditation(text),
        max_tuition: parseKrwBudget(text),
        limit: asksCost ? 3 : 5,
      },
      preflightCtx,
      steps,
      toolResults
    );
  }

  if (asksCost && Array.isArray(schoolsResult?.result)) {
    for (const school of schoolsResult.result.slice(0, 3)) {
      if (school?.id) {
        await runTool(
          "calculate_cost",
          {
            school_id: school.id,
            include_dormitory: true,
            broker_quote: parseKrwBudget(text),
          },
          preflightCtx,
          steps,
          toolResults
        );
      }
    }
  }

  if (asksDocs) {
    await runTool(
      "get_documents",
      {
        visa_type: detectVisaType(text),
        nationality: detectNationality(text),
      },
      preflightCtx,
      steps,
      toolResults
    );
  }

  if (asksKnowledge || toolResults.length === 0) {
    await runTool("search_knowledge", { query: question, top_k: asksKnowledge ? 4 : 3 }, preflightCtx, steps, toolResults);
  }

  if (asksPartner) {
    await runTool(
      "request_partner",
      {
        partner_type: includesAny(text, ["번역", "공증", "translation", "notary"]) ? "translation" : "admin",
        question,
      },
      preflightCtx,
      steps,
      toolResults
    );
  }

  const groundingContext = buildGroundingContext(toolResults, lang);
  return {
    enabled: true,
    groundedQuestion: buildGroundedQuestion(question, groundingContext),
    groundingContext,
    steps,
    toolResults,
  };
}
