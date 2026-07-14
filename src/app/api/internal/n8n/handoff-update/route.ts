import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { JsonBodyError, readJsonBody } from "@/lib/api/json-body";
import { parseLimit, rateLimit } from "@/lib/api/security";
import { verifyN8nVerificationReceipt } from "@/lib/n8n/signature";

export const runtime = "nodejs";

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function configured(value: string | undefined) {
  const result = value?.trim() || "";
  return !result || /^(replace-with-|change_me)/i.test(result) ? "" : result;
}

function serviceClient() {
  const url = configured(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = configured(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_NOT_CONFIGURED");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function handoffRow(payload: Record<string, unknown>) {
  const sessionId = text(payload.sessionId, 120);
  const tenantId = text(payload.tenant_id, 120) || "default";
  if (!sessionId || tenantId !== "default") throw new Error("HANDOFF_PAYLOAD_INVALID");
  return {
    session_id: sessionId,
    tenant_id: tenantId,
    locale: text(payload.locale, 8) || "ko",
    source: text(payload.source, 40) || "typebot",
    lead_name: text(payload.leadName, 160) || null,
    lead_name_ciphertext: text(payload.leadNameCiphertext, 8_000) || null,
    lead_name_redacted: payload.leadNameRedacted === true,
    lead_contact: text(payload.leadContact, 320) || null,
    lead_contact_ciphertext: text(payload.leadContactCiphertext, 8_000) || null,
    lead_contact_hash: text(payload.leadContactHash, 160) || null,
    lead_contact_redacted: payload.leadContactRedacted !== false,
    lead_contact_type: text(payload.leadContactType, 40) || null,
    lead_note: text(payload.leadNote, 2_000) || null,
    lead_note_ciphertext: text(payload.leadNoteCiphertext, 16_000) || null,
    lead_note_hash: text(payload.leadNoteHash, 160) || null,
    lead_note_redacted: payload.leadNoteRedacted === true,
    question: text(payload.question, 1_200) || null,
    question_ciphertext: text(payload.questionCiphertext, 16_000) || null,
    question_hash: text(payload.questionHash, 160) || null,
    question_redacted: payload.questionRedacted === true,
    answer: text(payload.answer, 8_000) || null,
    answer_ciphertext: text(payload.answerCiphertext, 48_000) || null,
    answer_hash: text(payload.answerHash, 160) || null,
    answer_redacted: payload.answerRedacted === true,
    risk_level: text(payload.riskLevel, 40) || "medium",
    lead_stage: text(payload.leadStage, 40) || "review",
    request_payload: {
      typebotResultId: text(payload.typebotResultId, 120),
      privacyConsent: text(payload.privacyConsent, 40),
      privacyNoticeVersion: text(payload.privacyNoticeVersion, 120),
    },
  };
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, {
    key: "n8n-handoff-update-core",
    limit: parseLimit(process.env.N8N_HANDOFF_CORE_RATE_LIMIT, 120),
    windowMs: 60 * 1000,
  });
  if (limited) return limited;

  try {
    const body = await readJsonBody<Record<string, unknown>>(req, 128 * 1024);
    const verificationToken = text(body.verificationToken, 4_500);
    const payload = record(body.payload);
    if (!verificationToken || !payload) {
      return NextResponse.json({ ok: false, error: "Invalid verified handoff request" }, { status: 400 });
    }
    const verified = verifyN8nVerificationReceipt(
      verificationToken,
      "typebot-handoff",
      payload,
    );
    if (!verified.ok) {
      return NextResponse.json({ ok: false, error: "Invalid or expired verification receipt" }, { status: 401 });
    }

    const insert = await serviceClient()
      .from("handoff_updates")
      .insert(handoffRow(payload))
      .select("id,lead_id,lead_contact_id,handoff_task_id,update_status,response_payload")
      .single();
    if (insert.error) throw insert.error;
    const row = insert.data;
    const responsePayload = record(row.response_payload) || {};
    return NextResponse.json({
      ok: true,
      status: text(responsePayload.status, 80) || text(row.update_status, 80) || "contact_received",
      updateId: row.id,
      leadId: row.lead_id,
      leadContactId: row.lead_contact_id,
      handoffTaskId: row.handoff_task_id,
    });
  } catch (error) {
    if (error instanceof JsonBodyError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    if (error instanceof Error && error.message === "HANDOFF_PAYLOAD_INVALID") {
      return NextResponse.json({ ok: false, error: error.message }, { status: 422 });
    }
    console.error("[POST /api/internal/n8n/handoff-update]", error);
    return NextResponse.json({ ok: false, error: "Handoff update unavailable" }, { status: 503 });
  }
}
