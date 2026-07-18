import { readFileSync } from "fs";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const workflow = JSON.parse(
  readFileSync("infra/n8n/kaxi-rag-typebot-architecture.json", "utf8"),
) as {
  nodes: Array<{ name: string; type: string; parameters?: Record<string, unknown> }>;
  connections: Record<string, { main?: Array<Array<{ node: string }> | null> }>;
  settings?: Record<string, unknown>;
};

const railwayWorkflow = readFileSync(
  "infra/n8n/kaxi-rag-typebot-orchestrator.mjs",
  "utf8",
);
const compiledOrchestrator = JSON.parse(
  readFileSync("infra/n8n/kaxi-rag-typebot-orchestrator.json", "utf8"),
) as {
  nodes: Array<{ name: string; type: string; parameters?: Record<string, unknown> }>;
};
const errorWorkflow = JSON.parse(
  readFileSync("infra/n8n/kaxi-shared-error-handler.json", "utf8"),
) as {
  nodes: Array<{ name: string; type: string; parameters?: Record<string, unknown> }>;
  settings?: Record<string, unknown>;
};
for (const required of [
  "api/internal/n8n/verify",
  "api/internal/n8n/rag-runtime",
  "api/internal/n8n/rag-ingestion",
  "api/internal/n8n/handoff-update",
  "rag-serving-capabilities",
  "text-embedding-3-small",
  "dimensions: 1536",
]) {
  assert(railwayWorkflow.includes(required), `Railway MCP workflow is missing: ${required}`);
}
assert(
  !railwayWorkflow.includes("newCredential(")
    && !railwayWorkflow.includes("vectorStoreSupabase")
    && !railwayWorkflow.includes("embeddingsOpenAi"),
  "Railway n8n must delegate secret-bearing embedding and persistence to KAXI",
);

// The session profile must reach the n8n rollback runtime too: typebot-rag
// forwards it in the signed request, and the internal core applies it so the
// grounded prompt carries the profile even when the direct path fell back.
const typebotRagRouteSource = readFileSync("src/app/api/typebot-rag/route.ts", "utf8");
const ragRuntimeRouteSource = readFileSync("src/app/api/internal/n8n/rag-runtime/route.ts", "utf8");
assert(
  typebotRagRouteSource.includes("profile: hasProfileFacts(profile) ? profile : undefined"),
  "typebot-rag must forward the session profile in the signed n8n rollback request",
);
assert(
  ragRuntimeRouteSource.includes("parseSessionProfile(payload.profile)"),
  "the n8n rollback runtime must apply the forwarded session profile (whitelisted via parseSessionProfile)",
);
assert(
  railwayWorkflow.includes("Verify Runtime Signature")
    && railwayWorkflow.includes("Verify Ingestion Signature")
    && railwayWorkflow.includes("Verify Handoff Signature"),
  "every Railway write/runtime branch must verify the KAXI signature first",
);
assert(
  railwayWorkflow.includes('const release = "kaxi-rag-runtime@2026-07-14.railway-mcp-v3"'),
  "Railway runtime semantic release must match the production provenance contract",
);
assert(
  railwayWorkflow.includes("$('Run KAXI RAG Ingestion Core').item.json.body?.workflowVersionId ??")
    && railwayWorkflow.includes("$('Run KAXI Handoff Core').item.json.body?.workflowVersionId ??")
    && railwayWorkflow.includes("$('Run KAXI RAG Ingestion Core').item.json.body?.promptVersion ??")
    && railwayWorkflow.includes("$('Run KAXI Handoff Core').item.json.body?.promptVersion ??"),
  "ingestion and handoff responses must prefer the KAXI Core provenance over n8n-hardcoded values",
);
const railwayRuntimeSource = railwayWorkflow.slice(
  railwayWorkflow.indexOf("const runRagCore"),
  railwayWorkflow.indexOf("const respondTypebot"),
);
assert(
  railwayRuntimeSource.includes("retryOnFail: false")
    && railwayRuntimeSource.includes("timeout: 25000")
    && !railwayRuntimeSource.includes("maxTries"),
  "Railway runtime must use one 25-second attempt inside the KAXI gateway budget",
);

