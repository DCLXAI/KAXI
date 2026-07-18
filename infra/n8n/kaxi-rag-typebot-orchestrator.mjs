import { expr, ifElse, node, trigger, workflow } from "@n8n/workflow-sdk";

const release = "kaxi-rag-runtime@2026-07-14.railway-mcp-v3";
const retrievalModel = "retrieval/hybrid-rrf-v3+rerank-v11@2026-07-14";
const answerPrompt = "kaxi-grounded-answer@2026-07-14.p3-v3";
const embeddingModel = "openai/text-embedding-3-small@1536";

const runtimeWebhook = trigger({
  type: "n8n-nodes-base.webhook",
  version: 2.1,
  config: {
    name: "Typebot Runtime Webhook",
    position: [160, 240],
    parameters: {
      httpMethod: "POST",
      path: "typebot-rag-runtime",
      responseMode: "responseNode",
      options: { allowedOrigins: "https://kaxi.vercel.app", ignoreBots: false },
    },
  },
  output: [{ headers: {}, body: { question: "D-4 준비 서류", sessionId: "typebot-example" } }],
});

const verifyRuntime = node({
  type: "n8n-nodes-base.httpRequest",
  version: 4.4,
  config: {
    name: "Verify Runtime Signature",
    position: [400, 240],
    parameters: {
      method: "POST",
      url: "https://kaxi.vercel.app/api/internal/n8n/verify",
      authentication: "none",
      sendBody: true,
      contentType: "json",
      specifyBody: "json",
      jsonBody: expr("{{ { purpose: 'typebot-runtime', timestamp: $json.headers?.['x-kaxi-timestamp'] ?? '', nonce: $json.headers?.['x-kaxi-nonce'] ?? '', signature: $json.headers?.['x-kaxi-signature'] ?? '', payload: $json.body ?? {} } }}"),
      options: { response: { response: { neverError: true, responseFormat: "json" } }, timeout: 10000 },
    },
  },
  output: [{ ok: true, purpose: "typebot-runtime", verificationToken: "signed-receipt" }],
});

const runtimeAllowed = ifElse({
  version: 2.3,
  config: {
    name: "Runtime Signature Valid",
    position: [640, 240],
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
        conditions: [{
          leftValue: expr("{{ $json.ok }}"),
          operator: { type: "boolean", operation: "true" },
          rightValue: true,
        }],
        combinator: "and",
      },
      options: {},
    },
  },
});

const computeQueryEmbedding = node({
  type: "n8n-nodes-base.httpRequest",
  version: 4.2,
  config: {
    name: "Compute Query Embedding",
    position: [880, 160],
    onError: "continueRegularOutput",
    parameters: {
      method: "POST",
      url: "https://api.openai.com/v1/embeddings",
      authentication: "predefinedCredentialType",
      nodeCredentialType: "openAiApi",
      sendBody: true,
      specifyBody: "json",
      jsonBody: expr("{{ JSON.stringify({ model: 'text-embedding-3-small', input: String($('Typebot Runtime Webhook').item.json.body?.retrievalQuery || $('Typebot Runtime Webhook').item.json.body?.question || '').slice(0, 4000), dimensions: 1536, encoding_format: 'float' }) }}"),
      options: { timeout: 4000 },
    },
  },
  output: [{ data: [{ embedding: [0.001, 0.002] }] }],
});

const runRagCore = node({
  type: "n8n-nodes-base.httpRequest",
  version: 4.4,
  config: {
    name: "Run KAXI RAG Core",
    position: [1120, 160],
    retryOnFail: false,
    parameters: {
      method: "POST",
      url: "https://kaxi.vercel.app/api/internal/n8n/rag-runtime",
      authentication: "none",
      sendBody: true,
      contentType: "json",
      specifyBody: "json",
      jsonBody: expr("{{ { verificationToken: $('Verify Runtime Signature').item.json.verificationToken ?? '', payload: $('Typebot Runtime Webhook').item.json.body ?? {}, queryEmbedding: Array.isArray($json.data) && Array.isArray($json.data[0]?.embedding) ? $json.data[0].embedding : undefined } }}"),
      options: {
        response: { response: { fullResponse: true, neverError: true, responseFormat: "json" } },
        timeout: 25000,
      },
    },
  },
  output: [{ statusCode: 200, body: { answer: "공식 출처 기반 안내", sources: [], searchMeta: {} } }],
});

