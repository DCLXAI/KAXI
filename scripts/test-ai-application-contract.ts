import { strict as assert } from "assert";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { dirname, extname, join, relative, resolve } from "path";
import {
  ApplicationExecutionError,
  assertExecutionActive,
  type AiRequestContext,
} from "../src/application/ai/contracts";
import { runUnifiedAiUseCase } from "../src/application/ai/unified-ai";
import { runRagAnswerUseCase } from "../src/application/ai/rag-answer";
import { applyChatResponseGuardrail } from "../src/lib/chat/response-guardrail";
import { platformAnonymousTenantContext } from "../src/application/tenancy/tenant-context";

const root = process.cwd();
const sourceRoot = join(root, "src");
const applicationRoot = join(sourceRoot, "application");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

function imports(source: string): string[] {
  const values: string[] = [];
  for (const pattern of [
    /\b(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g,
    /\bimport\(\s*["']([^"']+)["']\s*\)/g,
  ]) {
    for (const match of source.matchAll(pattern)) values.push(match[1]);
  }
  return values;
}

function resolveImport(importer: string, specifier: string): string | null {
  let candidate: string;
  if (specifier.startsWith("@/")) candidate = join(sourceRoot, specifier.slice(2));
  else if (specifier.startsWith(".")) candidate = resolve(dirname(importer), specifier);
  else return null;
  const candidates = extname(candidate)
    ? [candidate]
    : [candidate, `${candidate}.ts`, `${candidate}.tsx`, join(candidate, "index.ts"), join(candidate, "index.tsx")];
  return candidates.find((path) => existsSync(path) && statSync(path).isFile()) || null;
}

// Traverse the full runtime import closure. A direct-only assertion would miss
// framework leakage through a convenience module such as lib/api/security.
const pending = sourceFiles(applicationRoot);
const visited = new Set<string>();
const forbidden: string[] = [];
while (pending.length > 0) {
  const importer = pending.pop()!;
  if (visited.has(importer)) continue;
  visited.add(importer);
  const source = readFileSync(importer, "utf8");
  for (const specifier of imports(source)) {
    if (specifier === "next" || specifier.startsWith("next/")) {
      forbidden.push(`${relative(root, importer)} -> ${specifier}`);
      continue;
    }
    const imported = resolveImport(importer, specifier);
    if (!imported) continue;
    const importedPath = relative(root, imported).split("\\").join("/");
    if (importedPath.startsWith("src/app/") || importedPath.startsWith("src/adapters/http/")) {
      forbidden.push(`${relative(root, importer)} -> ${importedPath}`);
      continue;
    }
    pending.push(imported);
  }
}
assert.deepEqual(forbidden, [], `application runtime closure must be framework-independent:\n${forbidden.join("\n")}`);

function context(overrides: Partial<AiRequestContext> = {}): AiRequestContext {
  return {
    requestId: "req-application-contract",
    idempotencyKey: "idem-application-contract",
    principal: { kind: "anonymous-session", sessionId: "session-application-contract" },
    tenantContext: platformAnonymousTenantContext("session-application-contract"),
    locale: "ko",
    channel: "web",
    traceId: "trace-application-contract",
    ...overrides,
  };
}

assert.throws(
  () => assertExecutionActive(context({ deadlineAt: Date.now() - 1 })),
  (error) => error instanceof ApplicationExecutionError && error.code === "deadline_exceeded",
);
const aborted = new AbortController();
aborted.abort(new Error("fixture abort"));
assert.throws(
  () => assertExecutionActive(context({ signal: aborted.signal })),
  (error) => error instanceof ApplicationExecutionError && error.code === "cancelled",
);

let actionCalls = 0;
let expertCalls = 0;
const action = await runUnifiedAiUseCase({
  context: context(),
  question: "서울 학교 3곳을 찾아줘",
  history: [],
  leadId: null,
}, {
  runAction: async () => {
    actionCalls += 1;
    return {
      ok: true,
      value: {
        answer: "학교 검색 결과",
        backend: "fixture",
        steps: [],
        toolResults: [],
        iterations: 1,
        durationMs: 1,
        grounded: true,
        preflightMs: 0,
        needsHumanExpert: false,
        escalationCaseCreated: false,
        meta: { sources: [], quality: { backend: "fixture" } },
      },
    } as never;
  },
  runExpert: async () => {
    expertCalls += 1;
    throw new Error("wrong delegate");
  },
});
assert.equal(action.ok, true);
assert.equal(action.ok && action.value.routing.capability, "action");
assert.equal(actionCalls, 1);
assert.equal(expertCalls, 0);

const expert = await runUnifiedAiUseCase({
  context: context(),
  question: "D-4 비자 연장 기준은?",
  history: [],
  leadId: null,
}, {
  runAction: async () => {
    actionCalls += 1;
    throw new Error("wrong delegate");
  },
  runExpert: async () => {
    expertCalls += 1;
    return {
      ok: true,
      value: {
        answer: "공식 기준 안내",
        disclaimer: "일반 안내",
        retrievedDocs: [],
        suggestedFollowups: [],
        needsHumanExpert: false,
        escalationCaseCreated: false,
        backend: "fixture",
        model: null,
        sourceNotice: "",
        searchMeta: [],
        retrieval: { backend: "fixture" },
      },
    } as never;
  },
});
assert.equal(expert.ok, true);
assert.equal(expert.ok && expert.value.routing.capability, "expert");
assert.equal(actionCalls, 1);
assert.equal(expertCalls, 1);

const ragFixture = {
  answer: "공식 문서에 근거한 안전한 안내입니다. [1]",
  nextStep: "원문을 확인하세요.",
  needsHuman: false,
  riskLevel: "low",
  leadStage: "none",
  sources: [{ id: "official-1", sourceUrl: "https://example.go.kr/official" }],
  searchMeta: { retrievedCount: 1, topScore: 0.9, noContext: false },
  executionId: "fixture-execution",
  runtimePath: "kaxi-direct-hybrid" as const,
  workflowId: "fixture-rag",
  workflowVersionId: "fixture-rag@v1",
  modelVersion: "fixture-model",
  promptVersion: "fixture-prompt",
};
let ragGuardrailCalls = 0;
const channelResults = await Promise.all(["web", "typebot", "n8n"].map(async (channel) => {
  const result = await runRagAnswerUseCase({
    context: context({ channel: channel as "web" | "typebot" | "n8n" }),
    question: "D-4 연장 절차를 알려주세요",
    category: "visa",
    fallbackReason: "contract_fixture",
  }, {
    runDirect: async () => ragFixture,
    guardResponse: (...args) => {
      ragGuardrailCalls += 1;
      return applyChatResponseGuardrail(...args);
    },
  });
  assert.equal(result.ok, true);
  return result.ok ? result.value : null;
}));
assert.deepEqual(
  channelResults.map((result) => ({
    riskLevel: result?.riskLevel,
    sources: result?.sources,
    persistence: result?.applicationContract.persistence,
  })),
  Array.from({ length: 3 }, () => ({
    riskLevel: "low",
    sources: ragFixture.sources,
    persistence: { owner: "kaxi-gateway", state: "pending" },
  })),
);
assert.equal(ragGuardrailCalls, 3, "the shared RAG policy must apply its guardrail exactly once per request");

const typebotRoute = readFileSync(join(root, "src/app/api/typebot-rag/route.ts"), "utf8");
assert.match(
  typebotRoute,
  /const guardedPayload = mediation\.action === "clarify"\s*\? applyChatResponseGuardrail/,
  "Typebot may guard its locally constructed clarification, but must not re-guard Application RAG answers",
);

console.log(`PASS AI application contract: ${visited.size} framework-independent modules, typed routing, cancellation, deadline, one guardrail and Web/Typebot/n8n RAG parity`);
