CREATE EXTENSION IF NOT EXISTS vector;

-- n8n / Typebot-facing RAG store.
-- Keep this separate from the app's governed KnowledgeChunk vector(384) corpus:
-- n8n uses OpenAI text-embedding-3-small with 1536 dimensions.
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_hnsw
  ON public.knowledge_chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS knowledge_chunks_metadata_gin
  ON public.knowledge_chunks USING gin (metadata jsonb_path_ops);

CREATE INDEX IF NOT EXISTS knowledge_chunks_tenant_idx
  ON public.knowledge_chunks ((coalesce(metadata->>'tenant_id', 'default')));

CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding vector(1536),
  match_count integer DEFAULT 6,
  filter jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity double precision
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.content,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_chunks kc
  WHERE kc.embedding IS NOT NULL
    AND kc.metadata @> coalesce(filter, '{}'::jsonb)
  ORDER BY kc.embedding <=> query_embedding
  LIMIT greatest(coalesce(match_count, 6), 0);
END;
$$;

-- Audit trail written by the n8n Typebot runtime.
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'low',
  needs_human BOOLEAN NOT NULL DEFAULT false,
  sources_json TEXT NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_messages_session_idx
  ON public.chat_messages (session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS chat_messages_tenant_created_idx
  ON public.chat_messages (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS chat_messages_risk_idx
  ON public.chat_messages (risk_level, needs_human);

-- Human-review queue for missing-context, high-risk, or handoff-worthy answers.
CREATE TABLE IF NOT EXISTS public.handoff_tasks (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  lead_stage TEXT NOT NULL DEFAULT 'review',
  status TEXT NOT NULL DEFAULT 'open',
  assignee TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS handoff_tasks_status_created_idx
  ON public.handoff_tasks (status, created_at DESC);

CREATE INDEX IF NOT EXISTS handoff_tasks_tenant_status_idx
  ON public.handoff_tasks (tenant_id, status);

CREATE INDEX IF NOT EXISTS handoff_tasks_risk_idx
  ON public.handoff_tasks (risk_level, lead_stage);

CREATE OR REPLACE FUNCTION public.kaxi_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS knowledge_chunks_touch_updated_at ON public.knowledge_chunks;
CREATE TRIGGER knowledge_chunks_touch_updated_at
BEFORE UPDATE ON public.knowledge_chunks
FOR EACH ROW
EXECUTE FUNCTION public.kaxi_touch_updated_at();

DROP TRIGGER IF EXISTS handoff_tasks_touch_updated_at ON public.handoff_tasks;
CREATE TRIGGER handoff_tasks_touch_updated_at
BEFORE UPDATE ON public.handoff_tasks
FOR EACH ROW
EXECUTE FUNCTION public.kaxi_touch_updated_at();

COMMENT ON TABLE public.knowledge_chunks IS
  'n8n Typebot RAG vector store using OpenAI text-embedding-3-small, 1536 dimensions.';

COMMENT ON FUNCTION public.match_documents(vector, integer, jsonb) IS
  'LangChain/n8n Supabase Vector Store similarity search RPC for public.knowledge_chunks.';
