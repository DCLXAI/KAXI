export type RagProvenance = {
  workflowId: string;
  workflowVersionId: string;
  modelVersion: string;
  promptVersion: string;
};

export const DEFAULT_RAG_PROVENANCE: RagProvenance = {
  workflowId: "rB3nfjvCyTODP803",
  workflowVersionId: "kaxi-rag-runtime@2026-07-14.provider-independent-hybrid-v2",
  modelVersion: "retrieval/hybrid-rrf-v3@2026-07-14",
  promptVersion: "kaxi-grounded-extractive@2026-07-13.p0-v1",
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

export function summarizeRagProvenance(
  values: unknown[],
  fallback: RagProvenance = DEFAULT_RAG_PROVENANCE,
) {
  const counts = new Map<string, { provenance: RagProvenance; count: number }>();
  for (const value of values) {
    const provenance = extractRagProvenance(value);
    if (!provenance) continue;
    const key = JSON.stringify(provenance);
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { provenance, count: 1 });
  }

  const observed = [...counts.values()].sort((left, right) => right.count - left.count);
  return {
    effective: observed.length === 1 ? observed[0].provenance : fallback,
    observed,
    mixed: observed.length > 1,
  };
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
