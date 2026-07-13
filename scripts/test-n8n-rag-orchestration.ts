import { readFileSync } from "fs";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const workflow = JSON.parse(
  readFileSync("infra/n8n/kaxi-rag-typebot-architecture.json", "utf8"),
) as {
  nodes: Array<{ name: string; type: string; parameters?: Record<string, unknown> }>;
  connections: Record<string, { main?: Array<Array<{ node: string }> | null> }>;
};

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
    && String(respond?.parameters?.responseBody || "").includes("provider-independent-hybrid-v2"),
  "Typebot response must expose orchestrated runtime provenance",
);
assert(capability?.type === "n8n-nodes-base.respondToWebhook", "capability responder missing");
const capabilityBody = String(capability.parameters?.responseBody || "");
for (const requiredContractValue of [
  "2026-07-14.v3",
  "hybrid-rrf-v3-with-seeded-vector-and-lexical-fallback",
  "embeddingModel: 'text-embedding-3-small'",
  "lexicalCandidateCount: 20",
  "vectorCandidateCount: 20",
  "finalMatchCount: 6",
  "queryEmbeddingOptional: true",
  "storedVectorFallback: 'lexical-centroid'",
  "vectorSeedCount: 3",
  "providerFailureMode: 'lexical-only'",
]) {
  assert(
    capabilityBody.includes(requiredContractValue),
    `capability contract is missing: ${requiredContractValue}`,
  );
}

const activeRuntimeText = JSON.stringify([verify, core, respond]);
assert(
  !/rerankDocument|categoryRerankBoost|promptInjection|fakeDocuments/.test(activeRuntimeText),
  "n8n runtime must not duplicate KAXI retrieval or classification logic",
);

console.log("PASS n8n runtime is a thin signed KAXI RAG orchestrator");
