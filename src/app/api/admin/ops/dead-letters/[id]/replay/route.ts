import { createHash } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getAdminContext, requireAdmin } from "@/lib/api/security";
import { JsonBodyError, readJsonBody } from "@/lib/api/json-body";
import { recordRequestAudit } from "@/lib/audit";
import {
  DEAD_LETTER_KINDS,
  DeadLetterReplayError,
  replayDeadLetter,
  type DeadLetterKind,
} from "@/application/ops/dead-letter";
import { platformServiceTenantContext } from "@/application/tenancy/tenant-context";
import { prismaDeadLetterRepository } from "@/infrastructure/worker/dead-letter-repository";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  const unauthorized = await requireAdmin(req, { roles: ["owner"] });
  if (unauthorized) return unauthorized;
  const context = await getAdminContext(req);
  const actor = context?.actor || "platform-admin";
  const { id } = await params;
  let kind = "";

  try {
    const body = await readJsonBody<Record<string, unknown>>(req, 4 * 1024);
    kind = typeof body.kind === "string" ? body.kind.trim() : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    const confirmation = typeof body.confirmation === "string" ? body.confirmation : "";
    if (!DEAD_LETTER_KINDS.includes(kind as DeadLetterKind)) {
      throw new DeadLetterReplayError("DEAD_LETTER_INPUT_INVALID", 400);
    }
    const result = await replayDeadLetter({
      operatorContext: platformServiceTenantContext(`admin-ops:${actor}`),
      actor,
      kind: kind as DeadLetterKind,
      id,
      reason,
      confirmation,
    }, prismaDeadLetterRepository);
    await recordRequestAudit(req, {
      actor,
      actorRole: context?.role || "owner",
      action: "admin.ops.dead_letter.replay",
      targetType: `${result.before.kind}:dead-letter`,
      targetId: result.before.id,
      success: true,
      metadata: {
        tenantId: result.before.tenantId,
        queue: result.before.queue,
        previousAttempts: result.before.attempts,
        failureCode: result.before.failureCode,
        reasonDigest: createHash("sha256").update(result.reason).digest("hex"),
        replayedAt: result.replayedAt.toISOString(),
      },
    });
    return NextResponse.json({
      accepted: true,
      replay: {
        kind: result.before.kind,
        id: result.before.id,
        tenantId: result.before.tenantId,
        queue: result.before.queue,
        status: result.status,
        replayedAt: result.replayedAt.toISOString(),
      },
    }, { status: 202 });
  } catch (error) {
    await recordRequestAudit(req, {
      actor,
      actorRole: context?.role || "owner",
      action: "admin.ops.dead_letter.replay",
      targetType: `${kind || "unknown"}:dead-letter`,
      targetId: id,
      success: false,
      metadata: { code: error instanceof Error ? error.message.slice(0, 120) : "UNKNOWN_ERROR" },
    });
    if (error instanceof JsonBodyError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof DeadLetterReplayError) {
      return NextResponse.json({ error: error.code, code: error.code }, { status: error.status });
    }
    console.error("[POST /api/admin/ops/dead-letters/:id/replay]", error);
    return NextResponse.json({ error: "Dead-letter replay failed" }, { status: 500 });
  }
}
