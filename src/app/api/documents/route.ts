import { NextRequest, NextResponse } from "next/server";
import { canWriteRuntimeDatabase } from "@/lib/db";
import { listStudentDocuments } from "@/lib/documents/repository";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    if (!canWriteRuntimeDatabase()) {
      return NextResponse.json({ error: "Document workspace requires a writable database" }, { status: 503 });
    }

    const studentRef = req.nextUrl.searchParams.get("studentRef") || "";
    if (!studentRef) return NextResponse.json({ error: "studentRef is required" }, { status: 400 });

    const documents = await listStudentDocuments(studentRef);
    return NextResponse.json({ documents });
  } catch (err) {
    console.error("[GET /api/documents]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}
