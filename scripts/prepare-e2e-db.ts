import { spawnSync } from "child_process";

function isPostgresUrl(value: string | undefined): value is string {
  return /^postgres(?:ql)?:\/\//i.test((value || "").trim());
}

if (!isPostgresUrl(process.env.TEST_DATABASE_URL)) {
  console.error("FAIL E2E database preparation requires TEST_DATABASE_URL=postgresql://...");
  process.exit(1);
}

const target = new URL(process.env.TEST_DATABASE_URL);
if (!["localhost", "127.0.0.1", "::1"].includes(target.hostname) || !target.pathname.slice(1).endsWith("_test")) {
  console.error("FAIL E2E database must be a loopback PostgreSQL database whose name ends with _test");
  process.exit(1);
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

for (const command of [
  ["bun", "run", "scripts/prepare-test-db.ts"],
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
