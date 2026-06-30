import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql/web";
import { join } from "path";

export type RuntimeDatabaseKind = "missing" | "file" | "libsql" | "unsupported-managed";

export interface RuntimeDatabaseInfo {
  kind: RuntimeDatabaseKind;
  source: "DATABASE_URL" | "TURSO_DATABASE_URL" | "default";
  hostedRuntime: boolean;
  writable: boolean;
  sharedWritable: boolean;
  libSqlAuthConfigured: boolean;
  reason: string;
}

function configured(value: string | undefined): boolean {
  const trimmed = value?.trim() || "";
  return Boolean(trimmed) && !/^replace-with-/i.test(trimmed);
}

function isHostedRuntime(env: NodeJS.ProcessEnv): boolean {
  return env.VERCEL === "1" || Boolean(env.VERCEL_ENV);
}

function defaultDatabaseUrl(): string {
  return `file:${join(process.cwd(), "db", "custom.db")}`;
}

function normalizeDatabaseEnv() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();
  if (!databaseUrl || databaseUrl.includes("/home/z/my-project")) {
    process.env.DATABASE_URL = tursoUrl || defaultDatabaseUrl();
  }
}

normalizeDatabaseEnv();

function databaseUrlFromEnv(env: NodeJS.ProcessEnv) {
  const tursoUrl = env.TURSO_DATABASE_URL?.trim();
  const databaseUrl = env.DATABASE_URL?.trim();
  if (tursoUrl) return { url: tursoUrl, source: "TURSO_DATABASE_URL" as const };
  if (databaseUrl) return { url: databaseUrl, source: "DATABASE_URL" as const };
  return { url: "", source: "default" as const };
}

function isLibSqlUrl(url: string): boolean {
  return /^(libsql|wss|https):\/\//i.test(url);
}

export function getRuntimeDatabaseInfo(env: NodeJS.ProcessEnv = process.env): RuntimeDatabaseInfo {
  const { url, source } = databaseUrlFromEnv(env);
  const hostedRuntime = isHostedRuntime(env);
  const libSqlAuthConfigured = configured(env.TURSO_AUTH_TOKEN) || configured(env.DATABASE_AUTH_TOKEN);

  if (!url) {
    return {
      kind: "missing",
      source,
      hostedRuntime,
      writable: false,
      sharedWritable: false,
      libSqlAuthConfigured,
      reason: "DATABASE_URL or TURSO_DATABASE_URL is not configured.",
    };
  }

  if (url.startsWith("file:")) {
    const writable = !hostedRuntime;
    return {
      kind: "file",
      source,
      hostedRuntime,
      writable,
      sharedWritable: false,
      libSqlAuthConfigured,
      reason: writable
        ? "Local SQLite file is writable for development."
        : "Hosted deployments cannot rely on bundled file SQLite for writes.",
    };
  }

  if (isLibSqlUrl(url)) {
    return {
      kind: "libsql",
      source,
      hostedRuntime,
      writable: libSqlAuthConfigured,
      sharedWritable: libSqlAuthConfigured,
      libSqlAuthConfigured,
      reason: libSqlAuthConfigured
        ? "libSQL/Turso managed database is configured."
        : "TURSO_AUTH_TOKEN or DATABASE_AUTH_TOKEN is required for managed libSQL writes.",
    };
  }

  return {
    kind: "unsupported-managed",
    source,
    hostedRuntime,
    writable: false,
    sharedWritable: false,
    libSqlAuthConfigured,
    reason: "This build uses the Prisma sqlite provider; use file: locally or libsql:// with the libSQL adapter.",
  };
}

function createPrismaClient() {
  const log: Prisma.LogLevel[] = process.env.DEBUG_PRISMA === "true" ? ["query"] : [];
  const info = getRuntimeDatabaseInfo();

  if (info.kind === "libsql") {
    const { url } = databaseUrlFromEnv(process.env);
    const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN;
    return new PrismaClient({
      adapter: new PrismaLibSQL({
        url,
        ...(authToken ? { authToken } : {}),
      }),
      log,
    });
  }

  return new PrismaClient({ log });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

export function canWriteRuntimeDatabase(): boolean {
  return getRuntimeDatabaseInfo().writable
}

export function canUseSharedRuntimeDatabase(): boolean {
  return getRuntimeDatabaseInfo().sharedWritable
}

export async function checkRuntimeDatabaseConnectivity(): Promise<{ ok: boolean; detail: string }> {
  const info = getRuntimeDatabaseInfo();
  if (!info.writable) return { ok: false, detail: info.reason };

  try {
    await db.$queryRaw`SELECT 1`;
    return { ok: true, detail: info.reason };
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}
