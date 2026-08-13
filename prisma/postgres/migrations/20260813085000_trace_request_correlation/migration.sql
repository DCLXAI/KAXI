-- Preserve one request identifier across canonical transaction, outbox and
-- every Worker queue. This is additive/backfilled so in-flight jobs survive
-- deployment and keep their existing trace identity.

ALTER TABLE public.outbox_events ADD COLUMN request_id TEXT;
ALTER TABLE public.worker_jobs ADD COLUMN request_id TEXT;
ALTER TABLE public.chat_attachment_jobs ADD COLUMN request_id TEXT;
ALTER TABLE public.chat_attachment_jobs ADD COLUMN trace_id TEXT;
ALTER TABLE public.chat_attachment_jobs ADD COLUMN traceparent TEXT;

UPDATE public.outbox_events AS event
SET request_id = COALESCE(message.request_id::text, event.trace_id)
FROM public.chat_messages AS message
WHERE message.id = event.message_id
  AND event.request_id IS NULL;

UPDATE public.outbox_events
SET request_id = trace_id
WHERE request_id IS NULL;

UPDATE public.worker_jobs
SET request_id = COALESCE(NULLIF(payload->>'requestId', ''), trace_id)
WHERE request_id IS NULL;

UPDATE public.chat_attachment_jobs
SET request_id = 'attachment-job:' || id::text,
    trace_id = replace(id::text, '-', ''),
    traceparent = '00-' || replace(id::text, '-', '') || '-' || substr(md5(id::text), 1, 16) || '-01'
WHERE request_id IS NULL OR trace_id IS NULL;

ALTER TABLE public.outbox_events ALTER COLUMN request_id SET NOT NULL;
ALTER TABLE public.worker_jobs ALTER COLUMN request_id SET NOT NULL;
ALTER TABLE public.chat_attachment_jobs ALTER COLUMN request_id SET NOT NULL;
ALTER TABLE public.chat_attachment_jobs ALTER COLUMN trace_id SET NOT NULL;
ALTER TABLE public.chat_attachment_jobs ALTER COLUMN traceparent SET NOT NULL;

CREATE INDEX outbox_events_request_created_idx
  ON public.outbox_events(request_id, created_at);
CREATE INDEX worker_jobs_request_created_idx
  ON public.worker_jobs(request_id, created_at);
CREATE INDEX chat_attachment_jobs_request_created_idx
  ON public.chat_attachment_jobs(request_id, created_at);

COMMENT ON COLUMN public.outbox_events.request_id IS
  'Canonical request identifier propagated from the Web/chat transaction.';
COMMENT ON COLUMN public.worker_jobs.request_id IS
  'Request or scheduler-run identifier shared by Web and Worker trace spans.';
COMMENT ON COLUMN public.chat_attachment_jobs.request_id IS
  'Upload/retry request identifier used to correlate attachment Worker spans.';

NOTIFY pgrst, 'reload schema';
