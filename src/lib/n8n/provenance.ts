export type RagProvenance = {
  workflowId: string;
  workflowVersionId: string;
  modelVersion: string;
  promptVersion: string;
};

export const DEFAULT_RAG_PROVENANCE: RagProvenance = {
  workflowId: "EqX3C5c2WNWoKkSR",
  workflowVersionId: "kaxi-rag-runtime@2026-07-12.lexical-fallback-v1",
  modelVersion: "retrieval/lexical-provider-fallback@v1",
  promptVersion: "kaxi-grounded-context-answer@2026-07-12.lexical-fallback-v1",
};

export const RAG_PROVENANCE_HEADERS = {
  workflowId: "x-kaxi-workflow-id",
  workflowVersionId: "x-kaxi-workflow-version-id",
  modelVersion: "x-kaxi-model-version",
  promptVersion: "x-kaxi-prompt-version",
} as const;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function versionText(value: unknown) {
  if (typeof value !== "string") return "";
  const text = value.trim().slice(0, 200);
  return text && !/^replace-with-/i.test(text) ? text : "";
}

export function extractRagProvenance(value: unknown): RagProvenance | null {
  const candidate = record(value);
  const workflowId = versionText(candidate.workflowId);
  const workflowVersionId = versionText(candidate.workflowVersionId);
  const modelVersion = versionText(candidate.modelVersion);
  const promptVersion = versionText(candidate.promptVersion);
  if (!workflowId || !workflowVersionId || !modelVersion || !promptVersion) return null;
  return { workflowId, workflowVersionId, modelVersion, promptVersion };
}

export function resolveRagProvenance(
  value?: unknown,
  env: NodeJS.ProcessEnv = process.env,
): RagProvenance {
  const candidate = record(value);
  return {
    workflowId:
      versionText(candidate.workflowId)
      || versionText(env.N8N_RAG_WORKFLOW_ID)
      || DEFAULT_RAG_PROVENANCE.workflowId,
    workflowVersionId:
      versionText(candidate.workflowVersionId)
      || versionText(env.N8N_RAG_WORKFLOW_VERSION_ID)
      || DEFAULT_RAG_PROVENANCE.workflowVersionId,
    modelVersion:
      versionText(candidate.modelVersion)
      || versionText(env.N8N_RAG_MODEL_VERSION)
      || DEFAULT_RAG_PROVENANCE.modelVersion,
    promptVersion:
      versionText(candidate.promptVersion)
      || versionText(env.N8N_RAG_PROMPT_VERSION)
      || DEFAULT_RAG_PROVENANCE.promptVersion,
  };
}

export function ragProvenanceHeaders(provenance: RagProvenance) {
  return {
    [RAG_PROVENANCE_HEADERS.workflowId]: provenance.workflowId,
    [RAG_PROVENANCE_HEADERS.workflowVersionId]: provenance.workflowVersionId,
    [RAG_PROVENANCE_HEADERS.modelVersion]: provenance.modelVersion,
    [RAG_PROVENANCE_HEADERS.promptVersion]: provenance.promptVersion,
  };
}
