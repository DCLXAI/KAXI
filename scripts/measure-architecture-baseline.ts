import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from "fs";
import { dirname, join, resolve } from "path";
import vm from "node:vm";

type ClientMetric = { chunks: number; rawBytes: number };
type ServerMetric = {
  files: number;
  rawBytes: number;
  onnxBytes: number;
  prismaBytes: number;
  pdfBytes: number;
};
type ArchitectureMetrics = {
  schemaVersion: 1;
  clientRoutes: Record<string, ClientMetric>;
  serverRoutes: Record<string, ServerMetric>;
  standalone: { rawBytes: number; nodeModulesBytes: number };
};
type ArchitectureBaseline = ArchitectureMetrics & {
  measuredAt: string;
  sourceRevision: string;
  policy: { maxGrowthPercent: number; maxMajorPublicClientPercentOfBaseline?: number };
};

const repositoryRoot = process.cwd();
const nextRoot = join(repositoryRoot, ".next");
const baselinePath = join(repositoryRoot, "quality", "architecture-baseline.json");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function fileSize(path: string) {
  try {
    return statSync(path).isFile() ? statSync(path).size : 0;
  } catch {
    return 0;
  }
}

function directorySize(directory: string): number {
  if (!existsSync(directory)) return 0;
  return readdirSync(directory, { withFileTypes: true }).reduce((total, entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return total + directorySize(path);
    if (entry.isSymbolicLink()) return total;
    return total + fileSize(path);
  }, 0);
}

const clientManifests: Record<string, string> = {
  "/[locale]": "[locale]/page_client-reference-manifest.js",
  "/[locale]/agent": "[locale]/agent/page_client-reference-manifest.js",
  "/[locale]/diagnose": "[locale]/diagnose/page_client-reference-manifest.js",
  "/[locale]/schools": "[locale]/schools/page_client-reference-manifest.js",
  "/[locale]/cost": "[locale]/cost/page_client-reference-manifest.js",
  "/[locale]/docs": "[locale]/docs/page_client-reference-manifest.js",
  "/[locale]/partners": "[locale]/partners/page_client-reference-manifest.js",
  "/[locale]/guide": "[locale]/guide/page_client-reference-manifest.js",
};

