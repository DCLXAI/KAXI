import { type NextRequest, NextResponse } from "next/server";
import { getActionAgentStatus } from "@/application/ai/action-agent-status";
import { runUnifiedAiHttpAdapter } from "@/adapters/http/ai/unified-ai";
import { getApplicationAiRuntimeConfig } from "@/infrastructure/config/application-ai-config";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const data = getActionAgentStatus(maxDuration, getApplicationAiRuntimeConfig());
  return NextResponse.json({
    ...data,
    experience: "unified",
    capabilities: {
      action: { ready: data.ok },
      expert: { ready: data.backendPolicy.consult.ready !== false },
    },
  });
}

export async function POST(req: NextRequest) {
  return runUnifiedAiHttpAdapter(req);
}