const respondTypebot = node({
  type: "n8n-nodes-base.respondToWebhook",
  version: 1.5,
  config: {
    name: "Respond to Typebot",
    position: [1400, 160],
    parameters: {
      respondWith: "json",
      responseBody: expr("{{ JSON.stringify({ answer: $('Run KAXI RAG Core').item.json.body?.answer ?? '', needsHuman: $('Run KAXI RAG Core').item.json.body?.needsHuman ?? true, riskLevel: $('Run KAXI RAG Core').item.json.body?.riskLevel ?? 'high', leadStage: $('Run KAXI RAG Core').item.json.body?.leadStage ?? 'blocked', nextStep: $('Run KAXI RAG Core').item.json.body?.nextStep ?? '', sources: $('Run KAXI RAG Core').item.json.body?.sources ?? [], searchMeta: { ...($('Run KAXI RAG Core').item.json.body?.searchMeta ?? {}), runtimePath: 'n8n-kaxi-orchestrated', n8nExecutionId: $execution.id, n8nWorkflowId: $workflow.id, n8nWorkflowVersionId: '" + release + "' }, requestId: $('Run KAXI RAG Core').item.json.body?.requestId ?? '', handoffToken: $('Run KAXI RAG Core').item.json.body?.handoffToken ?? '', persisted: $('Run KAXI RAG Core').item.json.body?.persisted ?? false, persistenceAccepted: $('Run KAXI RAG Core').item.json.body?.persistenceAccepted ?? false, messageId: $('Run KAXI RAG Core').item.json.body?.messageId ?? null, persistenceMode: $('Run KAXI RAG Core').item.json.body?.persistenceMode ?? '', handoffTaskPersisted: $('Run KAXI RAG Core').item.json.body?.handoffTaskPersisted ?? false, runtimePath: 'n8n-kaxi-orchestrated', executionId: $('Run KAXI RAG Core').item.json.body?.executionId ?? $execution.id, workflowId: $('Run KAXI RAG Core').item.json.body?.workflowId ?? 'kaxi-direct-hybrid', workflowVersionId: $('Run KAXI RAG Core').item.json.body?.workflowVersionId ?? '" + release + "', modelVersion: $('Run KAXI RAG Core').item.json.body?.modelVersion ?? '" + retrievalModel + "', promptVersion: $('Run KAXI RAG Core').item.json.body?.promptVersion ?? '" + answerPrompt + "', n8nExecutionId: $execution.id, n8nWorkflowId: $workflow.id, n8nWorkflowVersionId: '" + release + "' }) }}"),
      options: {
        responseCode: expr("{{ $('Run KAXI RAG Core').item.json.statusCode ?? 502 }}"),
        responseHeaders: { entries: [{ name: "Content-Type", value: "application/json" }, { name: "Cache-Control", value: "no-store" }] },
      },
    },
  },
  output: [{ answer: "공식 출처 기반 안내", runtimePath: "n8n-kaxi-orchestrated" }],
});

const respondRuntimeUnauthorized = node({
  type: "n8n-nodes-base.respondToWebhook",
  version: 1.5,
  config: {
    name: "Respond Runtime Unauthorized",
    position: [880, 360],
    parameters: {
      respondWith: "json",
      responseBody: expr("{{ JSON.stringify({ answer: 'Unauthorized request.', needsHuman: true, riskLevel: 'high', leadStage: 'blocked', nextStep: 'Verify the KAXI signature and session state.', sources: [], runtimePath: 'n8n-signature-rejected', executionId: $execution.id, workflowId: $workflow.id, workflowVersionId: '" + release + "', modelVersion: '" + retrievalModel + "', promptVersion: '" + answerPrompt + "' }) }}"),
      options: { responseCode: 401, responseHeaders: { entries: [{ name: "Content-Type", value: "application/json" }] } },
    },
  },
  output: [{ answer: "Unauthorized request.", runtimePath: "n8n-signature-rejected" }],
});

const ingestionWebhook = trigger({
  type: "n8n-nodes-base.webhook",
  version: 2.1,
  config: {
    name: "RAG Knowledge Ingestion Webhook",
    position: [160, 680],
    parameters: {
      httpMethod: "POST",
      path: "rag-knowledge-ingest",
      responseMode: "responseNode",
      options: { allowedOrigins: "https://kaxi.vercel.app", ignoreBots: false },
    },
  },
  output: [{ headers: {}, body: { canonical_chunk_id: "chunk-id", review_status: "approved" } }],
});

