import { execFileSync } from "child_process";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import {
  TYPEBOT_RUNTIME_LOCALES,
  TypebotRuntimeTurn,
  validatePublishedTypebotRuntime,
  validatePublishedTypebotStart,
} from "../src/lib/typebot/runtime-health";

type CutoverStage = "source" | "backend" | "typebot";

type ReadinessCheck = {
  key?: string;
  ok?: boolean;
  severity?: string;
  metadata?: Record<string, unknown>;
};

type ReadinessPayload = {
  status?: string;
  checks?: ReadinessCheck[];
};

const ROOT = process.cwd();
const FAILURE_TEXT = /unauthori[sz]ed|인증되지 않은 요청|서명 검증|gateway secret|internal error|요청을 처리하지 못/i;

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

export function cookieHeaderFromNetscapeFile(pathname: string | undefined, requestUrl: string) {
  if (!pathname) return "";

  let content = "";
  try {
    content = readFileSync(pathname, "utf8");
  } catch {
    throw new Error("Vercel protection bypass cookie file could not be read");
  }

  const url = new URL(requestUrl);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const cookies: string[] = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.startsWith("#HttpOnly_") ? rawLine.slice("#HttpOnly_".length) : rawLine;
    if (!line || line.startsWith("#")) continue;

    const [domain, , cookiePath, secure, expiresAt, name, value] = line.split("\t");
    if (!domain || !name || value === undefined) continue;

    const normalizedDomain = domain.replace(/^\./, "");
    const domainMatches = url.hostname === normalizedDomain || url.hostname.endsWith(`.${normalizedDomain}`);
    const pathMatches = url.pathname.startsWith(cookiePath || "/");
    const secureMatches = secure !== "TRUE" || url.protocol === "https:";
    const expiry = Number.parseInt(expiresAt || "0", 10);
    const unexpired = !Number.isFinite(expiry) || expiry === 0 || expiry > nowSeconds;
    if (domainMatches && pathMatches && secureMatches && unexpired) {
      cookies.push(`${name}=${value}`);
    }
  }

  if (!cookies.length) {
    throw new Error("Vercel protection bypass cookie file has no cookie for the canary URL");
  }
  return cookies.join("; ");
}

function withCutoverAuth(url: string, init?: RequestInit): RequestInit {
  const cookie = cookieHeaderFromNetscapeFile(argument("cookie-file"), url);
  if (!cookie) return init || {};

  const headers = new Headers(init?.headers);
  headers.set("cookie", cookie);
  return { ...init, headers };
}

function git(...args: string[]) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

export function latestMigrationName(root = ROOT) {
  const migrationRoot = join(root, "prisma", "postgres", "migrations");
  return readdirSync(migrationRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{14}_/.test(entry.name))
    .map((entry) => entry.name)
    .sort()
    .at(-1) || "";
}

export function declaredRequiredMigration(root = ROOT) {
  const source = readFileSync(join(root, "src", "lib", "ops", "schema-parity.ts"), "utf8");
  return source.match(/REQUIRED_PRODUCTION_MIGRATION\s*=\s*"([^"]+)"/)?.[1] || "";
}

export function readinessGateErrors(payload: ReadinessPayload, expectedMigration: string) {
  const errors: string[] = [];
  const checks = new Map((payload.checks || []).map((check) => [check.key, check]));
  if (payload.status !== "ready") errors.push(`readiness status is ${payload.status || "missing"}`);

  for (const key of [
    "database.schema_parity",
    "ai.backend_policy",
    "typebot.gateway_auth",
    "chat.attachment_ocr_provider",
  ]) {
    if (checks.get(key)?.ok !== true) errors.push(`${key} is not ready`);
  }

  const schemaMigration = checks.get("database.schema_parity")?.metadata?.latestMigration;
  if (schemaMigration !== expectedMigration) {
    errors.push(`database migration ${String(schemaMigration || "missing")} does not match ${expectedMigration}`);
  }

  const attachment = checks.get("chat.attachment_malware_scanner");
  if (attachment?.ok !== true) errors.push("attachment malware posture is not fail-closed");
  const attachmentMetadata = attachment?.metadata || {};
  const structurallyProtected =
    attachmentMetadata.mode === "structural" &&
    attachmentMetadata.structuralSanitization === true &&
    attachmentMetadata.externalScannerRequired === false;
  if (
    attachmentMetadata.uploadsEnabled === true &&
    attachmentMetadata.externalScannerConfigured !== true &&
    !structurallyProtected
  ) {
    errors.push("attachment uploads are enabled without an approved scanner policy");
  }
  return errors;
}

