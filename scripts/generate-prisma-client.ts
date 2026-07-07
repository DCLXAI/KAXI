import { spawnSync } from "child_process";

function isPostgresUrl(value: string | undefined): boolean {
  return /^postgres(?:ql)?:\/\//i.test((value || "").trim());
}

function isPrismaPostgresUrl(value: string | undefined): boolean {
  return /^prisma\+postgres:\/\//i.test((value || "").trim());
}

function providerOverride(): "postgresql" | "sqlite" | null {
  const value = (
    process.env.KAXI_PRISMA_PROVIDER ||
    process.env.PRISMA_SCHEMA_PROVIDER ||
    ""
  ).trim().toLowerCase();

  if (value === "postgres" || value === "postgresql") return "postgresql";
  if (value === "sqlite") return "sqlite";
  return null;
}

function databaseUrlForGeneration(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const postgresUrl = process.env.POSTGRES_URL?.trim();
  const supabaseDatabaseUrl = process.env.SUPABASE_DATABASE_URL?.trim();
  const supabasePoolerUrl = process.env.SUPABASE_POOLER_URL?.trim();
  if (postgresUrl && (!databaseUrl || databaseUrl.includes("/home/z/my-project"))) {
    process.env.DATABASE_URL = postgresUrl;
    return postgresUrl;
  }

  if (supabaseDatabaseUrl && (!databaseUrl || databaseUrl.includes("/home/z/my-project") || databaseUrl.startsWith("file:"))) {
    process.env.DATABASE_URL = supabaseDatabaseUrl;
    return supabaseDatabaseUrl;
  }

  if (supabasePoolerUrl && (!databaseUrl || databaseUrl.includes("/home/z/my-project") || databaseUrl.startsWith("file:"))) {
    process.env.DATABASE_URL = supabasePoolerUrl;
    return supabasePoolerUrl;
  }

  if (databaseUrl) return databaseUrl;

  return "";
}

const databaseUrl = databaseUrlForGeneration();
const forcedProvider = providerOverride();
const provider =
  forcedProvider ||
  (isPostgresUrl(databaseUrl) ||
  isPostgresUrl(process.env.POSTGRES_URL) ||
  isPostgresUrl(process.env.SUPABASE_DATABASE_URL) ||
  isPostgresUrl(process.env.SUPABASE_POOLER_URL) ||
  isPrismaPostgresUrl(process.env.PRISMA_DATABASE_URL)
    ? "postgresql"
    : "sqlite");
const schema = provider === "postgresql" ? "prisma/postgres/schema.prisma" : "prisma/schema.prisma";

console.log(`[prisma] generating ${provider} client from ${schema}`);

const result = spawnSync("bunx", ["prisma", "generate", "--schema", schema], {
  stdio: "inherit",
  env: process.env,
});

if (result.status !== 0) {
  process.exit(result.status || 1);
}
