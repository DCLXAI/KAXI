import type { AgentStep } from "@/lib/agent/agent";
import { analyzeAgentIntent, type AgentIntentAnalysis } from "@/lib/agent/planner";
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

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}\n...[truncated]` : value;
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
      if (doc.ragMeta?.last_checked_at) {
        lines.push(`  Checked: ${doc.ragMeta.last_checked_at}, status=${doc.ragMeta.review_status}`);
      }
      lines.push(`  ${truncate(String(doc.content), lang === "ko" ? 260 : 220)}`);
    }
  } else if (item.tool === "request_partner" && item.result) {
    lines.push(`- partner_type=${item.result.partner_type}`);
    lines.push(`- status=${item.result.status}`);
    lines.push(`- eta=${item.result.eta}`);
  }

  return lines;
}

function summarizePlannerContext(analysis: AgentIntentAnalysis): string[] {
  const lines = [
    "### planner",
    `Intent confidence: ${analysis.confidence}`,
    `Missing slots: ${analysis.missingSlots.length > 0 ? analysis.missingSlots.join(", ") : "none"}`,
  ];

  if (analysis.plan.length > 0) {
    lines.push("Planned tools:");
    for (const planned of analysis.plan) {
      lines.push(`- ${planned.tool}: ${planned.reason}`);
    }
  }

  return lines;
}

function buildGroundingContext(toolResults: ToolResult[], lang: Lang, analysis: AgentIntentAnalysis): string {
  const plannerLines = summarizePlannerContext(analysis);
  const toolLines = toolResults.flatMap((item) => summarizeToolResult(item, lang));
  return [...plannerLines, ...toolLines].join("\n");
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

  const analysis = analyzeAgentIntent(question, lang);
  const steps: AgentStep[] = [];
  const toolResults: ToolResult[] = [];
  const preflightCtx: ToolContext = { ...ctx, dryRun: true };

  if (analysis.smallTalk) {
    return { enabled: true, groundedQuestion: question, groundingContext: "", steps, toolResults };
  }

  let schoolsResult: ToolResult | null = null;

  for (const planned of analysis.plan) {
    if (planned.tool === "search_schools") {
      schoolsResult = await runTool(planned.tool, planned.args, preflightCtx, steps, toolResults);

      if (analysis.cost && Array.isArray(schoolsResult?.result)) {
        for (const school of schoolsResult.result.slice(0, 3)) {
          if (!school?.id) continue;
          await runTool(
            "calculate_cost",
            {
              school_id: school.id,
              include_dormitory: true,
              broker_quote: analysis.budget,
            },
            preflightCtx,
            steps,
            toolResults
          );
        }
      }
      continue;
    }

    await runTool(planned.tool, planned.args, preflightCtx, steps, toolResults);
  }

  const groundingContext = buildGroundingContext(toolResults, lang, analysis);
  return {
    enabled: true,
    groundedQuestion: buildGroundedQuestion(question, groundingContext),
    groundingContext,
    steps,
    toolResults,
  };
}
