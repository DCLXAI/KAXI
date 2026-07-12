import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAdminContext, requireAdmin } from "@/lib/api/security";
import { parseJsonBody } from "@/lib/api/validation";
import { canTransitionPartnerRequestStatus } from "@/lib/partners/status-transitions";
import { serializePartnerRequestForResponse } from "@/lib/privacy/serializers";
import { getCurrentKaxiUser } from "@/lib/supabase/auth";

export const runtime = "nodejs";

const patchSchema = z.object({
  status: z.enum(["contacted", "closed"]),
});

class PartnerRequestTransitionError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "PartnerRequestTransitionError";
    this.code = code;
    this.status = status;
  }
}

// PATCH /api/partner-requests/[id] - admin-driven status transition
// (pending -> contacted|closed, contacted/matched/accepted -> closed).
// Distinct from the partner-account transitions in assignPartnerRequest /
// updatePartnerRequestStatus (src/lib/partners/assignment.ts), which remain
// unchanged and cover pending->matched and matched->accepted/closed.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const unauthorized = await requireAdmin(req, { roles: ["owner", "admin"] });
    if (unauthorized) return unauthorized;

    const parsed = await parseJsonBody(req, patchSchema);
    if (!parsed.ok) return parsed.response;
    const { status: nextStatus } = parsed.data;

    const { id } = await params;
    const context = await getAdminContext(req);

    // Best-effort: resolve the real admin User row for actorUserId (foreign
    // key). Supabase-session admins resolve to a real id; API-key auth has
    // no underlying user row, so this stays null and metadata.actor (below)
    // carries the identifying string instead.
    let actorUserId: string | null = null;
    try {
      actorUserId = (await getCurrentKaxiUser())?.id ?? null;
    } catch (err) {
      console.warn(
        "[PATCH /api/partner-requests/[id]] actor lookup failed",
        err instanceof Error ? err.message : err
      );
    }

    const updated = await db.$transaction(async (tx) => {
      const existing = await tx.partnerRequest.findUnique({ where: { id } });
      if (!existing || existing.deletedAt) {
        throw new PartnerRequestTransitionError("request_not_found", "Partner request not found", 404);
      }
      if (!canTransitionPartnerRequestStatus(existing.status, nextStatus)) {
        throw new PartnerRequestTransitionError(
          "invalid_transition",
          `Cannot transition partner request from "${existing.status}" to "${nextStatus}"`,
          400
        );
      }

      const now = new Date();
      const result = await tx.partnerRequest.update({
        where: { id },
        data: {
          status: nextStatus,
          ...(nextStatus === "closed" ? { closedAt: now } : {}),
        },
        include: { lead: true, organization: true, assignedUser: true },
      });

      await tx.auditEvent.create({
        data: {
          actorUserId,
          actorRole: "admin",
          action: `partner.request.admin.${nextStatus}`,
          targetType: "PartnerRequest",
          targetId: id,
          success: true,
          metadata: {
            actor: context?.actor || "admin",
            previousStatus: existing.status,
            nextStatus,
          },
        },
      });

      return result;
    });

    return NextResponse.json({ request: serializePartnerRequestForResponse(updated, { revealPii: true }) });
  } catch (error) {
    if (error instanceof PartnerRequestTransitionError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[PATCH /api/partner-requests/[id]]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