const verifyIngestion = node({
  type: "n8n-nodes-base.httpRequest",
  version: 4.4,
  config: {
    name: "Verify Ingestion Signature",
    position: [400, 680],
    parameters: {
      method: "POST",
      url: "https://kaxi.vercel.app/api/internal/n8n/verify",
      authentication: "none",
      sendBody: true,
      contentType: "json",
      specifyBody: "json",
      jsonBody: expr("{{ { purpose: 'rag-ingestion', timestamp: $json.headers?.['x-kaxi-timestamp'] ?? '', nonce: $json.headers?.['x-kaxi-nonce'] ?? '', signature: $json.headers?.['x-kaxi-signature'] ?? '', payload: $json.body ?? {} } }}"),
      options: { response: { response: { neverError: true, responseFormat: "json" } }, timeout: 10000 },
    },
  },
  output: [{ ok: true, purpose: "rag-ingestion", verificationToken: "signed-receipt" }],
});

const ingestionAllowed = ifElse({
  version: 2.3,
  config: {
    name: "Ingestion Signature Valid",
    position: [640, 680],
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
        conditions: [{ leftValue: expr("{{ $json.ok }}"), operator: { type: "boolean", operation: "true" }, rightValue: true }],
        combinator: "and",
      },
      options: {},
    },
  },
});

const computeChunkEmbedding = node({
  type: "n8n-nodes-base.httpRequest",
  version: 4.2,
  config: {
    name: "Compute Chunk Embedding",
    position: [880, 600],
    onError: "continueRegularOutput",
    parameters: {
      method: "POST",
      url: "https://api.openai.com/v1/embeddings",
      authentication: "predefinedCredentialType",
      nodeCredentialType: "openAiApi",
      sendBody: true,
      specifyBody: "json",
      jsonBody: expr("{{ JSON.stringify({ model: 'text-embedding-3-small', input: String($('RAG Knowledge Ingestion Webhook').item.json.body?.embedding_content || '').slice(0, 4000), dimensions: 1536, encoding_format: 'float' }) }}"),
      options: { timeout: 10000 },
    },
  },
  output: [{ data: [{ embedding: [0.001, 0.002] }] }],
});

const runIngestionCore = node({
  type: "n8n-nodes-base.httpRequest",
  version: 4.4,
  config: {
    name: "Run KAXI RAG Ingestion Core",
    position: [1120, 600],
    retryOnFail: true,
    maxTries: 2,
    waitBetweenTries: 750,
    parameters: {
      method: "POST",
      url: "https://kaxi.vercel.app/api/internal/n8n/rag-ingestion",
      authentication: "none",
      sendBody: true,
      contentType: "json",
      specifyBody: "json",
      jsonBody: expr("{{ { verificationToken: $('Verify Ingestion Signature').item.json.verificationToken ?? '', payload: $('RAG Knowledge Ingestion Webhook').item.json.body ?? {}, chunkEmbedding: Array.isArray($json.data) && Array.isArray($json.data[0]?.embedding) ? $json.data[0].embedding : undefined } }}"),
      options: {
        response: { response: { fullResponse: true, neverError: true, responseFormat: "json" } },
        timeout: 40000,
      },
    },
  },
  output: [{ statusCode: 200, body: { ok: true, status: "ready", dimensions: 1536 } }],
});

const respondIngestion = node({
  type: "n8n-nodes-base.respondToWebhook",
  version: 1.5,
  config: {
    name: "Respond Ingestion",
    position: [1400, 600],
    parameters: {
      respondWith: "json",
      responseBody: expr("{{ JSON.stringify({ ...($('Run KAXI RAG Ingestion Core').item.json.body ?? {}), executionId: $('Run KAXI RAG Ingestion Core').item.json.body?.executionId ?? $execution.id, workflowId: $('Run KAXI RAG Ingestion Core').item.json.body?.workflowId ?? $workflow.id, workflowVersionId: $('Run KAXI RAG Ingestion Core').item.json.body?.workflowVersionId ?? '" + release + "', modelVersion: $('Run KAXI RAG Ingestion Core').item.json.body?.modelVersion ?? '" + embeddingModel + "', promptVersion: $('Run KAXI RAG Ingestion Core').item.json.body?.promptVersion ?? 'kaxi-rag-ingestion@2026-07-14.mcp-v1', n8nExecutionId: $execution.id, n8nWorkflowId: $workflow.id, n8nWorkflowVersionId: '" + release + "' }) }}"),
      options: {
        responseCode: expr("{{ $('Run KAXI RAG Ingestion Core').item.json.statusCode ?? 502 }}"),
        responseHeaders: { entries: [{ name: "Content-Type", value: "application/json" }, { name: "Cache-Control", value: "no-store" }] },
      },
    },
  },
  output: [{ ok: true, status: "ready", dimensions: 1536 }],
});

