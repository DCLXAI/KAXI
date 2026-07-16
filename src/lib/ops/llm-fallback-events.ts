import { recordOpsEvent } from "@/lib/ops/events";

export type LlmFallbackFeature = "action" | "consult";

// Best-effort telemetry for the moment a user turn is served by the non-LLM
// fallback. Must never throw or delay the turn — callers may fire-and-forget.
export async function reportLlmFallback(input: {
  feature: LlmFallbackFeature;
  failureReason: string;
  detail?: string;
}): Promise<void> {
  try {
    await recordOpsEvent({
      source: input.feature === "action" ? "ai-agent" : "ai-consult",
      severity: "warning",
      eventType: input.feature === "action" ? "agent.llm_fallback" : "consult.llm_fallback",
      message: `${input.feature} LLM failed; served the non-LLM fallback (${input.failureReason})`,
      payload: {
        feature: input.feature,
        failureReason: input.failureReason,
        detail: (input.detail || "").slice(0, 300),
      },
    });
  } catch (error) {
    console.warn("[llm-fallback telemetry failed]", error instanceof Error ? error.message : error);
  }
}
