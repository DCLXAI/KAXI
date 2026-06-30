import { existsSync } from "fs";
import { join } from "path";

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

export async function createZaiClient(feature: string) {
  if (!isZaiConfigured()) {
    throw new Error(
      `Z.ai is not configured for ${feature}. Use AGENT_BACKEND=codex or configure ZAI_ENABLED/ZAI_CONFIG_PATH explicitly.`
    );
  }

  const ZAIModule = await import("z-ai-web-dev-sdk");
  const ZAI = ZAIModule.default;
  return ZAI.create();
}

export function isZaiConfigurationError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("Z.ai is not configured");
}
