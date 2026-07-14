import type { Locale } from "@/i18n/routing";
import type { SourceAnnotation } from "@/components/kbridge/SourceAnnotations";
import type { UnifiedAiProgressStage } from "@/lib/ai/unified-stream";
import type { UnifiedAiRouteDecision, UnifiedExpertMode } from "@/lib/ai/unified-router";

export interface ToolResult {
  tool: string;
  args: Record<string, unknown>;
  result: unknown;
  summary: string;
  success: boolean;
}

export interface AgentStep {
  type: "thinking" | "tool_call" | "tool_result" | "final_answer" | "error";
  content: string;
  toolCall?: { tool: string; args: Record<string, unknown> };
  toolResult?: ToolResult;
  timestamp: number;
}

export interface AgentMessage {
  role: "user" | "agent";
  text: string;
  requestId?: string;
  state?: "complete" | "streaming" | "error";
  cached?: boolean;
  retry?: {
    question: string;
    code: string;
  };
  steps?: AgentStep[];
  toolResults?: ToolResult[];
  iterations?: number;
  backend?: string;
  durationMs?: number;
  grounded?: boolean;
  meta?: AgentMeta;
  routing?: UnifiedAiRouteDecision;
  expert?: {
    mode: UnifiedExpertMode;
    needsHumanExpert: boolean;
    disclaimer?: string;
    consultationQuestion: string;
  };
  needsHumanExpert?: boolean;
  escalationCaseCreated?: boolean;
}

export interface AgentProgress {
  stage: UnifiedAiProgressStage;
  capability?: "action" | "expert";
}

export interface AgentStatus {
  ok: boolean;
  status: "ready" | "needs_configuration";
  backend: string;
  llm?: {
    backend: "kimi" | "claude";
    apiKeyConfigured: boolean;
    model: string;
    baseUrl: string | null;
    managedApi: boolean;
  };
  kimi?: {
    apiKeyConfigured: boolean;
    model: string;
    baseUrl: string;
    protocol: string;
    managedApi: boolean;
  };
  claude?: {
    apiKeyConfigured: boolean;
    model: string;
    managedApi: boolean;
  };
  preflight?: {
    enabled: boolean;
    timeoutMs: number;
  };
  persistence?: {
    writableDatabase: boolean;
    chatLog: boolean;
    ledger: boolean;
    piiEncryption: boolean;
  };
  capabilities?: {
    action: { ready: boolean };
    expert: { ready: boolean };
  };
}

export interface AgentSource {
  id: string;
  title: string;
  label: string;
  url: string | null;
  kind: "knowledge" | "school" | "internal";
  owner?: string;
  verifiedAt?: string;
  reviewAfter?: string;
  sourceType?: string;
  reviewStatus?: string;
  checkedBy?: string;
  basis?: string;
  excerpt?: string;
}

export interface AgentSuggestion {
  kind: "school" | "cost" | "documents" | "partner" | "followup";
  label: string;
  prompt: string;
}

export interface AgentClarifyingQuestion {
  slot: string;
  label: string;
  prompt: string;
}

export interface AgentMeta {
  summary: string;
  plan: string[];
  sources: AgentSource[];
  clarifyingQuestions: AgentClarifyingQuestion[];
  suggestions: AgentSuggestion[];
  safetyFlags: string[];
  sourceNotice?: string;
  intentEvidence?: {
    detectedSignals: string[];
    resolvedSlots: { slot: string; value: string | number | boolean }[];
    structuredSlots?: {
      slot: string;
      status: "resolved" | "defaulted" | "missing";
      source: "explicit" | "inferred" | "default";
      value?: string | number | boolean;
      missingSlot?: string;
      requiredFor: string[];
      reason?: string;
    }[];
    slotRequirements?: { slot: string; requiredFor: string[]; reason: string }[];
    planReasons: string[];
    confidenceDrivers: string[];
  };
  quality: {
    backend: string;
    grounded: boolean;
    toolCount: number;
    officialSourceCount: number;
    retrievalBackends?: string[];
    pgvectorResultCount?: number;
    intentConfidence: "low" | "medium" | "high";
    missingSlotCount: number;
    durationMs?: number;
  };
}

export type ClarifyDraft = {
  budget: string;
  schoolName: string;
  region: string;
  program: string;
  visaType: string;
  nationality: string;
  education: string;
  koreanLevel: string;
  goal: string;
};

export type OptionKey =
  | "region"
  | "program"
  | "visaType"
  | "nationality"
  | "education"
  | "koreanLevel"
  | "goal";

export type AgentLocale = Locale;

export function agentSourceAnnotations(message: AgentMessage): SourceAnnotation[] {
  return message.meta?.sources || [];
}
