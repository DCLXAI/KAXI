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
