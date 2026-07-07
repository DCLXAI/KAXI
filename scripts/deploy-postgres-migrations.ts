import { spawnSync } from "child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const ENV_FILE = join(ROOT, ".vercel", ".env.production.local");
const FUNCTIONS_DIR = join(ROOT, ".vercel", "output", "functions");
const POSTGRES_KEYS = [
  "SUPABASE_DIRECT_URL",
  "DATABASE_URL",
  "POSTGRES_URL",
  "SUPABASE_DATABASE_URL",
  "SUPABASE_POOLER_URL",
] as const;

type EnvSource = {
  label: string;
  values: Record<string, string | undefined>;
};

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

function isDirectPostgresUrl(value: string | undefined): value is string {
  return /^postgres(?:ql)?:\/\//i.test((value || "").trim());
}

function isPrismaAccelerateUrl(value: string | undefined): boolean {
  return /^prisma\+postgres:\/\//i.test((value || "").trim());
}

function summarizeValue(value: string | undefined): string {
  if (!value) return "empty";
  if (isDirectPostgresUrl(value)) return "postgres-direct";
  if (isPrismaAccelerateUrl(value)) return "prisma-accelerate";
  if (/^file:/i.test(value)) return "sqlite-file";
  return "unsupported";
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

function readFunctionEnv(configPath: string): Record<string, string | undefined> {
  try {
    const config = JSON.parse(readFileSync(configPath, "utf8")) as {
      environment?: Record<string, string>;
    };
    return config.environment || {};
  } catch {
    return {};
  }
}

function buildSources(): EnvSource[] {
  const sources: EnvSource[] = [
    {
      label: "process.env",
      values: process.env,
    },
  ];

  if (existsSync(ENV_FILE)) {
    sources.push({
      label: ".vercel/.env.production.local",
      values: parseEnv(readFileSync(ENV_FILE, "utf8")),
    });
  }

  for (const configPath of listFunctionConfigs(FUNCTIONS_DIR)) {
    sources.push({
      label: configPath.replace(`${ROOT}/`, ""),
      values: readFunctionEnv(configPath),
    });
  }

  return sources;
}

function findPostgresUrl(sources: EnvSource[]): { key: string; source: string; value: string } | null {
  for (const source of sources) {
    for (const key of POSTGRES_KEYS) {
      const value = source.values[key]?.trim();
      if (isDirectPostgresUrl(value)) {
        return { key, source: source.label, value };
      }
    }
  }

  return null;
}

const sources = buildSources();
const postgresUrl = findPostgresUrl(sources);

if (!postgresUrl) {
  const summaryItems = sources.flatMap((source) =>
    POSTGRES_KEYS.map((key) => `${source.label}:${key}=${summarizeValue(source.values[key])}`)
  );
  const summary =
    summaryItems.slice(0, 24).join(", ") +
    (summaryItems.length > 24 ? `, ... ${summaryItems.length - 24} more` : "");
  console.error(
    `[deploy-postgres-migrations] direct PostgreSQL URL not found. ` +
      `Set DATABASE_URL, POSTGRES_URL, or SUPABASE_DIRECT_URL to postgres:// or postgresql:// before deploying. ` +
      `Detected: ${summary || "no environment sources"}`
  );
  process.exit(1);
}

console.log(
  `[deploy-postgres-migrations] applying migrations using ${postgresUrl.key} from ${postgresUrl.source}`
);

const result = spawnSync(
  "bunx",
  ["prisma", "migrate", "deploy", "--schema", "prisma/postgres/schema.prisma"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: postgresUrl.value,
    },
  }
);

if (result.status !== 0) {
  process.exit(result.status || 1);
}
