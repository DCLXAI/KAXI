import { NextRequest, NextResponse } from "next/server";
import { AuthBridgeError, requireKaxiUser } from "@/lib/supabase/auth";
import {
  CasePipelineError,
  acceptAssignedCase,
  addCaseComment,
  closeCase,
  requestCaseSupplement,
} from "@/lib/cases/repository";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ id: string }>;
};

const ACTIONS = new Set(["accept_case", "add_comment", "request_supplement", "close_case"]);

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireKaxiUser(["PARTNER_AGENT"]);
    if (!user.organizationId) return NextResponse.json({ error: "Partner organization is required" }, { status: 403 });
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      note?: string;
      documentItemIds?: string[];
    };
    if (!body.action || !ACTIONS.has(body.action)) {
      return NextResponse.json({ error: "Invalid partner case action" }, { status: 400 });
    }

    const actor = {
      actorUserId: user.id,
      actorRole: "partner",
      organizationId: user.organizationId,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null,
      userAgent: req.headers.get("user-agent"),
    };
    const note = String(body.note || "").slice(0, 2000);
    const result =
      body.action === "accept_case"
        ? await acceptAssignedCase({
            caseId: id,
            organizationId: user.organizationId,
            reviewerUserId: user.id,
            note,
            actor,
          })
        : body.action === "add_comment"
          ? await addCaseComment({
              caseId: id,
              organizationId: user.organizationId,
              message: note,
              actor,
            })
          : body.action === "request_supplement"
            ? await requestCaseSupplement({
                caseId: id,
                organizationId: user.organizationId,
                documentItemIds: Array.isArray(body.documentItemIds) ? body.documentItemIds : [],
                note,
                actor,
              })
            : await closeCase({
                caseId: id,
                organizationId: user.organizationId,
                reason: note,
                actor,
              });

    return NextResponse.json({ ok: true, case: result.case });
  } catch (err) {
    if (err instanceof AuthBridgeError || err instanceof CasePipelineError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("[POST /api/partner/cases/:id/actions]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
