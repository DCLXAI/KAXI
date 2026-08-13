ALTER TABLE public.retrieval_runs
  ADD COLUMN plan_version TEXT NOT NULL DEFAULT 'legacy-unversioned',
  ADD COLUMN score_version TEXT NOT NULL DEFAULT 'legacy-unversioned',
  ADD COLUMN threshold_set TEXT NOT NULL DEFAULT 'legacy-unversioned',
  ADD COLUMN embedding_source TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN candidate_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN corpus_snapshot_id TEXT NOT NULL DEFAULT 'legacy-unversioned',
  ADD COLUMN replay_spec JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD CONSTRAINT retrieval_runs_candidate_count_check CHECK (candidate_count >= 0);

CREATE INDEX retrieval_runs_plan_score_created_idx
  ON public.retrieval_runs (plan_version, score_version, created_at DESC);

CREATE OR REPLACE FUNCTION public.match_rag_documents_lexical_v3(
  match_count integer DEFAULT 6,
  filter jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (id bigint, content text, metadata jsonb, similarity double precision)
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
DECLARE
  v_tenant_id text := nullif(trim(coalesce(filter->>'tenant_id', '')), '');
BEGIN
  IF v_tenant_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = v_tenant_id) THEN
    RAISE EXCEPTION 'valid tenant_id is required';
  END IF;
  RETURN QUERY
  SELECT result.id, result.content,
    result.metadata || jsonb_build_object(
      'plan_version', 'kaxi-retrieval-plan-v1',
      'threshold_set', 'locale-category-margin-v2',
      'rpc_version', 'lexical-v3'
    ),
    result.similarity
  FROM public.match_rag_documents_lexical(match_count, filter) result;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_rag_documents_hybrid_v4(
  query_embedding vector(1536) DEFAULT NULL,
  match_count integer DEFAULT 6,
  filter jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (id bigint, content text, metadata jsonb, similarity double precision)
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
DECLARE
  v_tenant_id text := nullif(trim(coalesce(filter->>'tenant_id', '')), '');
BEGIN
  IF v_tenant_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = v_tenant_id) THEN
    RAISE EXCEPTION 'valid tenant_id is required';
  END IF;
  RETURN QUERY
  SELECT result.id, result.content,
    result.metadata || jsonb_build_object(
      'plan_version', 'kaxi-retrieval-plan-v1',
      'threshold_set', 'locale-category-margin-v2',
      'rpc_version', 'hybrid-v4'
    ),
    result.similarity
  FROM public.match_rag_documents_hybrid_v3(query_embedding, match_count, filter) result;
END;
$$;

REVOKE ALL ON FUNCTION public.match_rag_documents_lexical_v3(integer, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.match_rag_documents_hybrid_v4(vector, integer, jsonb) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.match_rag_documents_lexical_v3(integer, jsonb) FROM anon;
    REVOKE ALL ON FUNCTION public.match_rag_documents_hybrid_v4(vector, integer, jsonb) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION public.match_rag_documents_lexical_v3(integer, jsonb) FROM authenticated;
    REVOKE ALL ON FUNCTION public.match_rag_documents_hybrid_v4(vector, integer, jsonb) FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.match_rag_documents_lexical_v3(integer, jsonb) TO service_role;
    GRANT EXECUTE ON FUNCTION public.match_rag_documents_hybrid_v4(vector, integer, jsonb) TO service_role;
  END IF;
END
$$;

COMMENT ON FUNCTION public.match_rag_documents_lexical(integer, jsonb) IS
  'DEPRECATED compatibility RPC. Shadow with lexical_v3. Removal date: 2027-02-01.';
COMMENT ON FUNCTION public.match_rag_documents_hybrid_v3(vector, integer, jsonb) IS
  'DEPRECATED compatibility RPC. Shadow with hybrid_v4. Removal date: 2027-02-01.';
COMMENT ON FUNCTION public.match_rag_documents_lexical_v3(integer, jsonb) IS
  'Tenant-required lexical stage for kaxi-retrieval-plan-v1.';
COMMENT ON FUNCTION public.match_rag_documents_hybrid_v4(vector, integer, jsonb) IS
  'Tenant-required hybrid RRF stage for kaxi-retrieval-plan-v1.';

NOTIFY pgrst, 'reload schema';
