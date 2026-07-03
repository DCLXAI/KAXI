import { existsSync } from "fs";
import { join } from "path";
import type ZAI from "z-ai-web-dev-sdk";
import type { ChatMessage, CreateChatCompletionBody } from "z-ai-web-dev-sdk";

export type ZaiChatMessage = ChatMessage;
export type ZaiChatCompletionBody = Omit<CreateChatCompletionBody, "messages"> & {
  messages: ZaiChatMessage[];
};

function hasConfigFile(): boolean {
  const explicitPath = process.env.ZAI_CONFIG_PATH?.trim();
  const candidates = [
    explicitPath,
    join(process.cwd(), ".z-ai-config"),
  ].filter(Boolean) as string[];

  return candidates.some((path) => {
    try {
      return existsSync(path);
    } catch {
      return false;
    }
  });
}

export function isZaiConfigured(): boolean {
  if (process.env.ZAI_ENABLED === "false") return false;
  return (
    process.env.ZAI_ENABLED === "true" ||
    Boolean(process.env.ZAI_API_KEY?.trim()) ||
    Boolean(process.env.ZAI_CONFIG_PATH?.trim()) ||
    hasConfigFile()
  );
}

export async function createZaiClient(feature: string): Promise<ZAI> {
  if (!isZaiConfigured()) {
    throw new Error(
      `Z.ai is not configured for ${feature}. Use AGENT_BACKEND=codex or configure ZAI_ENABLED/ZAI_CONFIG_PATH explicitly.`
    );
  }

  const ZAIModule = await import("z-ai-web-dev-sdk");
  const ZAI = ZAIModule.default;
  return ZAI.create();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function firstChatCompletionText(completion: unknown): string | null {
  if (!isRecord(completion) || !Array.isArray(completion.choices)) return null;
  const first = completion.choices[0];
  if (!isRecord(first) || !isRecord(first.message)) return null;
  return typeof first.message.content === "string" ? first.message.content : null;
}

export async function generateZaiChatText(
  feature: string,
  body: ZaiChatCompletionBody
): Promise<string | null> {
  const zai = await createZaiClient(feature);
  return completeZaiChatText(zai, body);
}

export async function completeZaiChatText(
  zai: ZAI,
  body: ZaiChatCompletionBody
): Promise<string | null> {
  const completion: unknown = await zai.chat.completions.create(body);
  return firstChatCompletionText(completion);
}

export function isZaiConfigurationError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("Z.ai is not configured");
}
