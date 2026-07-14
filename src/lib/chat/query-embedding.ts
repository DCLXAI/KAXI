import { embedText } from "@/lib/embeddings/transformer-embedder";

export const RAG_QUERY_EMBEDDING_MODEL = "text-embedding-3-small";
export const RAG_QUERY_EMBEDDING_DIMENSIONS = 1536;
export const CANONICAL_QUERY_EMBEDDING_MODEL = "Xenova/multilingual-e5-small";
export const CANONICAL_QUERY_EMBEDDING_DIMENSIONS = 384;

export type RagEmbeddingStrategy = "openai-primary" | "e5-primary" | "openai-only";

export type QueryEmbeddingResult = {
  vector: number[] | null;
  status: "ready" | "not_configured" | "disabled" | "failed";
  provider: "openai-compatible" | "local-transformer" | "none";
  model: string;
  dimensions: number | null;
  failureReason: string | null;
  latencyMs: number;
  strategy?: RagEmbeddingStrategy;
  fallbackFrom?: "openai" | "e5" | null;
  primaryFailureReason?: string | null;
};

type QueryEmbeddingOptions = {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
};

function configured(value: string | undefined) {
  const normalized = value?.trim() || "";
  if (!normalized || /^(replace-with-|change_me)/i.test(normalized)) return "";
  return normalized;
}

export function getRagEmbeddingStrategy(env: NodeJS.ProcessEnv = process.env): RagEmbeddingStrategy {
  const value = configured(env.KAXI_RAG_EMBEDDING_STRATEGY).toLowerCase();
  if (value === "e5-primary" || value === "openai-only") return value;
  return "openai-primary";
}

function timeoutMs(env: NodeJS.ProcessEnv) {
  const parsed = Number(env.OPENAI_EMBEDDING_TIMEOUT_MS);
  if (!Number.isFinite(parsed)) return 4_000;
  return Math.min(Math.max(Math.trunc(parsed), 1_000), 10_000);
}

function endpoint(env: NodeJS.ProcessEnv) {
  const baseUrl = configured(env.OPENAI_EMBEDDING_BASE_URL) || "https://api.openai.com/v1";
  try {
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return null;
    parsed.pathname = `${parsed.pathname.replace(/\/$/, "")}/embeddings`;
    return parsed.toString();
  } catch {
    return null;
  }
}

async function providerHttpFailureReason(response: Response) {
  const payload = await response.json().catch(() => null) as {
    error?: { code?: unknown; type?: unknown };
  } | null;
  const code = typeof payload?.error?.code === "string" ? payload.error.code : "";
  const type = typeof payload?.error?.type === "string" ? payload.error.type : "";
  if (code === "insufficient_quota" || type === "insufficient_quota") {
    return "embedding_provider_insufficient_quota";
  }
  if (response.status === 429) return "embedding_provider_rate_limited";
  if (code === "invalid_api_key" || type === "invalid_request_error" && response.status === 401) {
    return "embedding_provider_invalid_api_key";
  }
  return `embedding_provider_http_${response.status}`;
}

function result(
  startedAt: number,
  input: Omit<QueryEmbeddingResult, "latencyMs" | "dimensions"> & { dimensions?: number | null },
): QueryEmbeddingResult {
  const dimensions = input.dimensions
    ?? (input.model === RAG_QUERY_EMBEDDING_MODEL ? RAG_QUERY_EMBEDDING_DIMENSIONS : null);
  return { ...input, dimensions, latencyMs: Date.now() - startedAt };
}

function withStrategy(
  embedding: QueryEmbeddingResult,
  strategy: RagEmbeddingStrategy,
  fallbackFrom?: "openai" | "e5",
  primaryFailureReason?: string | null,
): QueryEmbeddingResult {
  return {
    ...embedding,
    strategy,
    fallbackFrom: fallbackFrom || null,
    primaryFailureReason: primaryFailureReason || null,
  };
}

export function isOpenAiQueryEmbedding(embedding: QueryEmbeddingResult) {
  return embedding.status === "ready"
    && embedding.provider === "openai-compatible"
    && embedding.model === RAG_QUERY_EMBEDDING_MODEL
    && embedding.dimensions === RAG_QUERY_EMBEDDING_DIMENSIONS
    && embedding.vector?.length === RAG_QUERY_EMBEDDING_DIMENSIONS;
}

export function isCanonicalQueryEmbedding(embedding: QueryEmbeddingResult) {
  return embedding.status === "ready"
    && embedding.provider === "local-transformer"
    && embedding.model === CANONICAL_QUERY_EMBEDDING_MODEL
    && embedding.dimensions === CANONICAL_QUERY_EMBEDDING_DIMENSIONS
    && embedding.vector?.length === CANONICAL_QUERY_EMBEDDING_DIMENSIONS;
}

