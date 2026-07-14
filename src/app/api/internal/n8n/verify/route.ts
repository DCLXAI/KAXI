import { NextRequest, NextResponse } from "next/server";
import { parseLimit, rateLimit } from "@/lib/api/security";
import { JsonBodyError, readJsonBody } from "@/lib/api/json-body";
import {
  createN8nVerificationReceipt,
  verifyAndConsumeN8nSignature,
  type N8nSignatureEnvelope,
  type N8nWebhookPurpose,
} from "@/lib/n8n/signature";

export const runtime = "nodejs";

const PURPOSES = new Set<N8nWebhookPurpose>(["typebot-runtime", "rag-ingestion", "typebot-handoff"]);

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, {
    key: "n8n-signature-verify",
    limit: parseLimit(process.env.N8N_VERIFY_RATE_LIMIT, 240),
    windowMs: 60 * 1000,
  });
  if (limited) return limited;

  try {
    const body = await readJsonBody<Record<string, unknown>>(req, 2 * 1024 * 1024);
    const purpose = text(body?.purpose, 64) as N8nWebhookPurpose;
    if (!PURPOSES.has(purpose)) return NextResponse.json({ ok: false }, { status: 401 });

    const envelope: N8nSignatureEnvelope = {
      purpose,
      timestamp: text(body?.timestamp, 32),
      nonce: text(body?.nonce, 128),
      signature: text(body?.signature, 80),
      payload: body?.payload,
    };
    const result = await verifyAndConsumeN8nSignature(envelope);
    if (!result.ok) return NextResponse.json({ ok: false }, { status: 401 });

    const verificationToken = createN8nVerificationReceipt(purpose, envelope.payload, envelope.nonce);
    return NextResponse.json({ ok: true, purpose, verificationToken });
  } catch (error) {
    if (error instanceof JsonBodyError) {
      return NextResponse.json({ ok: false }, { status: error.status });
    }
    console.error("[POST /api/internal/n8n/verify]", error);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
