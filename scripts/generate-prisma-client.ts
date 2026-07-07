import { spawnSync } from "child_process";

const POSTGRES_PLACEHOLDER_URL = "postgresql://postgres:postgres@localhost:5432/kaxi";

function isPostgresUrl(value: string | undefined): value is string {
  return /^postgres(?:ql)?:\/\//i.test((value || "").trim());
}

function canonicalDatabaseUrl(): string {
  for (const key of [
    "DATABASE_URL",
    "POSTGRES_URL",
    "SUPABASE_DATABASE_URL",
    "SUPABASE_POOLER_URL",
    "SUPABASE_DIRECT_URL",
  ]) {
    const value = process.env[key]?.trim();
    if (isPostgresUrl(value)) return value;
  }

  return POSTGRES_PLACEHOLDER_URL;
}

process.env.DATABASE_URL = canonicalDatabaseUrl();

console.log("[prisma] generating postgresql client from prisma/postgres/schema.prisma");

const result = spawnSync("bunx", ["prisma", "generate", "--schema", "prisma/postgres/schema.prisma"], {
  stdio: "inherit",
  env: process.env,
});

if (result.status !== 0) {
  process.exit(result.status || 1);
}
