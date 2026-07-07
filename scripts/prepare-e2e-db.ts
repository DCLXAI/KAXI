import { spawnSync } from "child_process";

function isPostgresUrl(value: string | undefined): value is string {
  return /^postgres(?:ql)?:\/\//i.test((value || "").trim());
}

if (!isPostgresUrl(process.env.DATABASE_URL)) {
  console.error("FAIL E2E database preparation requires DATABASE_URL=postgresql://...");
  process.exit(1);
}

for (const command of [
  ["bun", "run", "db:migrate:deploy"],
  ["bun", "run", "db:seed:schools"],
  ["bun", "run", "db:seed:synonyms"],
  ["bun", "run", "db:seed:rules"],
]) {
  const result = spawnSync(command[0], command.slice(1), {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