const respondIngestionUnauthorized = node({
  type: "n8n-nodes-base.respondToWebhook",
  version: 1.5,
  config: {
    name: "Respond Ingestion Unauthorized",
    position: [880, 800],
    parameters: {
      respondWith: "json",
      responseBody: expr("{{ JSON.stringify({ ok: false, status: 'unauthorized', executionId: $execution.id, workflowId: $workflow.id, workflowVersionId: '" + release + "', modelVersion: '" + embeddingModel + "', promptVersion: 'kaxi-rag-ingestion@2026-07-14.mcp-v1' }) }}"),
      options: { responseCode: 401, responseHeaders: { entries: [{ name: "Content-Type", value: "application/json" }] } },
    },
  },
  output: [{ ok: false, status: "unauthorized" }],
});

const handoffWebhook = trigger({
  type: "n8n-nodes-base.webhook",
  version: 2.1,
  config: {
    name: "Typebot Handoff Update Webhook",
    position: [160, 1120],
    parameters: {
      httpMethod: "POST",
      path: "typebot-handoff-update",
      responseMode: "responseNode",
      options: { allowedOrigins: "https://kaxi.vercel.app", ignoreBots: false },
    },
  },
  output: [{ headers: {}, body: { sessionId: "typebot-example", leadContactRedacted: true } }],
});

const verifyHandoff = node({
  type: "n8n-nodes-base.httpRequest",
  version: 4.4,
  config: {
    name: "Verify Handoff Signature",
    position: [400, 1120],
    parameters: {
      method: "POST",
      url: "https://kaxi.vercel.app/api/internal/n8n/verify",
      authentication: "none",
      sendBody: true,
      contentType: "json",
      specifyBody: "json",
      jsonBody: expr("{{ { purpose: 'typebot-handoff', timestamp: $json.headers?.['x-kaxi-timestamp'] ?? '', nonce: $json.headers?.['x-kaxi-nonce'] ?? '', signature: $json.headers?.['x-kaxi-signature'] ?? '', payload: $json.body ?? {} } }}"),
      options: { response: { response: { neverError: true, responseFormat: "json" } }, timeout: 10000 },
    },
  },
  output: [{ ok: true, purpose: "typebot-handoff", verificationToken: "signed-receipt" }],
});

const handoffAllowed = ifElse({
  version: 2.3,
  config: {
    name: "Handoff Signature Valid",
    position: [640, 1120],
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
        conditions: [{ leftValue: expr("{{ $json.ok }}"), operator: { type: "boolean", operation: "true" }, rightValue: true }],
        combinator: "and",
      },
      options: {},
    },
  },
});

const runHandoffCore = node({
  type: "n8n-nodes-base.httpRequest",
  version: 4.4,
  config: {
    name: "Run KAXI Handoff Core",
    position: [880, 1040],
    retryOnFail: true,
    maxTries: 2,
    waitBetweenTries: 500,
    parameters: {
      method: "POST",
      url: "https://kaxi.vercel.app/api/internal/n8n/handoff-update",
      authentication: "none",
      sendBody: true,
      contentType: "json",
      specifyBody: "json",
      jsonBody: expr("{{ { verificationToken: $('Verify Handoff Signature').item.json.verificationToken ?? '', payload: $('Typebot Handoff Update Webhook').item.json.body ?? {} } }}"),
      options: {
        response: { response: { fullResponse: true, neverError: true, responseFormat: "json" } },
        timeout: 20000,
      },
    },
  },
  output: [{ statusCode: 200, body: { ok: true, status: "contact_received" } }],
});

const respondHandoff = node({
  type: "n8n-nodes-base.respondToWebhook",
  version: 1.5,
  config: {
    name: "Respond Handoff Update",
    position: [1160, 1040],
    parameters: {
      respondWith: "json",
      responseBody: expr("{{ JSON.stringify({ ...($('Run KAXI Handoff Core').item.json.body ?? {}), executionId: $('Run KAXI Handoff Core').item.json.body?.executionId ?? $execution.id, workflowId: $('Run KAXI Handoff Core').item.json.body?.workflowId ?? $workflow.id, workflowVersionId: $('Run KAXI Handoff Core').item.json.body?.workflowVersionId ?? '" + release + "', modelVersion: $('Run KAXI Handoff Core').item.json.body?.modelVersion ?? '" + embeddingModel + "', promptVersion: $('Run KAXI Handoff Core').item.json.body?.promptVersion ?? 'kaxi-handoff-update@2026-07-14.mcp-v1', n8nExecutionId: $execution.id, n8nWorkflowId: $workflow.id, n8nWorkflowVersionId: '" + release + "' }) }}"),
      options: {
        responseCode: expr("{{ $('Run KAXI Handoff Core').item.json.statusCode ?? 502 }}"),
        responseHeaders: { entries: [{ name: "Content-Type", value: "application/json" }, { name: "Cache-Control", value: "no-store" }] },
      },
    },
  },
  output: [{ ok: true, status: "contact_received" }],
});

