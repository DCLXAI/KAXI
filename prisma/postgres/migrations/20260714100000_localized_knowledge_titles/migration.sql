DO $$
DECLARE
  v_document_id text;
  v_chunk record;
  v_content text;
  v_hash text;
BEGIN
  SELECT id
  INTO v_document_id
  FROM "KnowledgeDocument"
  WHERE "docId" = 'visa-portal-visa-types';

  IF v_document_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE "KnowledgeDocument"
  SET
    title = '대한민국 비자포털 비자 유형 목록',
    "updatedAt" = now()
  WHERE id = v_document_id;

  FOR v_chunk IN
    SELECT id, content
    FROM "KnowledgeChunk"
    WHERE "documentId" = v_document_id
    ORDER BY "chunkIndex"
  LOOP
    v_content := replace(
      replace(
        v_chunk.content,
        '# Korea Visa Portal 비자 유형 목록',
        '# 대한민국 비자포털 비자 유형 목록'
      ),
      '# Korea Visa Portal визийн төрлийн жагсаалт',
      '# БНСУ-ын визийн порталын визийн төрлийн жагсаалт'
    );

    IF v_content = v_chunk.content THEN
      CONTINUE;
    END IF;

    v_hash := encode(digest(convert_to(v_content, 'UTF8'), 'sha256'), 'hex');

    UPDATE "KnowledgeChunk"
    SET
      content = v_content,
      "contentHash" = v_hash,
      "updatedAt" = now()
    WHERE id = v_chunk.id;

    UPDATE public.rag_serving_chunks
    SET
      content = v_content,
      metadata = metadata || jsonb_build_object(
        'title', '대한민국 비자포털 비자 유형 목록',
        'content_hash', v_hash,
        'title_locale_normalized_at', '2026-07-14',
        'embedding_reuse_reason', 'localized-title-only'
      ),
      updated_at = now()
    WHERE canonical_chunk_id = v_chunk.id;
  END LOOP;

  PERFORM public.kaxi_refresh_rag_serving_status();
END
$$;

COMMENT ON TABLE public.rag_serving_chunks IS
  'Governed 1536d serving projection. Title-only locale normalization may retain an existing embedding and records embedding_reuse_reason in metadata.';

NOTIFY pgrst, 'reload schema';