function clientMetric(relativeManifest: string): ClientMetric {
  const manifestPath = join(nextRoot, "server", "app", relativeManifest);
  assert(existsSync(manifestPath), `missing client reference manifest: ${manifestPath}; run bun run build first`);
  const context: Record<string, unknown> = {};
  vm.runInNewContext(readFileSync(manifestPath, "utf8"), context);
  const manifests = Object.values((context.__RSC_MANIFEST || {}) as Record<string, unknown>);
  assert(manifests.length === 1, `expected one RSC manifest in ${manifestPath}`);
  const manifest = manifests[0] as {
    clientModules?: Record<string, { chunks?: string[] }>;
  };
  const chunks = new Set<string>();
  for (const clientModule of Object.values(manifest.clientModules || {})) {
    for (const chunk of clientModule.chunks || []) chunks.add(chunk);
  }
  const rawBytes = [...chunks].reduce((total, chunk) => {
    const path = join(nextRoot, chunk.replace(/^\/_next\//, ""));
    return total + fileSize(path);
  }, 0);
  return { chunks: chunks.size, rawBytes };
}

const serverTraces: Record<string, string> = {
  "/api/ai/agent": "api/ai/agent/route.js.nft.json",
  "/api/ai/chat": "api/ai/chat/route.js.nft.json",
  "/api/ai/consult": "api/ai/consult/route.js.nft.json",
  "/api/synonyms/suggest": "api/synonyms/suggest/route.js.nft.json",
  "/api/typebot-rag": "api/typebot-rag/route.js.nft.json",
  "/api/internal/chat-attachments/process": "api/internal/chat-attachments/process/route.js.nft.json",
  "/api/knowledge/monitor": "api/knowledge/monitor/route.js.nft.json",
};

function serverMetric(relativeTrace: string): ServerMetric {
  const tracePath = join(nextRoot, "server", "app", relativeTrace);
  assert(existsSync(tracePath), `missing server trace: ${tracePath}; run bun run build first`);
  const trace = JSON.parse(readFileSync(tracePath, "utf8")) as { files?: string[] };
  const seen = new Set<string>();
  const metric: ServerMetric = { files: 0, rawBytes: 0, onnxBytes: 0, prismaBytes: 0, pdfBytes: 0 };

  for (const relativeFile of trace.files || []) {
    const unresolved = resolve(dirname(tracePath), relativeFile);
    if (!existsSync(unresolved)) continue;
    let file = unresolved;
    try {
      file = realpathSync(unresolved);
    } catch {}
    if (seen.has(file) || !statSync(file).isFile()) continue;
    seen.add(file);
    const bytes = statSync(file).size;
    metric.files += 1;
    metric.rawBytes += bytes;
    if (file.includes("onnxruntime")) metric.onnxBytes += bytes;
    if (file.includes("prisma")) metric.prismaBytes += bytes;
    if (file.includes("pdf-parse") || file.includes("pdfjs-dist") || file.includes("@napi-rs/canvas")) {
      metric.pdfBytes += bytes;
    }
  }
  return metric;
}

function measure(): ArchitectureMetrics {
  assert(existsSync(nextRoot), "missing .next build output; run bun run build first");
  return {
    schemaVersion: 1,
    clientRoutes: Object.fromEntries(
      Object.entries(clientManifests).map(([route, manifest]) => [route, clientMetric(manifest)]),
    ),
    serverRoutes: Object.fromEntries(
      Object.entries(serverTraces).map(([route, trace]) => [route, serverMetric(trace)]),
    ),
    standalone: {
      rawBytes: directorySize(join(nextRoot, "standalone")),
      nodeModulesBytes: directorySize(join(nextRoot, "standalone", "node_modules")),
    },
  };
}

function check(metrics: ArchitectureMetrics) {
  assert(existsSync(baselinePath), `missing architecture baseline: ${baselinePath}`);
  const baseline = JSON.parse(readFileSync(baselinePath, "utf8")) as ArchitectureBaseline;
  assert(baseline.schemaVersion === metrics.schemaVersion, "architecture baseline schema version mismatch");
  const multiplier = 1 + baseline.policy.maxGrowthPercent / 100;
  const failures: string[] = [];

  for (const [route, current] of Object.entries(metrics.clientRoutes)) {
    const expected = baseline.clientRoutes[route];
    if (!expected) {
      failures.push(`client route ${route} has no baseline`);
      continue;
    }
    if (current.chunks > expected.chunks) failures.push(`${route} chunks ${current.chunks} > ${expected.chunks}`);
    if (current.rawBytes > expected.rawBytes * multiplier) {
      failures.push(`${route} raw client bytes ${current.rawBytes} > allowed ${Math.floor(expected.rawBytes * multiplier)}`);
    }
    const phase3Percent = baseline.policy.maxMajorPublicClientPercentOfBaseline;
    if (route !== "/[locale]/guide" && phase3Percent && current.rawBytes > expected.rawBytes * (phase3Percent / 100)) {
      failures.push(`${route} raw client bytes ${current.rawBytes} exceed Phase 3 ${phase3Percent}% budget ${Math.floor(expected.rawBytes * (phase3Percent / 100))}`);
    }
  }

  for (const [route, current] of Object.entries(metrics.serverRoutes)) {
    const expected = baseline.serverRoutes[route];
    if (!expected) {
      failures.push(`server route ${route} has no baseline`);
      continue;
    }
    if (current.rawBytes > expected.rawBytes * multiplier) {
      failures.push(`${route} raw trace bytes ${current.rawBytes} > allowed ${Math.floor(expected.rawBytes * multiplier)}`);
    }
  }

  if (metrics.standalone.rawBytes > baseline.standalone.rawBytes * multiplier) {
    failures.push(
      `standalone bytes ${metrics.standalone.rawBytes} > allowed ${Math.floor(baseline.standalone.rawBytes * multiplier)}`,
    );
  }

  assert(failures.length === 0, ["architecture size baseline regressed", ...failures].join("\n"));
}

const metrics = measure();
if (process.argv.includes("--check")) check(metrics);
console.log(JSON.stringify(metrics, null, 2));
if (process.argv.includes("--check")) console.log("PASS architecture bundle and server trace baseline");
