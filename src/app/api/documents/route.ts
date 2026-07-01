import { NextRequest, NextResponse } from "next/server";
import { listStudentDocuments } from "@/lib/documents/repository";
import { getDocumentWorkspaceIssue } from "@/lib/documents/workspace-availability";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const workspaceIssue = getDocumentWorkspaceIssue("list");
    if (workspaceIssue) return NextResponse.json(workspaceIssue, { status: 503 });

    const studentRef = req.nextUrl.searchParams.get("studentRef") || "";
    if (!studentRef) return NextResponse.json({ error: "studentRef is required" }, { status: 400 });

    const documents = await listStudentDocuments(studentRef);
    return NextResponse.json({ documents });
  } catch (err) {
    console.error("[GET /api/documents]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}
