export type LlmBackend = "kimi" | "claude";
export type LlmRole = "system" | "user" | "assistant";
export type LlmGatewayContent = string | Array<Record<string, unknown>>;

export interface LlmGatewayMessage {
  role: LlmRole;
  content: LlmGatewayContent;
}

export interface LlmGatewayOptions {
  feature: "agent" | "consult" | "structured";
  messages: LlmGatewayMessage[];
  maxTokens?: number;
  timeoutMs?: number;
  temperature?: number;
  thinking?: "enabled" | "disabled";
  expectLongResponse?: boolean;
  jsonSchema?: {
    name: string;
    schema: Record<string, unknown>;
  };
}

export interface LlmGatewayResult {
  text: string;
  model: string;
  backend: LlmBackend;
  durationMs: number;
  inputChars: number;
  outputChars: number;
  attempts?: number;
  primaryBackend?: LlmBackend;
  fallbackReason?: string | null;
}
