import { evaluateLatencyGate, type LatencySample } from "../src/application/ops/latency-gate";
import { readUnifiedAiEventStream } from "../src/lib/ai/unified-stream";

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function positive(name: string, fallback?: number) {
  const raw = argument(name);
  const value = Number.parseFloat(raw || String(fallback || ""));
  if (!Number.isFinite(value) || value <= 0) fail(`--${name} requires a positive number`);
  return value;
}

if (!process.argv.includes("--execute")) {
  fail("latency measurement invokes the production AI flow; repeat with --execute after rollout approval");
}
const ticket = argument("ticket")?.trim() || "";
if (ticket.length < 4) fail("--ticket is required for production measurement evidence");
const baseUrlValue = argument("base-url")?.trim() || "";
if (!baseUrlValue) fail("--base-url is required");
let baseUrl: URL;
try {
  baseUrl = new URL(baseUrlValue);
} catch {
  fail("--base-url must be a valid absolute URL");
}
if (baseUrl.protocol !== "https:" && !process.argv.includes("--allow-loopback")) {
  fail("--base-url must be an HTTPS deployment target");
}
const samples = Math.max(20, Math.min(30, Math.trunc(positive("samples", 20))));
const intervalMs = Math.max(0, Math.min(60_000, Math.trunc(positive("interval-ms", 11_000))));
const baselineCompleteP95Ms = positive("baseline-complete-p95-ms");
const coldFirstProgressBudgetMs = positive("cold-first-progress-budget-ms");
const results: LatencySample[] = [];

for (let index = 0; index < samples; index += 1) {
  const started = performance.now();
  let firstProgressMs: number | null = null;
  const requestId = crypto.randomUUID();
  const response = await fetch(new URL("/api/ai/unified/stream", baseUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-request-id": requestId,
      "idempotency-key": `latency-rehearsal:${ticket}:${requestId}`,
      "x-kaxi-stream-mode": "progress-only",
    },
    body: JSON.stringify({
      question: "D-4 체류기간 연장의 기본 서류를 공식 출처와 함께 짧게 알려주세요.",
      locale: "ko",
    }),
    signal: AbortSignal.timeout(65_000),
  });
  await readUnifiedAiEventStream(response, (event) => {
    if (event.type === "progress" && firstProgressMs === null) firstProgressMs = performance.now() - started;
  });
  results.push({
    firstProgressMs: firstProgressMs ?? Number.POSITIVE_INFINITY,
    completeMs: performance.now() - started,
  });
  if (index + 1 < samples && intervalMs > 0) await Bun.sleep(intervalMs);
}

const gate = evaluateLatencyGate({ samples: results, baselineCompleteP95Ms, coldFirstProgressBudgetMs });
console.log(JSON.stringify({ ticket, baseUrl: baseUrl.origin, sampleCount: results.length, gate }, null, 2));
if (gate.errors.length > 0) fail(gate.errors.join(", "));
console.log("PASS production latency regression gate");
