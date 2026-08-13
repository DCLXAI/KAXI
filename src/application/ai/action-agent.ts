import { db, canWriteRuntimeDatabase } from "@/lib/db";
import { runAgent } from "@/lib/agent/agent";
import { runFallbackAgent } from "@/lib/agent/fallback";
import type { ToolContext } from "@/lib/agent/tools";
import { buildAgentMeta } from "@/lib/agent/meta";
import { runAgentPreflight, type AgentPreflightResult } from "@/lib/agent/preflight";
import { getAgentBackend, shouldRequireAgentLlm } from "@/lib/ai/backend-selector";
import { isLlmNotConfiguredError } from "@/lib/ai/llm-gateway";
import { withTimeout } from "@/lib/runtime/config";
import { guardAnswerFields } from "@/lib/chat/response-guardrail";
import { canPersistChatQuestion, protectChatQuestion } from "@/lib/privacy/chat-log";
import { maybeCreateHighRiskEscalationCase } from "@/lib/cases/high-risk-hook";
import { reportLlmFallback } from "@/lib/ops/llm-fallback-events";
import {
  ApplicationExecutionError,
  applicationError,
  assertExecutionActive,
  type AiRequestContext,
  type ObserveAiExecutionStage,
  type ApplicationResult,
} from "@/application/ai/contracts";
import {
  DEFAULT_APPLICATION_AI_RUNTIME_CONFIG,
  type ApplicationAiRuntimeConfig,
} from "@/application/ai/runtime-config";

export interface RunActionAgentInput {
  context: AiRequestContext;
  question: string;
  history: Array<{ role: "user"; content: string }>;
  leadId: string | null;
}

export interface ActionAgentOutput {
  answer: string;
  backend: string;
  steps: Array<Record<string, unknown>>;
  toolResults: Array<Record<string, unknown>>;
  iterations: number;
  durationMs: number;
  grounded: boolean;
  preflightMs: number;
  needsHumanExpert: boolean;
  escalationCaseCreated: boolean;
  meta: ReturnType<typeof buildAgentMeta>;
}

export interface ActionAgentDependencies {
  resolveStudentProfileId?: () => Promise<string | null>;
  reportProgress?: (stage: "searching" | "generating" | "finalizing") => void;
  reportVerifiedDelta?: (delta: string) => void;
  runtimeConfig?: ApplicationAiRuntimeConfig;
  observeStage?: ObserveAiExecutionStage;
}

function emptyPreflight(question: string): AgentPreflightResult {
  return {
    enabled: false,
    groundedQuestion: question,
    groundingContext: "",
    steps: [],
    toolResults: [],
  };
}

function shouldPersistAgentLog(config: ApplicationAiRuntimeConfig): boolean {
  if (!config.agentLoggingEnabled) return false;
  return canWriteRuntimeDatabase();
}

function shouldPersistAgentLedger(config: ApplicationAiRuntimeConfig): boolean {
  if (!config.agentLedgerEnabled) return false;
  return canWriteRuntimeDatabase();
}

function estimateTokens(question: string, answer: string, preflight: AgentPreflightResult): number {
  return Math.max(1, Math.ceil((question.length + answer.length + preflight.groundingContext.length) / 4));
}

function hasHighRiskAgentSignal(toolResults: Array<{ tool: string; summary: string; success: boolean }>): boolean {
  return toolResults.some((result) =>
    /risk[_\s-]?level:\s*high|고위험|human[_\s-]?review|행정사 상담|partner_escalation|blocked_reasons/i.test(
      `${result.tool} ${result.summary}`,
    ),
  );
}

async function persistAgentLog(input: {
  runtimeConfig: ApplicationAiRuntimeConfig;
  lang: AiRequestContext["locale"];
  question: string;
  answer: string;
  backend: string;
  preflight: AgentPreflightResult;
  steps: Array<{ type: string; content: string }>;
  toolResults: Array<{ tool: string; summary: string; success: boolean }>;
  iterations: number;
}) {
  if (!shouldPersistAgentLog(input.runtimeConfig) || !canPersistChatQuestion(input.question)) return;
  try {
    await db.chatLog.create({
      data: {
        lang: input.lang,
        ...protectChatQuestion(input.question),
        answer: input.answer,
        source: "agent",
        retrievedDocs: JSON.stringify({
          iterations: input.iterations,
          backend: input.backend,
          preflight: {
            enabled: input.preflight.enabled,
            toolCount: input.preflight.toolResults.length,
            grounded: Boolean(input.preflight.groundingContext),
          },
          toolResults: input.toolResults.map((result) => ({
            tool: result.tool,
            summary: result.summary,
            success: result.success,
          })),
          steps: input.steps.map((step) => ({
            type: step.type,
            content: String(step.content || "").substring(0, 200),
          })),
        }),
      },
    });
  } catch (error) {
    console.warn("[ChatLog save skipped]", error);
  }
}

