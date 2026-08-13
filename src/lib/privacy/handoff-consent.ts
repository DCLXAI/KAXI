import { createSupabaseServiceRoleClient } from "@/infrastructure/supabase/service-role-client";
import { assertTenantContext, type TenantContext } from "@/application/tenancy/tenant-context";
import { hashPii } from "@/lib/privacy/pii";

export const HANDOFF_CONSENT_SCOPE = "HANDOFF_CONTACT_COLLECTION";
export const HANDOFF_NOTICE_VERSION = "handoff-contact-2026-07-10.v1";
export const HANDOFF_CONSENT_VALUE = "accepted";

function serviceClient() {
  try {
    return createSupabaseServiceRoleClient();
  } catch {
    throw new Error("SUPABASE_HANDOFF_CONSENT_NOT_CONFIGURED");
  }
}

export function hasAcceptedHandoffConsent(input: {
  consent?: unknown;
  noticeVersion?: unknown;
}) {
  return input.consent === HANDOFF_CONSENT_VALUE && input.noticeVersion === HANDOFF_NOTICE_VERSION;
}

export async function recordHandoffConsentEvidence(input: {
  tenantContext: TenantContext;
  sessionId: string;
  typebotResultId: string;
  locale: string;
  requestIp?: string | null;
  requestUserAgent?: string | null;
}) {
  assertTenantContext(input.tenantContext);
  const tenantContext = input.tenantContext;
  const now = new Date().toISOString();
  const result = await serviceClient()
    .from("handoff_consent_evidence")
    .upsert({
      tenant_id: tenantContext.tenantId,
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
    }, { onConflict: "tenant_id,session_id,scope,notice_version" })
    .select("id,accepted_at,notice_version")
    .single();
  if (result.error) throw result.error;
  return result.data;
}
