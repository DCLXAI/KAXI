import { NextRequest, NextResponse } from "next/server";
import { runtimeEnvironment } from "@/infrastructure/config/runtime-environment";
import { runUnifiedAiHttpAdapter } from "@/adapters/http/ai/unified-ai";
import {
  createUnifiedAiEventStream,
  unifiedAiStreamTimeoutMs,
  type UnifiedAiStreamRunnerResult,
} from "@/lib/ai/unified-stream";
import {
  decideUnifiedAiRoute,
  type UnifiedAiCapability,
  type UnifiedExpertMode,
} from "@/lib/ai/unified-router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function previousCapability(value: unknown): UnifiedAiCapability | null {
  return value === "action" || value === "expert" ? value : null;
}

function previousExpertMode(value: unknown): UnifiedExpertMode | null {
  return value === "general" || value === "visa" || value === "documents" || value === "appeal" || value === "business"
    ? value
    : null;
}

export async function POST(req: NextRequest) {
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > 100_000) {
    return NextResponse.json({ error: "Request body is too large" }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = record(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const question = text(body.question);
  if (!question) return NextResponse.json({ error: "Question is required" }, { status: 400 });

  const decision = decideUnifiedAiRoute(question, {
    previousCapability: previousCapability(body.previousCapability),
    previousExpertMode: previousExpertMode(body.previousExpertMode),
  });
  const requestedMode = req.headers.get("x-kaxi-stream-mode")?.trim().toLowerCase();
  const mode = requestedMode === "verified-delta" ? "verified-delta" as const : "progress-only" as const;
  const stream = createUnifiedAiEventStream({
    capability: decision.capability,
    mode,
    signal: req.signal,
    timeoutMs: unifiedAiStreamTimeoutMs(runtimeEnvironment()),
    run: async (reportProgress, reportVerifiedDelta): Promise<UnifiedAiStreamRunnerResult> => {
      const response = await runUnifiedAiHttpAdapter(req, body, { reportProgress, reportVerifiedDelta });
      return {
        ok: response.ok,
        status: response.status,
        data: record(await response.json()),
      };
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Cache-Control": "private, no-cache, no-store, no-transform",
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "X-Accel-Buffering": "no",
      "X-Content-Type-Options": "nosniff",
      "X-KAXI-Stream-Version": "2",
      "X-KAXI-Stream-Mode": mode,
    },
  });
}
