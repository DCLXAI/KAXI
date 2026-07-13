ALTER FUNCTION public.kaxi_queue_retrieval_review()
  SET search_path = public, extensions;

COMMENT ON FUNCTION public.kaxi_queue_retrieval_review() IS
  'Queues governed retrieval reviews and resolves pgcrypto digest through the extensions schema.';
