import { NextRequest, NextResponse } from "next/server";
import { canWriteRuntimeDatabase } from "@/lib/db";
import { recordRequestAudit } from "@/lib/audit";
import { enforcePrivacyRetention } from "@/lib/privacy/retention";
import { getAdminContext, jsonError, requireAdmin } from "@/lib/api/security";

function authorizeCron(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV === "production"
      ? jsonError("CRON_SECRET is not configured", 503)
      : null;
  }

  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}` ? null : jsonError("Unauthorized", 401);
}

export async function GET(req: NextRequest) {
  if (!canWriteRuntimeDatabase()) {
    return NextResponse.json({
      dryRun: false,
      skipped: true,
      reason: "Writable production database is not configured",
    }, { status: 202 });
  }
  const unauthorized = authorizeCron(req);
  if (unauthorized) return unauthorized;

  const result = await enforcePrivacyRetention();
  await recordRequestAudit(req, {
    actor: "vercel-cron",
    actorRole: "system",
    action: "privacy.retention.enforce",
    targetType: "Privacy",
    metadata: { result },
  });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req, { roles: ["owner", "admin"] });
  if (unauthorized) return unauthorized;

  const body = await req.json().catch(() => ({}));
  const dryRun = body.dryRun !== false;
  if (!dryRun && !canWriteRuntimeDatabase()) {
    return NextResponse.json({
      dryRun,
      skipped: true,
      reason: "Writable production database is not configured",
    }, { status: 202 });
  }
  const result = await enforcePrivacyRetention({ dryRun });
  const actor = await getAdminContext(req);
  await recordRequestAudit(req, {
    actor: actor?.actor || "unknown",
    actorRole: actor?.role || "admin",
    action: dryRun ? "privacy.retention.preview" : "privacy.retention.enforce",
    targetType: "Privacy",
    metadata: { result },
  });
  return NextResponse.json(result);
}
