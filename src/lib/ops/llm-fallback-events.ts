import { recordOpsEvent } from "@/lib/ops/events";

export type LlmFallbackFeature = "action" | "consult";

// Best-effort telemetry for the moment a user turn is served by the non-LLM
// fallback. Must never throw or delay the turn — callers may fire-and-forget.
export async function reportLlmFallback(input: {
  feature: LlmFallbackFeature;
  failureReason: string;
  detail?: string;
  // Additional telemetry fields (e.g. preflightMs, preflightTimedOut, grounded)
  // spread into the recorded payload. Trusted internal callers only — never
  // pass user-controlled keys here, since they can shadow the fields above.
  context?: Record<string, unknown>;
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
        ...input.context,
      },
    });
  } catch (error) {
    console.warn("[llm-fallback telemetry failed]", error instanceof Error ? error.message : error);
  }
}