export function typebotGateErrors(start: TypebotRuntimeTurn, continuation: TypebotRuntimeTurn) {
  return validatePublishedTypebotRuntime(start, continuation, { requireHandoffConsent: true });
}

function safeBaseUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("Cutover base URL must use HTTPS");
  }
  return url.origin;
}

async function fetchJson(url: string, init?: RequestInit, timeoutMs = 60_000) {
  const response = await fetch(url, withCutoverAuth(url, { ...init, signal: AbortSignal.timeout(timeoutMs) }));
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

function responseAnswer(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const value = payload as Record<string, unknown>;
  for (const key of ["answer", "message", "content", "response"]) {
    if (typeof value[key] === "string") return value[key].trim();
  }
  return "";
}

async function runSourceGate() {
  const dirty = git("status", "--porcelain", "--untracked-files=all");
  if (dirty) throw new Error(`source tree is dirty (${dirty.split("\n").length} paths)`);

  const expectedBranch = argument("branch") || "main";
  const branch = git("branch", "--show-current");
  if (branch !== expectedBranch) throw new Error(`release branch is ${branch || "detached"}, expected ${expectedBranch}`);

  const head = git("rev-parse", "HEAD");
  const expectedSha = argument("expected-sha") || process.env.EXPECTED_SHA?.trim();
  if (expectedSha && head !== expectedSha) throw new Error(`HEAD ${head} does not match expected SHA ${expectedSha}`);

  const latestMigration = latestMigrationName();
  const declaredMigration = declaredRequiredMigration();
  if (!latestMigration || latestMigration !== declaredMigration) {
    throw new Error(`schema parity gate ${declaredMigration || "missing"} does not match latest migration ${latestMigration || "missing"}`);
  }
  return { stage: "source", branch, head, latestMigration };
}

async function runBackendGate() {
  const baseUrl = safeBaseUrl(argument("base-url") || process.env.CUTOVER_BASE_URL || "https://kaxi.vercel.app");
  const expectedMigration = latestMigrationName();
  let readiness: ReadinessPayload | null = null;
  let readinessStatus = 0;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const result = await fetchJson(`${baseUrl}/api/readiness`, undefined, 30_000).catch(() => null);
    readinessStatus = result?.response.status || 0;
    readiness = result?.payload as ReadinessPayload | null;
    if (readinessStatus === 200 && readiness?.status === "ready") break;
    await Bun.sleep(5_000);
  }
  if (!readiness || readinessStatus !== 200) throw new Error(`readiness returned HTTP ${readinessStatus || "network-error"}`);
  const readinessErrors = readinessGateErrors(readiness, expectedMigration);
  if (readinessErrors.length) throw new Error(readinessErrors.join("; "));

  const legalPaths = ["ko", "en", "vi", "mn"].flatMap((locale) => [
    `/${locale}/privacy`,
    `/${locale}/terms`,
  ]);
  const legalResults = await Promise.all(legalPaths.map(async (path) => {
    const url = `${baseUrl}${path}`;
    const response = await fetch(url, withCutoverAuth(url, { signal: AbortSignal.timeout(20_000) }));
    return { path, status: response.status };
  }));
  const failedLegal = legalResults.filter((result) => result.status !== 200);
  if (failedLegal.length) throw new Error(`legal pages failed: ${failedLegal.map((item) => `${item.path}:${item.status}`).join(", ")}`);

  const aiChecks = [
    { name: "agent", path: "/api/ai/agent", question: "D-10 비자 전환의 기본 서류를 출처와 함께 짧게 알려주세요." },
    { name: "consult", path: "/api/ai/consult", question: "D-4 체류기간 연장 준비 서류를 짧게 알려주세요." },
  ];
  const aiResults: Array<{ name: string; status: number; answerChars: number; attempts: number }> = [];
  for (const check of aiChecks) {
    let lastStatus = 0;
    let lastAnswer = "";
    let passed = false;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const result = await fetchJson(`${baseUrl}${check.path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: check.question, locale: "ko" }),
      });
      lastStatus = result.response.status;
      lastAnswer = responseAnswer(result.payload);
      if (result.response.ok && lastAnswer.length >= 20 && !FAILURE_TEXT.test(lastAnswer)) {
        aiResults.push({ name: check.name, status: lastStatus, answerChars: lastAnswer.length, attempts: attempt });
        passed = true;
        break;
      }
      if (attempt < 3) await Bun.sleep(2_000);
    }
    if (!passed) {
      throw new Error(`${check.name} smoke failed after 3 attempts with HTTP ${lastStatus || "network-error"}`);
    }
  }
  return { stage: "backend", baseUrl, expectedMigration, legalPages: legalResults.length, ai: aiResults };
}

async function runTypebotGate() {
  const publicUrl = safeBaseUrl(argument("public-url") || process.env.TYPEBOT_PUBLIC_URL || "https://typebot.co");
  const publicId = argument("public-id") || process.env.TYPEBOT_PUBLIC_ID || "kaxi-rag-typebot";
  const starts = new Map<string, TypebotRuntimeTurn>();
  for (const locale of TYPEBOT_RUNTIME_LOCALES) {
    const startResult = await fetchJson(`${publicUrl}/api/v1/typebots/${encodeURIComponent(publicId)}/startChat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prefilledVariables: { locale } }),
    });
    const start = startResult.payload as TypebotRuntimeTurn;
    if (!startResult.response.ok || !start?.sessionId) {
      throw new Error(`Typebot ${locale} startChat failed with HTTP ${startResult.response.status}`);
    }
    const startErrors = validatePublishedTypebotStart(start, locale);
    if (startErrors.length) throw new Error(startErrors.join("; "));
    starts.set(locale, start);
  }
  const start = starts.get("ko");
  if (!start?.sessionId) throw new Error("Typebot Korean startChat did not return a sessionId");

  const continuationResult = await fetchJson(
    `${publicUrl}/api/v1/sessions/${encodeURIComponent(start.sessionId)}/continueChat`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "비자 만료 후 불법 취업 중입니다. 단속을 피하는 방법 대신 합법적인 해결과 담당자 상담이 필요해요." }),
    },
  );
  const continuation = continuationResult.payload as TypebotRuntimeTurn;
  if (!continuationResult.response.ok) {
    throw new Error(`Typebot continueChat failed with HTTP ${continuationResult.response.status}`);
  }
  const errors = typebotGateErrors(start, continuation);
  if (errors.length) throw new Error(errors.join("; "));
  return {
    stage: "typebot",
    publicId,
    publishedAt: start.typebot?.publishedAt,
    locales: TYPEBOT_RUNTIME_LOCALES,
    consentInput: continuation.input?.id,
  };
}

export async function runCutoverStage(stage: CutoverStage) {
  if (stage === "source") return runSourceGate();
  if (stage === "backend") return runBackendGate();
  return runTypebotGate();
}

if (import.meta.main) {
  const stage = (argument("stage") || "source") as CutoverStage;
  if (!["source", "backend", "typebot"].includes(stage)) {
    console.error(`FAIL unknown cutover stage: ${stage}`);
    process.exit(1);
  }
  try {
    console.log(JSON.stringify(await runCutoverStage(stage)));
  } catch (error) {
    console.error(`FAIL ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
