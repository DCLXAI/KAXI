-- n8n audit rows are operational metadata. Canonical encrypted conversation
-- content belongs to chat_messages and retrieval_runs.

UPDATE public.n8n_audit_messages
SET
  question = '[canonical-chat-message]',
  answer = '[canonical-chat-message]',
  question_redacted = true,
  answer_redacted = true,
  sources_json = '[]',
  updated_at = now();

ALTER TABLE public.n8n_audit_messages
  ALTER COLUMN question SET DEFAULT '[canonical-chat-message]',
  ALTER COLUMN answer SET DEFAULT '[canonical-chat-message]',
  ALTER COLUMN question_redacted SET DEFAULT true,
  ALTER COLUMN answer_redacted SET DEFAULT true,
  ALTER COLUMN sources_json SET DEFAULT '[]';

CREATE OR REPLACE FUNCTION public.kaxi_sanitize_n8n_audit_content()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.question := '[canonical-chat-message]';
  NEW.answer := '[canonical-chat-message]';
  NEW.question_redacted := true;
  NEW.answer_redacted := true;
  NEW.sources_json := '[]';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS n8n_audit_messages_sanitize_content ON public.n8n_audit_messages;
CREATE TRIGGER n8n_audit_messages_sanitize_content
BEFORE INSERT OR UPDATE ON public.n8n_audit_messages
FOR EACH ROW EXECUTE FUNCTION public.kaxi_sanitize_n8n_audit_content();

COMMENT ON TABLE public.n8n_audit_messages IS
  'Metadata-only workflow audit. Encrypted conversation content belongs to chat_messages; retrieval evidence belongs to retrieval_runs.';
COMMENT ON COLUMN public.n8n_audit_messages.question IS
  'Fixed placeholder only. A keyed lookup hash may be stored in question_hash.';
COMMENT ON COLUMN public.n8n_audit_messages.answer IS
  'Fixed placeholder only. A keyed lookup hash may be stored in answer_hash.';

NOTIFY pgrst, 'reload schema';
