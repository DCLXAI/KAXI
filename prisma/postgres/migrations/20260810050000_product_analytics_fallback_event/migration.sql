-- Keep the database event allow-list aligned with the server analytics contract.
ALTER TABLE public.product_events
  DROP CONSTRAINT IF EXISTS product_events_name_check;

ALTER TABLE public.product_events
  ADD CONSTRAINT product_events_name_check CHECK (event_name IN (
    'page_view',
    'diagnosis_viewed',
    'diagnosis_card_selected',
    'diagnosis_completed',
    'chatbot_opened',
    'chatbot_question_sent',
    'chatbot_answer_succeeded',
    'chatbot_answer_failed',
    'chatbot_fallback',
    'chatbot_no_context',
    'chatbot_retry',
    'citation_clicked',
    'handoff_created',
    'handoff_assigned',
    'handoff_response_completed'
  ));
