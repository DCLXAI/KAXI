import { createClient } from "@supabase/supabase-js";
import { hashPii } from "@/lib/privacy/pii";

export const HANDOFF_CONSENT_SCOPE = "HANDOFF_CONTACT_COLLECTION";
export const HANDOFF_NOTICE_VERSION = "handoff-contact-2026-07-10.v1";
export const HANDOFF_CONSENT_VALUE = "accepted";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  if (!url || !key) throw new Error("SUPABASE_HANDOFF_CONSENT_NOT_CONFIGURED");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function hasAcceptedHandoffConsent(input: {
  consent?: unknown;
  noticeVersion?: unknown;
}) {
  return input.consent === HANDOFF_CONSENT_VALUE && input.noticeVersion === HANDOFF_NOTICE_VERSION;
}

export async function recordHandoffConsentEvidence(input: {
  sessionId: string;
  typebotResultId: string;
  locale: string;
  requestIp?: string | null;
  requestUserAgent?: string | null;
}) {
  const now = new Date().toISOString();
  const result = await serviceClient()
    .from("handoff_consent_evidence")
    .upsert({
      session_id: input.sessionId,
      typebot_result_id: input.typebotResultId,
      scope: HANDOFF_CONSENT_SCOPE,
      notice_version: HANDOFF_NOTICE_VERSION,
      accepted: true,
      accepted_at: now,
      source: "typebot",
      locale: input.locale,
      request_ip_hash: hashPii(input.requestIp),
      request_ua_hash: hashPii(input.requestUserAgent),
      evidence: {
        explicit: true,
        action: "typebot_choice",
        consentValue: HANDOFF_CONSENT_VALUE,
        noticePath: `/${input.locale}/privacy`,
      },
      retention_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: now,
    }, { onConflict: "session_id,scope,notice_version" })
    .select("id,accepted_at,notice_version")
    .single();
  if (result.error) throw result.error;
  return result.data;
}