const obsoleteRuntimeNodes = [
  "Normalize Typebot Input",
  "Search Governed Serving Chunks Lexical",
  "Build Context",
  "Has Retrieved Context?",
  "Build Grounded Context Answer",
  "Fallback No Context Answer",
  "Parse AI JSON",
  "Classify Handoff Risk",
  "Needs Human or Risk?",
];
const nodeNames = new Set(workflow.nodes.map((node) => node.name));
for (const name of obsoleteRuntimeNodes) {
  assert(!nodeNames.has(name), `obsolete duplicated runtime node remains: ${name}`);
  assert(!workflow.connections[name], `obsolete runtime connection remains: ${name}`);
}

function targets(name: string, output = 0) {
  return (workflow.connections[name]?.main?.[output] || []).map((target) => target.node);
}

assert(
  JSON.stringify(targets("Typebot Runtime Webhook")) === JSON.stringify(["Verify Runtime Signature"]),
  "runtime webhook must call signature verification first",
);
assert(
  JSON.stringify(targets("Verify Runtime Signature")) === JSON.stringify(["Input Guard"]),
  "verified request must flow directly into the input guard",
);
assert(
  JSON.stringify(targets("Input Guard", 0)) === JSON.stringify(["Run KAXI RAG Core"]),
  "allowed request must call the KAXI RAG core",
);
assert(
  JSON.stringify(targets("Input Guard", 1)) === JSON.stringify(["Respond Unauthorized"]),
  "rejected request must use the unauthorized response",
);
assert(
  JSON.stringify(targets("Run KAXI RAG Core")) === JSON.stringify(["Respond to Typebot"]),
  "KAXI RAG core result must be returned directly",
);

const verify = workflow.nodes.find((node) => node.name === "Verify Runtime Signature");
const core = workflow.nodes.find((node) => node.name === "Run KAXI RAG Core");
const respond = workflow.nodes.find((node) => node.name === "Respond to Typebot");
const capability = workflow.nodes.find((node) => node.name === "Respond RAG Serving Capability");
assert(verify?.type === "n8n-nodes-base.httpRequest", "signature verifier must remain an HTTP node");
assert(
  String(verify.parameters?.jsonBody || "").includes("payload: $json.body"),
  "signature verifier must bind the original payload",
);
assert(core?.type === "n8n-nodes-base.httpRequest", "KAXI RAG core must be an HTTP node");
assert(
  core.parameters?.url === "https://kaxi.vercel.app/api/internal/n8n/rag-runtime",
  "KAXI RAG core URL mismatch",
);
assert(
  String(core.parameters?.jsonBody || "").includes("verificationToken")
    && String(core.parameters?.jsonBody || "").includes("Typebot Runtime Webhook"),
  "KAXI RAG core request must include the verification receipt and exact payload",
);

// Regression pin: Compute Query Embedding must read the ORIGINAL webhook body via a
// cross-node reference, not $json at its own position (which is Verify Runtime
// Signature's response — {ok, purpose, verificationToken} — and has no body/payload).
const computeQueryEmbedding = compiledOrchestrator.nodes.find(
  (node) => node.name === "Compute Query Embedding",
);
assert(computeQueryEmbedding, "compiled orchestrator is missing the Compute Query Embedding node");
const computeQueryEmbeddingBody = String(computeQueryEmbedding.parameters?.jsonBody || "");
assert(
  computeQueryEmbeddingBody.includes("$('Typebot Runtime Webhook')"),
  "Compute Query Embedding must source its input from the original webhook payload, not the verify response",
);
assert(
  !computeQueryEmbeddingBody.includes("$json.body?.payload"),
  "Compute Query Embedding must not read $json.body?.payload — at this node's position $json is Verify Runtime Signature's response, which has no body/payload",
);

// Regression pin: Compute Chunk Embedding must read the ORIGINAL ingestion
// webhook body via a cross-node reference (at its own position $json is the
// IF node's passthrough of Verify Ingestion Signature's response), and it must
// embed the core-computed projection text, never the raw chunk content.
const computeChunkEmbedding = compiledOrchestrator.nodes.find(
  (node) => node.name === "Compute Chunk Embedding",
);
assert(computeChunkEmbedding, "compiled orchestrator is missing the Compute Chunk Embedding node");
const computeChunkEmbeddingBody = String(computeChunkEmbedding.parameters?.jsonBody || "");
assert(
  computeChunkEmbeddingBody.includes("$('RAG Knowledge Ingestion Webhook')"),
  "Compute Chunk Embedding must source its input from the original ingestion webhook payload",
);
assert(
  computeChunkEmbeddingBody.includes("embedding_content")
    && !computeChunkEmbeddingBody.includes("body?.content"),
  "Compute Chunk Embedding must embed the projection text (embedding_content), not the raw chunk content",
);

