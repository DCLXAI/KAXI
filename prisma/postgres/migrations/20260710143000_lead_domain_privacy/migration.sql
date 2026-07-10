DO $$
BEGIN
  IF to_regclass('public."Lead"') IS NOT NULL AND to_regclass('public.diagnosis_leads') IS NULL THEN
    ALTER TABLE public."Lead" RENAME TO diagnosis_leads;
  END IF;
END
$$;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS name_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS name_redacted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.lead_contacts
  ALTER COLUMN contact_value DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS contact_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS contact_redacted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS name_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS name_redacted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.handoff_updates
  ADD COLUMN IF NOT EXISTS lead_contact_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS lead_contact_hash TEXT,
  ADD COLUMN IF NOT EXISTS lead_contact_redacted BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS lead_name_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS lead_name_redacted BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.kaxi_redact_handoff_contact(value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN nullif(trim(coalesce(value, '')), '') IS NULL THEN NULL
    WHEN position('@' in value) > 1 THEN
      left(split_part(value, '@', 1), 2) || '***@' || split_part(value, '@', 2)
    WHEN length(regexp_replace(value, '[^0-9]', '', 'g')) >= 7 THEN
      '***' || right(regexp_replace(value, '[^0-9]', '', 'g'), 4)
    ELSE '***'
  END;
$$;

CREATE OR REPLACE FUNCTION public.kaxi_protect_handoff_update_pii()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF nullif(trim(coalesce(NEW.lead_contact, '')), '') IS NOT NULL THEN
    NEW.lead_contact_hash := coalesce(
      nullif(NEW.lead_contact_hash, ''),
      encode(digest(lower(trim(NEW.lead_contact)), 'sha256'), 'hex')
    );
    NEW.lead_contact := public.kaxi_redact_handoff_contact(NEW.lead_contact);
    NEW.lead_contact_redacted := true;
  END IF;

  IF nullif(trim(coalesce(NEW.lead_name, '')), '') IS NOT NULL AND NEW.lead_name_redacted IS DISTINCT FROM true THEN
    NEW.lead_name := CASE
      WHEN length(trim(NEW.lead_name)) <= 2 THEN repeat('*', length(trim(NEW.lead_name)))
      ELSE left(trim(NEW.lead_name), 1) || '***' || right(trim(NEW.lead_name), 1)
    END;
    NEW.lead_name_redacted := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS a_handoff_updates_protect_pii ON public.handoff_updates;
CREATE TRIGGER a_handoff_updates_protect_pii
BEFORE INSERT OR UPDATE ON public.handoff_updates
FOR EACH ROW EXECUTE FUNCTION public.kaxi_protect_handoff_update_pii();

CREATE OR REPLACE FUNCTION public.kaxi_propagate_handoff_ciphertext()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL THEN
    UPDATE public.leads
    SET
      name_ciphertext = coalesce(NEW.lead_name_ciphertext, name_ciphertext),
      name_redacted = true,
      updated_at = now()
    WHERE id = NEW.lead_id;
  END IF;
  IF NEW.lead_contact_id IS NOT NULL THEN
    UPDATE public.lead_contacts
    SET
      contact_value = NEW.lead_contact,
      contact_hash = coalesce(nullif(NEW.lead_contact_hash, ''), contact_hash),
      contact_ciphertext = coalesce(NEW.lead_contact_ciphertext, contact_ciphertext),
      contact_redacted = true,
      name_ciphertext = coalesce(NEW.lead_name_ciphertext, name_ciphertext),
      name_redacted = true,
      updated_at = now()
    WHERE id = NEW.lead_contact_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handoff_updates_propagate_ciphertext ON public.handoff_updates;
CREATE TRIGGER handoff_updates_propagate_ciphertext
AFTER INSERT OR UPDATE ON public.handoff_updates
FOR EACH ROW EXECUTE FUNCTION public.kaxi_propagate_handoff_ciphertext();

UPDATE public.lead_contacts
SET
  contact_value = public.kaxi_redact_handoff_contact(contact_value),
  contact_redacted = true,
  updated_at = now()
WHERE contact_value IS NOT NULL;

UPDATE public.leads
SET
  name = CASE
    WHEN name IS NULL THEN NULL
    WHEN length(trim(name)) <= 2 THEN repeat('*', length(trim(name)))
    ELSE left(trim(name), 1) || '***' || right(trim(name), 1)
  END,
  name_redacted = true,
  updated_at = now()
WHERE name IS NOT NULL AND name_redacted IS DISTINCT FROM true;

ALTER TABLE public.leads ALTER COLUMN name_redacted SET DEFAULT true;
ALTER TABLE public.lead_contacts ALTER COLUMN contact_redacted SET DEFAULT true;
ALTER TABLE public.lead_contacts ALTER COLUMN name_redacted SET DEFAULT true;

UPDATE public.lead_contacts
SET
  name = CASE
    WHEN name IS NULL THEN NULL
    WHEN length(trim(name)) <= 2 THEN repeat('*', length(trim(name)))
    ELSE left(trim(name), 1) || '***' || right(trim(name), 1)
  END,
  name_redacted = true,
  updated_at = now()
WHERE name IS NOT NULL AND name_redacted IS DISTINCT FROM true;

COMMENT ON TABLE public.diagnosis_leads IS
  'Structured study-path diagnosis leads. Human handoff leads remain in public.leads.';
COMMENT ON COLUMN public.lead_contacts.contact_value IS
  'Redacted display value only. Recoverable contact data is AES-GCM ciphertext in contact_ciphertext.';

NOTIFY pgrst, 'reload schema';
