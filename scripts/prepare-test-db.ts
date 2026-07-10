import { spawnSync } from "child_process";
import { createHash } from "crypto";
import { closeSync, openSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

function isPostgresUrl(value: string | undefined): value is string {
  return /^postgres(?:ql)?:\/\//i.test((value || "").trim());
}

function fail(message: string): never {
  throw new Error(`[prepare-test-db] ${message}`);
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
let activeLockPath: string | undefined;

function releaseTestDbLock() {
  if (!activeLockPath) return;
  try {
    unlinkSync(activeLockPath);
  } catch {
    // The lock may already have been removed after an interrupted test.
  }
  activeLockPath = undefined;
}

function processIsRunning(pid: number) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function acquireTestDbLock(databaseUrl: string, databaseName: string) {
  const digest = createHash("sha256").update(databaseUrl).digest("hex").slice(0, 16);
  const lockPath = join(tmpdir(), `kaxi-test-db-${digest}.lock`);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const fd = openSync(lockPath, "wx", 0o600);
      writeFileSync(fd, `${process.pid}\n`, "utf8");
      closeSync(fd);
      activeLockPath = lockPath;
      process.once("exit", releaseTestDbLock);
      return;
    } catch (error) {
      const code = error instanceof Error && "code" in error ? String(error.code) : "";
      if (code !== "EEXIST") throw error;

      const ownerPid = Number.parseInt(readFileSync(lockPath, "utf8").trim(), 10);
      if (processIsRunning(ownerPid)) {
        fail(`another test process (${ownerPid}) is already using ${databaseName}`);
      }
      unlinkSync(lockPath);
    }
  }

  fail(`could not acquire the reset lock for ${databaseName}`);
}

function validateTestDatabaseUrl(label: string) {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1" || process.env.VERCEL_ENV) {
    fail(`${label} cannot reset a database in a hosted or production runtime`);
  }

  const databaseUrl = process.env.TEST_DATABASE_URL?.trim();
  if (!isPostgresUrl(databaseUrl)) {
    fail(`${label} requires an explicit TEST_DATABASE_URL=postgresql://...`);
  }

  const parsed = new URL(databaseUrl);
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!LOOPBACK_HOSTS.has(parsed.hostname)) {
    fail(`${label} only permits a loopback TEST_DATABASE_URL host`);
  }
  if (!/(?:^|[_-])test(?:[_-]\d+)?$/i.test(databaseName)) {
    fail(`${label} requires a database name ending in _test (received ${databaseName || "empty"})`);
  }

  return { databaseUrl, databaseName };
}

export function prepareTestDb(label: string): void {
  const { databaseUrl, databaseName } = validateTestDatabaseUrl(label);
  acquireTestDbLock(databaseUrl, databaseName);

  // All Prisma clients imported after this call resolve the isolated test DB.
  process.env.DATABASE_URL = databaseUrl;

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
      env: { ...process.env, DATABASE_URL: databaseUrl },
    }
  );

  if (result.status !== 0) {
    releaseTestDbLock();
    fail(`${label} database reset failed with exit ${result.status}`);
  }
}