const respondHandoffUnauthorized = node({
  type: "n8n-nodes-base.respondToWebhook",
  version: 1.5,
  config: {
    name: "Respond Handoff Unauthorized",
    position: [880, 1240],
    parameters: {
      respondWith: "json",
      responseBody: expr("{{ JSON.stringify({ ok: false, status: 'unauthorized', executionId: $execution.id, workflowId: $workflow.id, workflowVersionId: '" + release + "', modelVersion: '" + embeddingModel + "', promptVersion: 'kaxi-handoff-update@2026-07-14.mcp-v1' }) }}"),
      options: { responseCode: 401, responseHeaders: { entries: [{ name: "Content-Type", value: "application/json" }] } },
    },
  },
  output: [{ ok: false, status: "unauthorized" }],
});

const capabilityWebhook = trigger({
  type: "n8n-nodes-base.webhook",
  version: 2.1,
  config: {
    name: "RAG Serving Capability Webhook",
    position: [160, 1480],
    parameters: {
      httpMethod: "GET",
      path: "rag-serving-capabilities",
      responseMode: "responseNode",
      options: { allowedOrigins: "https://kaxi.vercel.app", ignoreBots: false },
    },
  },
  output: [{ headers: {}, query: {} }],
});

const respondCapability = node({
  type: "n8n-nodes-base.respondToWebhook",
  version: 1.5,
  config: {
    name: "Respond RAG Serving Capability",
    position: [440, 1480],
    parameters: {
      respondWith: "json",
      responseBody: expr("{{ JSON.stringify({ service: 'kaxi-rag-serving', contractVersion: '2026-07-14.v4', workflowId: $workflow.id, ingestionTarget: 'rag_serving_chunks', retrievalMode: 'hybrid-rrf-v3-openai-required', lexicalCandidateCount: 20, vectorCandidateCount: 20, finalMatchCount: 6, embeddingModel: 'text-embedding-3-small', corpusEmbeddingModel: 'text-embedding-3-small', embeddingContentStrategy: 'single-locale-v1', dimensions: 1536, queryEmbeddingOptional: false, storedVectorFallback: 'disabled', vectorSeedCount: 0, providerFailureMode: 'fail-closed', signedIngestionRequired: true, executionId: $execution.id, workflowVersionId: '" + release + "', modelVersion: '" + retrievalModel + "', promptVersion: 'kaxi-rag-capability@2026-07-14.v4' }) }}"),
      options: {
        responseCode: 200,
        responseHeaders: { entries: [{ name: "Content-Type", value: "application/json" }, { name: "Cache-Control", value: "no-store" }] },
      },
    },
  },
  output: [{ service: "kaxi-rag-serving", contractVersion: "2026-07-14.v4", embeddingContentStrategy: "single-locale-v1", dimensions: 1536 }],
});

export default workflow("kaxi-rag-typebot-railway", "KAXI RAG Typebot Orchestrator")
  .add(runtimeWebhook)
  .to(verifyRuntime)
  .to(runtimeAllowed
    .onTrue(computeQueryEmbedding.to(runRagCore.to(respondTypebot)))
    .onFalse(respondRuntimeUnauthorized))
  .add(ingestionWebhook)
  .to(verifyIngestion)
  .to(ingestionAllowed
    .onTrue(computeChunkEmbedding.to(runIngestionCore.to(respondIngestion)))
    .onFalse(respondIngestionUnauthorized))
  .add(handoffWebhook)
  .to(verifyHandoff)
  .to(handoffAllowed
    .onTrue(runHandoffCore.to(respondHandoff))
    .onFalse(respondHandoffUnauthorized))
  .add(capabilityWebhook)
  .to(respondCapability)
  // Declared here so the compiled workflow JSON carries them: importing a
  // settings-less workflow into the live n8n would wipe execution retention
  // (which operations review depends on) and the timezone. The save* values
  // are asserted by scripts/test-n8n-rag-orchestration.ts.
  // The Error Workflow is deliberately NOT declared: it references a
  // per-instance workflow id (N8N_ERROR_WORKFLOW_ID) and is assigned in the
  // n8n UI, so it must be re-checked after any import.
  .settings({
    executionOrder: "v1",
    availableInMCP: true,
    binaryMode: "separate",
    timezone: "Asia/Seoul",
    saveDataErrorExecution: "all",
    saveDataSuccessExecution: "all",
    saveExecutionProgress: true,
    executionTimeout: 60,
  });
