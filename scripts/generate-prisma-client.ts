import { spawnSync } from "child_process";

function isPostgresUrl(value: string | undefined): boolean {
  return /^postgres(?:ql)?:\/\//i.test((value || "").trim());
}

function databaseUrlForGeneration(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const postgresUrl = process.env.POSTGRES_URL?.trim();
  if (postgresUrl && (!databaseUrl || databaseUrl.includes("/home/z/my-project"))) {
    process.env.DATABASE_URL = postgresUrl;
    return postgresUrl;
  }

  if (databaseUrl) return databaseUrl;

  return "";
}

const databaseUrl = databaseUrlForGeneration();
const schema = isPostgresUrl(databaseUrl) ? "prisma/postgres/schema.prisma" : "prisma/schema.prisma";
const provider = schema.includes("/postgres/") ? "postgresql" : "sqlite";

console.log(`[prisma] generating ${provider} client from ${schema}`);

const result = spawnSync("bunx", ["prisma", "generate", "--schema", schema], {
  stdio: "inherit",
  env: process.env,
});

if (result.status !== 0) {
  process.exit(result.status || 1);
}
