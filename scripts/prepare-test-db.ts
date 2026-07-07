import { spawnSync } from "child_process";

function isPostgresUrl(value: string | undefined): value is string {
  return /^postgres(?:ql)?:\/\//i.test((value || "").trim());
}

function fail(message: string): never {
  throw new Error(`[prepare-test-db] ${message}`);
}

export function prepareTestDb(label: string): void {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!isPostgresUrl(databaseUrl)) {
    fail(`${label} requires DATABASE_URL=postgresql://...`);
  }

  const result = spawnSync(
    "bunx",
    [
      "prisma",
      "migrate",
      "reset",
      "--force",
      "--skip-generate",
      "--skip-seed",
      "--schema",
      "prisma/postgres/schema.prisma",
    ],
    {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env,
    }
  );

  if (result.status !== 0) {
    fail(`${label} database reset failed with exit ${result.status}`);
  }
}
