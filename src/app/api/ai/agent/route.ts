import { NextRequest, NextResponse } from "next/server";
import { runActionAgentHttpAdapter } from "@/adapters/http/ai/action-agent";
import { getActionAgentStatus } from "@/application/ai/action-agent-status";
import { getApplicationAiRuntimeConfig } from "@/infrastructure/config/application-ai-config";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  return NextResponse.json(getActionAgentStatus(maxDuration, getApplicationAiRuntimeConfig()));
}

export async function POST(req: NextRequest) {
  return runActionAgentHttpAdapter(req);
}
