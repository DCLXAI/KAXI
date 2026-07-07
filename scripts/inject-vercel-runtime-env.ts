import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const ENV_FILE = join(ROOT, ".vercel", ".env.production.local");
const FUNCTIONS_DIR = join(ROOT, ".vercel", "output", "functions");

const DEFAULT_RUNTIME_ENV_KEYS = [
  "ADMIN_API_KEY",
  "ADMIN_EMAIL",
  "ADMIN_MFA_TOTP_SECRET",
  "ADMIN_PASSWORD_HASH",
  "ADMIN_PASSWORD_PEPPER",
  "AI_ALLOW_LLM_FALLBACK",
  "AI_AGENT_CONTEXT_MAX_CHARS",
  "AI_AGENT_DAILY_QUOTA",
  "AI_AGENT_GROUNDED_QUESTION_MAX_CHARS",
  "AI_AGENT_LEDGER_ENABLED",
  "AI_AGENT_LOGGING_ENABLED",
  "AI_AGENT_MAX_CHARS",
  "AI_CONSULT_DAILY_QUOTA",
  "AI_CONSULT_MAX_CHARS",
  "AI_CONSULT_RATE_LIMIT",
  "AI_REQUIRE_LLM",
  "AI_AGENT_RATE_LIMIT",
  "AI_AGENT_PREFLIGHT_ENABLED",
  "AI_AGENT_PREFLIGHT_TIMEOUT_MS",
  "AI_AGENT_TIMEOUT_MS",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_MODEL",
  "BLOB_READ_WRITE_TOKEN",
  "CRON_SECRET",
  "DATABASE_URL",
  "DATA_ENCRYPTION_KEY",
  "DOCUMENT_UPLOAD_SIGNING_SECRET",
  "DOCUMENT_UPLOAD_STORAGE_BACKEND",
  "KNOWLEDGE_MONITOR_ALERT_FORMAT",
  "KNOWLEDGE_MONITOR_ALERT_SIGNING_SECRET",
  "KNOWLEDGE_MONITOR_ALERT_WEBHOOK_URL",
  "NEXTAUTH_SECRET",
  "NEXT_PUBLIC_MAPBOX_TOKEN",
  "PII_HASH_SECRET",
  "POSTGRES_URL",
  "PRISMA_DATABASE_URL",
];

function parseEnv(content: string): Record<string, string> {
  const env: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value.replace(/\\n/g, "\n").replace(/\\"/g, '"');
  }

  return env;
}

function configuredKeys(): string[] {
  const configured = process.env.VERCEL_RUNTIME_ENV_KEYS?.trim();
  if (!configured) return DEFAULT_RUNTIME_ENV_KEYS;

  return configured
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
}

function listFunctionConfigs(dir: string): string[] {
  if (!existsSync(dir)) return [];

  const configs: string[] = [];
  for (const entry of readdirSync(dir)) {
    const pathname = join(dir, entry);
    const stat = statSync(pathname);
    if (stat.isDirectory()) {
      if (entry.endsWith(".func")) {
        const configPath = join(pathname, ".vc-config.json");
        if (existsSync(configPath)) configs.push(configPath);
      } else {
        configs.push(...listFunctionConfigs(pathname));
      }
    }
  }
  return configs;
}

if (!existsSync(ENV_FILE)) {
  console.log("[inject-vercel-runtime-env] skipped: .vercel/.env.production.local not found");
  process.exit(0);
}

const pulledEnv = parseEnv(readFileSync(ENV_FILE, "utf8"));
const runtimeEnv: Record<string, string> = {};
for (const key of configuredKeys()) {
  const value = pulledEnv[key] || process.env[key];
  if (value) runtimeEnv[key] = value;
}

const configs = listFunctionConfigs(FUNCTIONS_DIR);
for (const configPath of configs) {
  const config = JSON.parse(readFileSync(configPath, "utf8")) as {
    environment?: Record<string, string>;
  };
  config.environment = { ...(config.environment || {}), ...runtimeEnv };
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

console.log(
  `[inject-vercel-runtime-env] injected ${Object.keys(runtimeEnv).sort().join(", ") || "no"} key(s) into ${configs.length} function config(s)`
);
