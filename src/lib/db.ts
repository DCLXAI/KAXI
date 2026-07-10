import { PrismaClient, type Prisma } from "@prisma/client";

export type RuntimeDatabaseKind = "missing" | "postgresql" | "unsupported";

export interface RuntimeDatabaseInfo {
  kind: RuntimeDatabaseKind;
  source:
    | "DATABASE_URL"
    | "POSTGRES_URL"
    | "SUPABASE_DATABASE_URL"
    | "SUPABASE_POOLER_URL"
    | "default";
  hostedRuntime: boolean;
  writable: boolean;
  sharedWritable: boolean;
  postgresqlConfigured: boolean;
  activePrismaProvider: "postgresql";
  reason: string;
}

function configured(value: string | undefined): boolean {
  const trimmed = value?.trim() || "";
  return Boolean(trimmed) && !/^replace-with-/i.test(trimmed);
}

function isHostedRuntime(env: NodeJS.ProcessEnv): boolean {
  return env.VERCEL === "1" || Boolean(env.VERCEL_ENV);
}

function isPostgresUrl(value: string | undefined): value is string {
  return /^postgres(?:ql)?:\/\//i.test((value || "").trim());
}

function postgresHostname(value: string) {
  try {
    return new URL(value).hostname.replace(/^\[|\]$/g, "").toLowerCase();
  } catch {
    return "";
  }
}

export function isSharedPostgresUrl(value: string | undefined) {
  if (!isPostgresUrl(value)) return false;
  const hostname = postgresHostname(value);
  if (!hostname) return false;
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "::1" ||
    hostname === "0.0.0.0" ||
    /^127(?:\.\d{1,3}){3}$/.test(hostname)
  ) {
    return false;
  }
  return hostname.includes(".") || hostname.includes(":") || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
}

function databaseUrlFromEnv(env: NodeJS.ProcessEnv) {
  const databaseUrl = env.DATABASE_URL?.trim();
  const postgresUrl = env.POSTGRES_URL?.trim();
  const supabaseDatabaseUrl = env.SUPABASE_DATABASE_URL?.trim();
  const supabasePoolerUrl = env.SUPABASE_POOLER_URL?.trim();

  if (isPostgresUrl(databaseUrl)) return { url: databaseUrl, source: "DATABASE_URL" as const };
  if (isPostgresUrl(postgresUrl)) return { url: postgresUrl, source: "POSTGRES_URL" as const };
  if (isPostgresUrl(supabaseDatabaseUrl)) {
    return { url: supabaseDatabaseUrl, source: "SUPABASE_DATABASE_URL" as const };
  }
  if (isPostgresUrl(supabasePoolerUrl)) {
    return { url: supabasePoolerUrl, source: "SUPABASE_POOLER_URL" as const };
  }
  if (configured(databaseUrl)) return { url: databaseUrl || "", source: "DATABASE_URL" as const };

  return { url: "", source: "default" as const };
}

function normalizeDatabaseEnv() {
  const { url } = databaseUrlFromEnv(process.env);
  if (isPostgresUrl(url)) {
    process.env.DATABASE_URL = url;
  }
}

normalizeDatabaseEnv();

export function getRuntimeDatabaseInfo(env: NodeJS.ProcessEnv = process.env): RuntimeDatabaseInfo {
  const { url, source } = databaseUrlFromEnv(env);
  const hostedRuntime = isHostedRuntime(env);
  const postgresqlConfigured = isPostgresUrl(url);

  if (!url) {
    return {
      kind: "missing",
      source,
      hostedRuntime,
      writable: false,
      sharedWritable: false,
      postgresqlConfigured: false,
      activePrismaProvider: "postgresql",
      reason: "PostgreSQL DATABASE_URL or Supabase Postgres alias is not configured.",
    };
  }

  if (!postgresqlConfigured) {
    return {
      kind: "unsupported",
      source,
      hostedRuntime,
      writable: false,
      sharedWritable: false,
      postgresqlConfigured: false,
      activePrismaProvider: "postgresql",
      reason: "KAXI Phase 0 requires Supabase/PostgreSQL; non-PostgreSQL database URLs are not supported.",
    };
  }

  const sharedWritable = isSharedPostgresUrl(url);
  const writable = !hostedRuntime || sharedWritable;
  return {
    kind: "postgresql",
    source,
    hostedRuntime,
    writable,
    sharedWritable,
    postgresqlConfigured: true,
    activePrismaProvider: "postgresql",
    reason: sharedWritable
      ? "A shared PostgreSQL operational database is configured."
      : hostedRuntime
        ? "Hosted runtimes cannot use loopback or local-only PostgreSQL targets."
        : "A local PostgreSQL development database is configured; it is not a shared operational database.",
  };
}

function createPrismaClient() {
  const log: Prisma.LogLevel[] = process.env.DEBUG_PRISMA === "true" ? ["query"] : [];
  return new PrismaClient({ log });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export function canWriteRuntimeDatabase(): boolean {
  return getRuntimeDatabaseInfo().writable;
}

export function canUseSharedRuntimeDatabase(): boolean {
  return getRuntimeDatabaseInfo().sharedWritable;
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
