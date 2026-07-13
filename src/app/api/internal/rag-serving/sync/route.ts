import { NextRequest, NextResponse } from "next/server";
import { JsonBodyError, readJsonBody } from "@/lib/api/json-body";
import { syncRagServingProjection } from "@/lib/knowledge/serving-projection";
import {
  N8N_NONCE_HEADER,
  N8N_PURPOSE_HEADER,
  N8N_SIGNATURE_HEADER,
  N8N_TIMESTAMP_HEADER,
  verifyAndConsumeN8nSignature,
} from "@/lib/n8n/signature";

export const runtime = "nodejs";
export const maxDuration = 300;

function boundedLimit(value: unknown) {
  const parsed = Number.parseInt(String(value || "3"), 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 10) : 3;
}

export async function POST(req: NextRequest) {
  try {
    const payload = await readJsonBody<Record<string, unknown>>(req, 16 * 1024);
    if (payload.action !== "sync-rag-serving") {
      return NextResponse.json({ error: "Invalid operation" }, { status: 400 });
    }

    const purpose = req.headers.get(N8N_PURPOSE_HEADER) || "";
    if (purpose !== "rag-ingestion") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const verification = await verifyAndConsumeN8nSignature({
      purpose,
      timestamp: req.headers.get(N8N_TIMESTAMP_HEADER) || "",
      nonce: req.headers.get(N8N_NONCE_HEADER) || "",
      signature: req.headers.get(N8N_SIGNATURE_HEADER) || "",
      payload,
    });
    if (!verification.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await syncRagServingProjection({
      limit: boundedLimit(payload.limit),
      force: payload.force === true,
    });
    return NextResponse.json(result, { status: result.failed.length > 0 ? 207 : 200 });
  } catch (error) {
    if (error instanceof JsonBodyError) {
      return NextResponse.json({ error: "Invalid request" }, { status: error.status });
    }
    console.error("[POST /api/internal/rag-serving/sync]", error);
    return NextResponse.json({ error: "RAG serving sync failed" }, { status: 503 });
  }
}
