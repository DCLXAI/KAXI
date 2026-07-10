import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getClientIp, parseLimit, rateLimit } from "@/lib/api/security";
import { JsonBodyError, readJsonBody } from "@/lib/api/json-body";
import { signN8nPayload, verifyTypebotHandoffToken } from "@/lib/n8n/signature";
import { canPersistPiiValue, preparePiiField } from "@/lib/privacy/pii";
import {
  HANDOFF_NOTICE_VERSION,
  hasAcceptedHandoffConsent,
  recordHandoffConsentEvidence,
} from "@/lib/privacy/handoff-consent";
import { verifyTypebotGatewayHeaders } from "@/lib/typebot/gateway-auth";

export const runtime = "nodejs";
export const maxDuration = 30;

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function configured(value: string | undefined) {
  const result = value?.trim() || "";
  return !result || /^(replace-with-|change_me)/i.test(result) ? "" : result;
}

function redactName(value: string) {
  const name = value.trim();
  if (!name) return "";
  if (name.length <= 2) return "*".repeat(name.length);
  return `${name.slice(0, 1)}***${name.slice(-1)}`;
}

async function typebotSessionExists(sessionId: string) {
  const url = configured(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = configured(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !serviceRoleKey) throw new Error("SUPABASE_CHAT_PERSISTENCE_NOT_CONFIGURED");
  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const result = await supabase
    .from("chat_sessions")
    .select("session_key")
    .eq("session_key", sessionId)
    .eq("source", "typebot")
    .maybeSingle();
  if (result.error) throw result.error;
  return Boolean(result.data);
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, {
    key: "typebot-handoff",
    limit: parseLimit(process.env.TYPEBOT_HANDOFF_RATE_LIMIT, 10),
    windowMs: 60 * 1000,
  });
  if (limited) return limited;

  try {
    if (!verifyTypebotGatewayHeaders(req.headers)) {
      return NextResponse.json({ error: "Unauthorized Typebot gateway" }, { status: 401 });
    }
    const body = await readJsonBody<Record<string, unknown>>(req, 32 * 1024);
    const typebotResultId = text(body?.typebotResultId, 120);
    const sessionId = text(body?.sessionId, 120);
    const handoffToken = text(body?.handoffToken, 160);
    const leadContact = text(body?.leadContact, 320);
    if (
      !typebotResultId ||
      sessionId !== `typebot-${typebotResultId}` ||
      !leadContact ||
      !verifyTypebotHandoffToken(sessionId, handoffToken)
    ) {
      return NextResponse.json({ error: "Invalid handoff request" }, { status: 401 });
    }
    if (!(await typebotSessionExists(sessionId))) {
      return NextResponse.json({ error: "Typebot session not found" }, { status: 404 });
    }
    const locale = text(body?.locale, 8) || "ko";
    if (!hasAcceptedHandoffConsent({
      consent: body?.privacyConsent,
      noticeVersion: body?.privacyNoticeVersion,
    })) {
      return NextResponse.json({
        error: "Explicit consent is required before collecting contact information",
        code: "CONSENT_REQUIRED",
        noticeVersion: HANDOFF_NOTICE_VERSION,
      }, { status: 428 });
    }
    await recordHandoffConsentEvidence({
      sessionId,
      typebotResultId,
      locale,
      requestIp: getClientIp(req),
      requestUserAgent: req.headers.get("user-agent"),
    });
    const leadName = text(body?.leadName, 160);
    const leadNote = text(body?.leadNote, 2_000);
    const question = text(body?.question, 1_200);
    const answer = text(body?.answer, 8_000);
    if (![leadContact, leadName, leadNote, question, answer].every(canPersistPiiValue)) {
      return NextResponse.json({ error: "PII encryption is not configured" }, { status: 503 });
    }
    const protectedContact = preparePiiField(leadContact, { kind: "contact", maxPlainLength: 160 });
    const protectedName = preparePiiField(leadName, { kind: "text", maxPlainLength: 80 });
    const protectedNote = preparePiiField(leadNote, { kind: "text", maxPlainLength: 2_000 });
    const protectedQuestion = preparePiiField(question, { kind: "text", maxPlainLength: 1_200 });
    const protectedAnswer = preparePiiField(answer, { kind: "text", maxPlainLength: 8_000 });

    const payload = {
      sessionId,
      typebotResultId,
      tenant_id: "default",
      locale,
      source: "typebot",
      privacyConsent: "accepted",
      privacyNoticeVersion: HANDOFF_NOTICE_VERSION,
      leadName: redactName(leadName),
      leadNameCiphertext: protectedName.ciphertext,
      leadNameRedacted: true,
      leadContact: protectedContact.plaintext,
      leadContactCiphertext: protectedContact.ciphertext,
      leadContactHash: protectedContact.hash,
      leadContactRedacted: true,
      leadContactType: text(body?.leadContactType, 40),
      leadNote: protectedNote.plaintext,
      leadNoteCiphertext: protectedNote.ciphertext,
      leadNoteHash: protectedNote.hash,
      leadNoteRedacted: protectedNote.redacted,
      question: protectedQuestion.plaintext,
      questionCiphertext: protectedQuestion.ciphertext,
      questionHash: protectedQuestion.hash,
      questionRedacted: protectedQuestion.redacted,
      answer: protectedAnswer.plaintext,
      answerCiphertext: protectedAnswer.ciphertext,
      answerHash: protectedAnswer.hash,
      answerRedacted: protectedAnswer.redacted,
      riskLevel: text(body?.riskLevel, 40) || "medium",
      leadStage: text(body?.leadStage, 40) || "review",
    };
    const signed = signN8nPayload("typebot-handoff", payload);
    const response = await fetch(signed.url, {
      method: "POST",
      headers: signed.headers,
      body: signed.body,
      signal: AbortSignal.timeout(25_000),
    });
    const responseBody = await response.json().catch(() => ({}));
    if (!response.ok) return NextResponse.json({ error: "handoff update failed" }, { status: 502 });
    return NextResponse.json(responseBody);
  } catch (error) {
    if (error instanceof JsonBodyError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (
      error instanceof Error &&
      (error.message === "N8N_WEBHOOK_NOT_CONFIGURED" ||
        error.message === "SUPABASE_CHAT_PERSISTENCE_NOT_CONFIGURED")
    ) {
      return NextResponse.json({ error: "handoff service is not configured" }, { status: 503 });
    }
    console.error("[POST /api/typebot-handoff]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
