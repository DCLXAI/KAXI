import { NextResponse } from "next/server";
import { SCHOOLS } from "@/lib/data/schools";

// GET /api/schools - 학교 목록
export async function GET() {
  return NextResponse.json({ schools: SCHOOLS, total: SCHOOLS.length });
}
