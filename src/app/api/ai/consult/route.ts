import { type NextRequest } from "next/server";
import { runExpertConsultHttpAdapter } from "@/adapters/http/ai/expert-consult";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  return runExpertConsultHttpAdapter(req);
}
