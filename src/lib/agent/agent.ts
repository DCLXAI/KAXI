// ReAct 에이전트 루프
// 사용자 질문 → LLM 추론 → 도구 호출 → 결과 → 다시 추론 → ... → 최종 답변
// 최대 5회 반복 (무한 루프 방지)

import { TOOL_MAP, getToolsDescription, parseToolCall, sanitizeToolArgsForDisplay, type ToolResult, type ToolContext } from "./tools";
import type { Lang } from "../i18n/translations";
import { createZaiClient } from "../ai/zai";

export interface AgentStep {
  type: "thinking" | "tool_call" | "tool_result" | "final_answer" | "error";
  content: string;
  toolCall?: { tool: string; args: Record<string, any> };
  toolResult?: ToolResult;
  timestamp: number;
}

export interface AgentResponse {
  answer: string;
  steps: AgentStep[];
  toolResults: ToolResult[];
  iterations: number;
}

const MAX_ITERATIONS = 5;

export async function runAgent(
  question: string,
  lang: Lang,
  history: { role: string; content: string }[],
  ctx: ToolContext
): Promise<AgentResponse> {
  const steps: AgentStep[] = [];
  const toolResults: ToolResult[] = [];

  const langName = { ko: "Korean", vi: "Vietnamese", mn: "Mongolian", en: "English" }[lang];

  const systemPrompt = `당신은 KAXI의 AI 에이전트입니다. 한국 유학 준비생을 도와 학교 검색, 비용 계산, 서류 확인, 비자 정보 등을 제공합니다.

## 작동 방식 (ReAct 패턴)
1. 사용자 질문을 분석하여 필요한 도구가 있는지 판단
2. 도구 호출시 JSON 형식으로 응답:
\`\`\`json
{"tool": "도구명", "args": {"매개변수": "값"}}
\`\`\`
3. 도구 결과를 받아 다시 추론하거나 최종 답변 작성
4. 최종 답변시 일반 텍스트로 응답 (JSON 없음)

## 사용자 언어: ${langName}
답변은 ${langName}로 작성하세요.

## 사용 가능한 도구
${getToolsDescription()}

## 규칙
1. 정보가 필요하면 반드시 도구 호출 (추측 금지)
2. 학교 정보 → search_schools 먼저 호출
3. 비용 질문 → search_schools → calculate_cost 순서
4. 비자/체류/출입국/서류 절차 → search_knowledge로 공식 문서 검색. 최종 답변은 출입국관리법 → 시행령 체류자격 별표 → 시행규칙 첨부서류·수수료 → 하이코리아/매뉴얼 순서로 근거를 제시
5. 개인 진단 → diagnose_path 호출
6. 전문가 연결 → 사용자가 명시적으로 상담 접수/연결을 요청한 경우에만 request_partner 호출
7. 위험 신호 (허위서류, 불법취업, 비자보장) 감지시 경고
8. 최종 답변은 간결하고 실용적으로 (마크다운 사용)
9. 출처 표기 (📚 출처: ...). 비자/체류 질문에서 법령 근거가 없으면 확정 답변하지 말고 확인 필요성을 먼저 안내
10. 도구는 한 번에 하나씩만 호출
11. 사용자가 상담 접수 의사를 밝히지 않았다면 request_partner를 호출하지 말고, 필요한 정보와 확인 질문만 안내
12. request_partner는 상담 요청 초안만 만들며, 실제 접수에는 사용자 확인과 운영 접수 절차가 필요함을 안내
13. 하이코리아·비자포털 안내는 운영 보조 근거이며, 법령과 충돌하거나 최신성이 불명확하면 법령과 관할 출입국외국인관서 확인을 우선

## 현재 컨텍스트
- 언어: ${lang}
- 사용자 ID: ${ctx.leadId || "익명"}`;

  // 메시지 히스토리 구성
  const messages: { role: string; content: string }[] = [
    { role: "assistant", content: systemPrompt },
    ...history.slice(-4).map((h) => ({
      role: h.role === "user" ? "user" : "assistant",
      content: h.content,
    })),
    { role: "user", content: question },
  ];

  const zai = await createZaiClient("agent");

  let iteration = 0;
  let finalAnswer = "";

  while (iteration < MAX_ITERATIONS) {
    iteration++;

    try {
      const completion = await zai.chat.completions.create({
        messages: messages as any,
        thinking: { type: "disabled" },
        temperature: 0.2,
        max_tokens: 1200,
      });

      const content = completion.choices?.[0]?.message?.content || "";

      // 도구 호출인지 확인
      const toolCall = parseToolCall(content);

      if (toolCall) {
        const displayArgs = sanitizeToolArgsForDisplay(toolCall.args);
        // 도구 호출 기록
        steps.push({
          type: "tool_call",
          content: `${toolCall.tool} 호출`,
          toolCall: { tool: toolCall.tool, args: displayArgs },
          timestamp: Date.now(),
        });

        // 도구 실행
        const tool = TOOL_MAP[toolCall.tool];
        try {
          const toolCtx = toolCall.tool === "request_partner" ? { ...ctx, dryRun: true } : ctx;
          const { result, summary } = await tool.execute(toolCall.args, toolCtx);
          const toolResult: ToolResult = {
            tool: toolCall.tool,
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

          // 도구 결과를 메시지에 추가하고 계속 추론
          messages.push({ role: "assistant", content });
          messages.push({
            role: "user",
            content: `[도구 결과: ${toolCall.tool}]\n${JSON.stringify(result, null, 2)}\n\n이제 이 결과를 활용하여 사용자 질문에 답변하거나, 추가 도구가 필요하면 호출하세요. 최종 답변시에는 JSON 없이 일반 텍스트로 답변하세요.`,
          });

          continue;
        } catch (e: any) {
          const errMsg = e.message || "Unknown error";
          steps.push({
            type: "error",
            content: `도구 실행 오류: ${errMsg}`,
            timestamp: Date.now(),
          });

          messages.push({ role: "assistant", content });
          messages.push({
            role: "user",
            content: `[도구 오류: ${errMsg}]\n다른 방법으로 답변하거나 다른 도구를 시도하세요.`,
          });
          continue;
        }
      }

      // 도구 호출이 아니면 최종 답변
      finalAnswer = content;
      steps.push({
        type: "final_answer",
        content,
        timestamp: Date.now(),
      });
      break;
    } catch (e: any) {
      console.error("[Agent iteration error]", e);
      steps.push({
        type: "error",
        content: `LLM 오류: ${e.message}`,
        timestamp: Date.now(),
      });
      finalAnswer = lang === "ko"
        ? "일시적 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
        : "Temporary error. Please retry.";
      break;
    }
  }

  if (!finalAnswer) {
    finalAnswer = lang === "ko"
      ? "최대 처리 횟수를 초과했습니다. 더 구체적인 질문을 해주세요."
      : "Max iterations reached. Please be more specific.";
    steps.push({
      type: "final_answer",
      content: finalAnswer,
      timestamp: Date.now(),
    });
  }

  return {
    answer: finalAnswer,
    steps,
    toolResults,
    iterations: iteration,
  };
}
