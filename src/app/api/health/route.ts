import { NextResponse } from "next/server";
import { getHealthPayload } from "@/lib/api/health";

export async function GET() {
  return NextResponse.json(getHealthPayload());
}