// Drift tripwire: the n8n compute nodes and the core embedder must slice the
// embedding input identically — the content-hash gate hashes the FULL text, so
// a slice divergence would store vectors of a different text window without
// failing any hash check. Pin both literals; change them only together.
const coreEmbedderSource = readFileSync("src/lib/chat/query-embedding.ts", "utf8");
assert(
  coreEmbedderSource.includes("question.slice(0, 4_000)"),
  "core embedder input slice changed — update the n8n compute nodes' slice to match, then update this pin",
);
const computeNodeSliceCount = (railwayWorkflow.match(/\.slice\(0, 4000\)/g) || []).length;
assert(
  computeNodeSliceCount === 2,
  "both n8n compute embedding nodes (query + chunk) must slice input to exactly 4000 chars to match the core embedder",
);

const ingestionCoreNode = compiledOrchestrator.nodes.find(
  (node) => node.name === "Run KAXI RAG Ingestion Core",
);
assert(
  String(ingestionCoreNode?.parameters?.jsonBody || "").includes("chunkEmbedding")
    && String(ingestionCoreNode?.parameters?.jsonBody || "").includes("Array.isArray($json.data)"),
  "ingestion core request must forward the computed chunk embedding top-level behind an Array.isArray guard",
);
assert(
  String(respond?.parameters?.responseBody || "").includes("n8n-kaxi-orchestrated")
    && String(respond?.parameters?.responseBody || "").includes("railway-mcp-v3")
    && String(respond?.parameters?.responseBody || "").includes("n8nWorkflowVersionId"),
  "Typebot response must expose orchestrated runtime provenance",
);
const responseBody = String(respond?.parameters?.responseBody || "");
assert(
  responseBody.includes("JSON.stringify({ answer: $('Run KAXI RAG Core').item.json.answer")
    && responseBody.includes("item.json.workflowVersionId")
    && responseBody.includes("item.json.promptVersion")
    && !responseBody.includes("const searchMeta")
    && !responseBody.includes("const retrieval")
    && !responseBody.includes("...$json"),
  "Typebot response must use explicit core fields without self-referential initializers",
);
assert(capability?.type === "n8n-nodes-base.respondToWebhook", "capability responder missing");
const capabilityBody = String(capability.parameters?.responseBody || "");
for (const requiredContractValue of [
  "2026-07-14.v4",
  "hybrid-rrf-v3-openai-required",
  "embeddingModel: 'text-embedding-3-small'",
  "embeddingContentStrategy: 'single-locale-v1'",
  "lexicalCandidateCount: 20",
  "vectorCandidateCount: 20",
  "finalMatchCount: 6",
  "queryEmbeddingOptional: false",
  "storedVectorFallback: 'disabled'",
  "vectorSeedCount: 0",
  "providerFailureMode: 'fail-closed'",
]) {
  assert(
    capabilityBody.includes(requiredContractValue),
    `capability contract is missing: ${requiredContractValue}`,
  );
}

assert(
  workflow.settings?.saveDataSuccessExecution === "all"
    && workflow.settings?.saveDataErrorExecution === "all"
    && workflow.settings?.saveExecutionProgress === true,
  "n8n must retain successful and failed execution metadata for operations review",
);

const errorReporter = errorWorkflow.nodes.find((node) => node.name === "Persist Operational Failure");
assert(
  errorWorkflow.nodes.some((node) => node.type === "n8n-nodes-base.errorTrigger")
    && errorReporter?.type === "n8n-nodes-base.httpRequest",
  "shared n8n Error Workflow must use Error Trigger and the KAXI alert gateway",
);
assert(
  errorReporter?.parameters?.url === "https://kaxi.vercel.app/api/internal/n8n/error-report"
    && JSON.stringify(errorReporter.parameters).includes("KAXI_N8N_ERROR_TOKEN"),
  "n8n errors must be authenticated into KAXI recordOpsEvent/Slack/email delivery",
);

const activeRuntimeText = JSON.stringify([verify, core, respond]);
assert(
  !/rerankDocument|categoryRerankBoost|promptInjection|fakeDocuments/.test(activeRuntimeText),
  "n8n runtime must not duplicate KAXI retrieval or classification logic",
);

console.log("PASS n8n runtime is a thin signed KAXI RAG orchestrator");