export async function createRagQueryEmbedding(
  question: string,
  options: QueryEmbeddingOptions = {},
): Promise<QueryEmbeddingResult> {
  const startedAt = Date.now();
  const env = options.env || process.env;
  const model = configured(env.OPENAI_EMBEDDING_MODEL) || RAG_QUERY_EMBEDDING_MODEL;
  if (env.KAXI_QUERY_EMBEDDINGS_ENABLED === "false") {
    return result(startedAt, {
      vector: null,
      status: "disabled",
      provider: "none",
      model,
      failureReason: "embedding_disabled",
    });
  }
  const apiKey = configured(env.OPENAI_EMBEDDING_API_KEY)
    || (env.KAXI_QUERY_EMBEDDINGS_USE_OPENAI_KEY === "true" ? configured(env.OPENAI_API_KEY) : "");
  if (!apiKey) {
    return result(startedAt, {
      vector: null,
      status: "not_configured",
      provider: "none",
      model,
      failureReason: "embedding_provider_not_configured",
    });
  }
  if (model !== RAG_QUERY_EMBEDDING_MODEL) {
    return result(startedAt, {
      vector: null,
      status: "failed",
      provider: "openai-compatible",
      model,
      failureReason: "embedding_model_mismatch",
    });
  }
  const url = endpoint(env);
  if (!url) {
    return result(startedAt, {
      vector: null,
      status: "failed",
      provider: "openai-compatible",
      model,
      failureReason: "embedding_endpoint_invalid",
    });
  }

  try {
    const response = await (options.fetchImpl || fetch)(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: question.slice(0, 4_000),
        dimensions: RAG_QUERY_EMBEDDING_DIMENSIONS,
        encoding_format: "float",
      }),
      signal: AbortSignal.timeout(timeoutMs(env)),
    });
    if (!response.ok) {
      return result(startedAt, {
        vector: null,
        status: "failed",
        provider: "openai-compatible",
        model,
        failureReason: await providerHttpFailureReason(response),
      });
    }
    const payload = await response.json().catch(() => null) as {
      data?: Array<{ embedding?: unknown }>;
    } | null;
    const embedding = payload?.data?.[0]?.embedding;
    if (
      !Array.isArray(embedding)
      || embedding.length !== RAG_QUERY_EMBEDDING_DIMENSIONS
      || embedding.some((value) => typeof value !== "number" || !Number.isFinite(value))
    ) {
      return result(startedAt, {
        vector: null,
        status: "failed",
        provider: "openai-compatible",
        model,
        failureReason: "embedding_provider_invalid_vector",
      });
    }
    return result(startedAt, {
      vector: embedding as number[],
      status: "ready",
      provider: "openai-compatible",
      model,
      failureReason: null,
    });
  } catch (error) {
    const timeout = error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError");
    return result(startedAt, {
      vector: null,
      status: "failed",
      provider: "openai-compatible",
      model,
      failureReason: timeout ? "embedding_provider_timeout" : "embedding_provider_unavailable",
    });
  }
}

export async function createCanonicalRagQueryEmbedding(
  question: string,
  options: Pick<QueryEmbeddingOptions, "env"> = {},
): Promise<QueryEmbeddingResult> {
  const startedAt = Date.now();
  const env = options.env || process.env;
  if (
    env.KAXI_QUERY_EMBEDDINGS_ENABLED === "false"
    || env.KAXI_CANONICAL_QUERY_EMBEDDINGS_ENABLED === "false"
  ) {
    return result(startedAt, {
      vector: null,
      status: "disabled",
      provider: "none",
      model: CANONICAL_QUERY_EMBEDDING_MODEL,
      dimensions: CANONICAL_QUERY_EMBEDDING_DIMENSIONS,
      failureReason: "embedding_disabled",
    });
  }

  try {
    const embedded = await embedText(`query: ${question.slice(0, 4_000)}`);
    const vector = Array.from(embedded.vector);
    if (
      embedded.method !== "transformer"
      || vector.length !== CANONICAL_QUERY_EMBEDDING_DIMENSIONS
      || vector.some((value) => !Number.isFinite(value))
    ) {
      return result(startedAt, {
        vector: null,
        status: "failed",
        provider: "local-transformer",
        model: CANONICAL_QUERY_EMBEDDING_MODEL,
        dimensions: CANONICAL_QUERY_EMBEDDING_DIMENSIONS,
        failureReason: "canonical_embedding_invalid_vector",
      });
    }
    return result(startedAt, {
      vector,
      status: "ready",
      provider: "local-transformer",
      model: CANONICAL_QUERY_EMBEDDING_MODEL,
      dimensions: CANONICAL_QUERY_EMBEDDING_DIMENSIONS,
      failureReason: null,
    });
  } catch {
    return result(startedAt, {
      vector: null,
      status: "failed",
      provider: "local-transformer",
      model: CANONICAL_QUERY_EMBEDDING_MODEL,
      dimensions: CANONICAL_QUERY_EMBEDDING_DIMENSIONS,
      failureReason: "canonical_embedding_unavailable",
    });
  }
}

export async function createRagQueryEmbeddingWithLocalFallback(
  question: string,
  options: QueryEmbeddingOptions = {},
): Promise<QueryEmbeddingResult> {
  const env = options.env || process.env;
  const strategy = getRagEmbeddingStrategy(env);

  if (strategy === "openai-only") {
    return withStrategy(await createRagQueryEmbedding(question, options), strategy);
  }

  const openAiPrimary = strategy === "openai-primary";
  const primary = openAiPrimary
    ? await createRagQueryEmbedding(question, options)
    : await createCanonicalRagQueryEmbedding(question, { env });
  if (primary.status === "ready" || primary.status === "disabled") {
    return withStrategy(primary, strategy);
  }

  const fallback = openAiPrimary
    ? await createCanonicalRagQueryEmbedding(question, { env })
    : await createRagQueryEmbedding(question, options);
  if (fallback.status === "ready") {
    return withStrategy(
      fallback,
      strategy,
      openAiPrimary ? "openai" : "e5",
      primary.failureReason || primary.status,
    );
  }

  return withStrategy(primary, strategy);
}
