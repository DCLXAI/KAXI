import { NextRequest, NextResponse } from "next/server";
import { JsonBodyError, readJsonBody } from "@/lib/api/json-body";
import { parseLimit, rateLimit } from "@/lib/api/security";
import { ingestRagServingPayload } from "@/lib/knowledge/serving-projection";
import { verifyN8nVerificationReceipt } from "@/lib/n8n/signature";

export const runtime = "nodejs";
export const maxDuration = 60;

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, {
    key: "n8n-rag-ingestion-core",
    limit: parseLimit(process.env.N8N_RAG_INGESTION_RATE_LIMIT, 120),
    windowMs: 60 * 1000,
  });
  if (limited) return limited;

  try {
    const body = await readJsonBody<Record<string, unknown>>(req, 128 * 1024);
    const verificationToken = text(body.verificationToken, 4_500);
    const payload = record(body.payload);
    if (!verificationToken || !payload) {
      return NextResponse.json({ ok: false, error: "Invalid verified ingestion request" }, { status: 400 });
    }
    const verified = verifyN8nVerificationReceipt(
      verificationToken,
      "rag-ingestion",
      payload,
    );
    if (!verified.ok) {
      return NextResponse.json({ ok: false, error: "Invalid or expired verification receipt" }, { status: 401 });
    }

    return NextResponse.json(await ingestRagServingPayload(payload));
  } catch (error) {
    if (error instanceof JsonBodyError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    if (
      error instanceof Error
      && (error.message === "RAG_INGESTION_PAYLOAD_INVALID"
        || error.message === "RAG_INGESTION_SOURCE_NOT_ELIGIBLE")
    ) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 422 });
    }
    console.error("[POST /api/internal/n8n/rag-ingestion]", error);
    return NextResponse.json({ ok: false, error: "RAG ingestion unavailable" }, { status: 503 });
  }
}