async function persistAgentLedger(input: {
  runtimeConfig: ApplicationAiRuntimeConfig;
  context: AiRequestContext;
  leadId?: string | null;
  question: string;
  answer?: string;
  backend: string;
  durationMs?: number;
  success: boolean;
  errorType?: string;
  errorMessage?: string;
  preflight: AgentPreflightResult;
  toolCount: number;
}) {
  if (!shouldPersistAgentLedger(input.runtimeConfig)) return;
  try {
    const answer = input.answer || "";
    await db.agentRequestLedger.create({
      data: {
        ip: input.context.clientIp || "unknown",
        userId: input.leadId || null,
        questionChars: input.question.length,
        answerChars: answer.length,
        backend: input.backend,
        durationMs: input.durationMs ? Math.round(input.durationMs) : null,
        tokenEstimate: estimateTokens(input.question, answer, input.preflight),
        success: input.success,
        errorType: input.errorType || null,
        errorMessage: input.errorMessage?.slice(0, 500) || null,
        grounded: Boolean(input.preflight.groundingContext),
        toolCount: input.toolCount,
      },
    });
  } catch (error) {
    console.warn("[Agent ledger save skipped]", error);
  }
}

export async function runActionAgentUseCase(
  input: RunActionAgentInput,
  dependencies: ActionAgentDependencies = {},
): Promise<ApplicationResult<ActionAgentOutput>> {
  const runtimeConfig = dependencies.runtimeConfig || DEFAULT_APPLICATION_AI_RUNTIME_CONFIG;
  const observe = dependencies.observeStage || (async <T>(_stage: string, run: () => Promise<T>) => run());
  const startedAt = Date.now();
  let preflight = emptyPreflight(input.question);
  const toolContext: ToolContext = {
    lang: input.context.locale,
    tenantContext: input.context.tenantContext,
    leadId: input.leadId,
  };

  try {
    assertExecutionActive(input.context);
    dependencies.reportProgress?.("searching");
    const preflightStartedAt = Date.now();
    let preflightTimedOut = false;
    if (runtimeConfig.agentPreflightEnabled) {
      try {
        preflight = await observe("preflight", () => withTimeout(
          runAgentPreflight(input.question, input.context.locale, toolContext),
          runtimeConfig.agentPreflightTimeoutMs,
          "Agent preflight",
        ));
      } catch (error) {
        preflightTimedOut = true;
        console.warn("[Agent preflight skipped]", error instanceof Error ? error.message : error);
      }
    }
    const preflightMs = Date.now() - preflightStartedAt;
    assertExecutionActive(input.context);
    if (preflight.toolResults.length > 0) {
      dependencies.reportVerifiedDelta?.({
        ko: `검증된 도구 결과 ${preflight.toolResults.length}건을 확인했습니다.\n`,
        vi: `Đã xác minh ${preflight.toolResults.length} kết quả công cụ.\n`,
        mn: `${preflight.toolResults.length} баталгаажсан хэрэгслийн үр дүнг шалгалаа.\n`,
        en: `Verified ${preflight.toolResults.length} tool result(s).\n`,
      }[input.context.locale]);
    }

    const selectedLlmBackend = getAgentBackend();
    let backend: string = selectedLlmBackend;
    let errorType: string | undefined;
    let errorMessage: string | undefined;
    const grounded = Boolean(preflight.groundingContext);
    let result;

    try {
      dependencies.reportProgress?.("generating");
      result = await observe("provider_attempt", () => withTimeout(
        runAgent(preflight.groundedQuestion, input.context.locale, input.history, toolContext, {}, { grounded }),
        runtimeConfig.agentTimeoutMs,
        "LLM Agent execution",
      ));
    } catch (error) {
      console.warn("[LLM Agent fallback]", error instanceof Error ? error.message : error);
      if (shouldRequireAgentLlm()) {
        const message = error instanceof Error ? error.message : "Unknown LLM error";
        await persistAgentLedger({
          runtimeConfig,
          context: input.context,
          leadId: input.leadId,
          question: input.question,
          backend: "llm-unavailable",
          durationMs: Date.now() - startedAt,
          success: false,
          errorType: isLlmNotConfiguredError(error) ? "llm_not_configured" : "llm_backend_unavailable",
          errorMessage: message,
          preflight,
          toolCount: preflight.toolResults.length,
        });
        return applicationError("llm_unavailable", "The configured LLM gateway is unavailable. Built-in tool fallback is disabled for this deployment.", {
          detail: message.slice(0, 500),
          retryable: true,
        });
      }

      backend = "tool-fallback";
      errorType = isLlmNotConfiguredError(error) ? "llm_not_configured_fallback" : "llm_backend_fallback";
      errorMessage = error instanceof Error ? error.message : "Unknown LLM error";
      void reportLlmFallback({
        feature: "action",
        failureReason: errorType,
        detail: errorMessage,
        context: { preflightMs, preflightTimedOut, grounded },
      });
      result = await observe("provider_attempt", () => runFallbackAgent(input.question, input.context.locale, toolContext));
    }

    assertExecutionActive(input.context);
    dependencies.reportProgress?.("finalizing");
    const steps = backend === selectedLlmBackend ? [...preflight.steps, ...result.steps] : result.steps;
    const toolResults = backend === selectedLlmBackend
      ? [...preflight.toolResults, ...result.toolResults]
      : result.toolResults;

    await observe("persistence", async () => {
      await persistAgentLog({
        runtimeConfig,
        lang: input.context.locale,
        question: input.question,
        answer: result.answer,
        backend,
        preflight,
        steps,
        toolResults,
        iterations: result.iterations,
      });
      await persistAgentLedger({
        runtimeConfig,
        context: input.context,
        leadId: input.leadId,
        question: input.question,
        answer: result.answer,
        backend,
        durationMs: Date.now() - startedAt,
        success: true,
        errorType,
        errorMessage,
        preflight,
        toolCount: toolResults.length,
      });
    });

    const needsHumanExpert = hasHighRiskAgentSignal(toolResults);
    let escalationCaseCreated = false;
    if (needsHumanExpert) {
      try {
        const studentProfileId = await dependencies.resolveStudentProfileId?.() || null;
        const created = await maybeCreateHighRiskEscalationCase({
          studentProfileId,
          category: "agent:high-risk",
          summary: "에이전트 상담 고위험 판정",
          conversationSummary: input.question,
          ruleSnapshot: {
            backend,
            toolResults: toolResults.map((item) => ({
              tool: item.tool,
              summary: item.summary,
              success: item.success,
            })),
          },
          aiDraft: result.answer,
          source: "agent",
        });
        escalationCaseCreated = Boolean(created);
      } catch (error) {
        console.warn("[agent high-risk escalation skipped]", error instanceof Error ? error.message : error);
      }
    }

    const guarded = await observe("guardrail", async () => guardAnswerFields({
      answer: result.answer,
      sources: preflight.toolResults,
      searchMeta: { grounded, groundingContextChars: preflight.groundingContext.length },
      question: input.question,
      locale: input.context.locale,
    }));
    const durationMs = Date.now() - startedAt;

    return {
      ok: true,
      value: {
        answer: guarded.answer,
        backend,
        steps,
        toolResults,
        iterations: result.iterations,
        durationMs,
        grounded,
        preflightMs,
        needsHumanExpert: needsHumanExpert || guarded.needsHuman,
        escalationCaseCreated,
        meta: buildAgentMeta({
          lang: input.context.locale,
          question: input.question,
          backend,
          grounded,
          toolResults,
          durationMs,
        }),
      },
    };
  } catch (error) {
    await observe("persistence", () => persistAgentLedger({
      runtimeConfig,
      context: input.context,
      leadId: input.leadId,
      question: input.question,
      backend: "unknown",
      durationMs: Date.now() - startedAt,
      success: false,
      errorType: error instanceof ApplicationExecutionError ? error.code : "internal_error",
      errorMessage: error instanceof Error ? error.message : "Unknown internal error",
      preflight,
      toolCount: preflight.toolResults.length,
    }));
    if (error instanceof ApplicationExecutionError) {
      return applicationError(error.code, error.message, { retryable: false });
    }
    console.error("[runActionAgentUseCase]", error);
    return applicationError("internal_error", "Internal error", { retryable: true });
  }
}
