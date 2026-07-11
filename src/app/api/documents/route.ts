import { NextResponse } from "next/server";
import { AuthBridgeError } from "@/lib/supabase/auth";
import { requireDocumentWorkspaceUser } from "@/lib/documents/access";
import { getStudentProfileForUser, listDocumentsForProfile } from "@/lib/documents/repository";
import { getDocumentWorkspaceIssue } from "@/lib/documents/workspace-availability";

export const runtime = "nodejs";

export async function GET() {
  try {
    const workspaceIssue = getDocumentWorkspaceIssue("list");
    if (workspaceIssue) return NextResponse.json(workspaceIssue, { status: 503 });

    const user = await requireDocumentWorkspaceUser();
    const profile = await getStudentProfileForUser(user.id);
    const documents = await listDocumentsForProfile(profile.id);
    return NextResponse.json({ documents });
  } catch (err) {
    if (err instanceof AuthBridgeError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("[GET /api/documents]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
