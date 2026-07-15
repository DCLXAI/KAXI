import { writeFileSync } from "node:fs";

/**
 * Compiles infra/n8n/kaxi-rag-typebot-orchestrator.mjs (the @n8n/workflow-sdk
 * builder that is the source of truth for the live Railway orchestrator) into
 * an importable n8n workflow JSON.
 *
 * Without this, the only importable artifact in the repo was
 * kaxi-rag-typebot-architecture.json — a DIFFERENT, obsolete design that runs
 * embeddings inside n8n. Importing that into the live orchestrator would break
 * the rollback path and violate the "n8n holds no secrets, it delegates to
 * KAXI" contract. Always deploy the output of this script, never the
 * architecture JSON.
 *
 * Usage: bun run n8n:build:orchestrator
 * Output: infra/n8n/kaxi-rag-typebot-orchestrator.json
 */

const OUTPUT = "infra/n8n/kaxi-rag-typebot-orchestrator.json";

const mod = await import("../infra/n8n/kaxi-rag-typebot-orchestrator.mjs") as {
  default: { toJSON: () => unknown };
};
const workflow = mod.default.toJSON() as Record<string, unknown>;
const serialized = JSON.stringify(workflow);

function fail(message: string): never {
  throw new Error(`[build-n8n-orchestrator] ${message}`);
}

// The compiled artifact is deployed straight to production n8n, so verify the
// invariants that make it safe before writing it out.
if (workflow.name !== "KAXI RAG Typebot Orchestrator") {
  fail(`unexpected workflow name: ${String(workflow.name)}`);
}
const nodes = Array.isArray(workflow.nodes) ? workflow.nodes as Array<Record<string, unknown>> : [];
const nodeNames = new Set(nodes.map((node) => String(node.name)));
for (const required of [
  "Typebot Runtime Webhook",
  "Verify Runtime Signature",
  "Run KAXI RAG Core",
  "Respond to Typebot",
]) {
  if (!nodeNames.has(required)) fail(`compiled workflow is missing node: ${required}`);
}
if (serialized.includes("embeddingsOpenAi") || serialized.includes("vectorStoreSupabase") || serialized.includes("newCredential")) {
  fail("compiled workflow must delegate secret-bearing embedding/persistence to KAXI");
}
if (!serialized.includes("api/internal/n8n/rag-runtime")) {
  fail("compiled workflow must delegate the runtime to the KAXI core");
}
const settings = (workflow.settings || {}) as Record<string, unknown>;
if (
  settings.saveDataSuccessExecution !== "all"
  || settings.saveDataErrorExecution !== "all"
  || settings.saveExecutionProgress !== true
) {
  fail("compiled workflow must retain execution metadata for operations review");
}

writeFileSync(OUTPUT, `${JSON.stringify(workflow, null, 2)}\n`, "utf8");
console.log(`PASS built ${OUTPUT} (${nodes.length} nodes, ${workflow.name})`);
