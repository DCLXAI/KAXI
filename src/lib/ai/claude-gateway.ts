import { redactSensitiveText } from "@/lib/privacy/pii";

export const DEFAULT_ANTHROPIC_MODEL = "claude-opus-4-8";

export type ClaudeRole = "system" | "user" | "assistant";
export type ClaudeGatewayContent =
  | string
  | Array<Record<string, unknown>>;

export interface ClaudeGatewayMessage {
  role: ClaudeRole;
  content: ClaudeGatewayContent;
}

export interface ClaudeGatewayOptions {
  feature: "agent" | "consult" | "structured";
  messages: ClaudeGatewayMessage[];
  maxTokens?: number;
  temperature?: number;
  expectLongResponse?: boolean;
  jsonSchema?: {
    name: string;
    schema: Record<string, unknown>;
  };
}

export interface ClaudeGatewayResult {
  text: string;
  model: string;
  backend: "claude";
  durationMs: number;
  inputChars: number;
  outputChars: number;
}

export class ClaudeNotConfiguredError extends Error {
  constructor(message = "ANTHROPIC_API_KEY is not configured") {
    super(message);
    this.name = "ClaudeNotConfiguredError";
  }
}

type AnthropicClient = {
  messages: {
    create: (body: Record<string, unknown>) => Promise<unknown>;
    stream?: (body: Record<string, unknown>) => unknown;
  };
};

type AnthropicModule = {
  default: new (options: { apiKey: string }) => AnthropicClient;
};

function apiKey(env: NodeJS.ProcessEnv = process.env): string {
  return env.ANTHROPIC_API_KEY?.trim() || "";
}

export function getAnthropicModel(env: NodeJS.ProcessEnv = process.env): string {
  return env.ANTHROPIC_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL;
}

export function isClaudeConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(apiKey(env));
}

export function getClaudeGatewayDiagnostics(env: NodeJS.ProcessEnv = process.env) {
  return {
    apiKeyConfigured: isClaudeConfigured(env),
    model: getAnthropicModel(env),
    thinking: { type: "adaptive" },
    structuredOutput: "output_config.format(json_schema)",
  };
}

function sanitizeMessages(messages: ClaudeGatewayMessage[]): ClaudeGatewayMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: typeof message.content === "string" ? redactSensitiveText(message.content) : message.content,
  }));
}

function splitSystem(messages: ClaudeGatewayMessage[]): { system: string; messages: Array<{ role: "user" | "assistant"; content: ClaudeGatewayContent }> } {
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => (typeof message.content === "string" ? message.content : JSON.stringify(message.content)))
    .join("\n\n")
    .trim();
  const conversation = messages
    .filter((message): message is ClaudeGatewayMessage & { role: "user" | "assistant" } => message.role !== "system")
    .map((message) => ({ role: message.role, content: message.content }));
  return { system, messages: conversation };
}

async function loadAnthropicClient(): Promise<AnthropicClient> {
  const key = apiKey();
  if (!key) throw new ClaudeNotConfiguredError();

  try {
    const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<AnthropicModule>;
    const mod = await dynamicImport("@anthropic-ai/sdk");
    const Anthropic = mod.default;
    return new Anthropic({ apiKey: key });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ClaudeNotConfiguredError(`Anthropic SDK unavailable: ${message}`);
  }
}

function textFromResponse(value: unknown): string {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const content = Array.isArray(record.content) ? record.content : [];
  return content
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const item = part as Record<string, unknown>;
      return typeof item.text === "string" ? item.text : "";
    })
    .join("")
    .trim();
}

async function textFromStream(stream: unknown): Promise<string> {
  const candidate = stream as {
    finalMessage?: () => Promise<unknown>;
    textStream?: AsyncIterable<string>;
    [Symbol.asyncIterator]?: () => AsyncIterator<unknown>;
  };

  if (candidate.finalMessage) return textFromResponse(await candidate.finalMessage());
  if (candidate.textStream) {
    let text = "";
    for await (const chunk of candidate.textStream) text += chunk;
    return text.trim();
  }
  if (candidate[Symbol.asyncIterator]) {
    let text = "";
    for await (const event of stream as AsyncIterable<Record<string, unknown>>) {
      const delta = event.delta && typeof event.delta === "object" ? (event.delta as Record<string, unknown>) : null;
      if (typeof delta?.text === "string") text += delta.text;
    }
    return text.trim();
  }

  return "";
}

function requestBody(options: ClaudeGatewayOptions): Record<string, unknown> {
  const sanitized = sanitizeMessages(options.messages);
  const split = splitSystem(sanitized);
  const body: Record<string, unknown> = {
    model: getAnthropicModel(),
    max_tokens: options.maxTokens ?? 1600,
    temperature: options.temperature ?? 0.2,
    thinking: { type: "adaptive" },
    messages: split.messages,
  };

  if (split.system) {
    body.system = [
      {
        type: "text",
        text: split.system,
        cache_control: { type: "ephemeral" },
      },
    ];
  }
  if (options.jsonSchema) {
    body.output_config = {
      format: {
        type: "json_schema",
        name: options.jsonSchema.name,
        schema: options.jsonSchema.schema,
      },
    };
  }

  return body;
}

export async function generateClaudeText(options: ClaudeGatewayOptions): Promise<ClaudeGatewayResult> {
  const startedAt = Date.now();
  const client = await loadAnthropicClient();
  const body = requestBody(options);
  const inputChars = JSON.stringify(body.messages || "").length + String(body.system || "").length;
  let text = "";

  if (options.expectLongResponse && typeof client.messages.stream === "function") {
    text = await textFromStream(client.messages.stream(body));
  }

  if (!text) {
    text = textFromResponse(await client.messages.create(body));
  }

  return {
    text,
    model: getAnthropicModel(),
    backend: "claude",
    durationMs: Date.now() - startedAt,
    inputChars,
    outputChars: text.length,
  };
}

export async function generateClaudeJson<T>(options: ClaudeGatewayOptions & { jsonSchema: { name: string; schema: Record<string, unknown> } }): Promise<T> {
  const result = await generateClaudeText(options);
  return JSON.parse(result.text) as T;
}

export function isClaudeNotConfiguredError(error: unknown): error is ClaudeNotConfiguredError {
  return error instanceof ClaudeNotConfiguredError;
}
