import { NextRequest, NextResponse } from "next/server";
import { canWriteRuntimeDatabase } from "@/lib/db";
import { recordRequestAudit } from "@/lib/audit";
import { enforcePrivacyRetention } from "@/lib/privacy/retention";
import { getAdminContext, requireAdmin } from "@/lib/api/security";
import { authorizeCronRequest } from "@/lib/security/cron-auth";

export async function GET(req: NextRequest) {
  if (!canWriteRuntimeDatabase()) {
    return NextResponse.json({
      dryRun: false,
      skipped: true,
      reason: "Writable production database is not configured",
    }, { status: 202 });
  }
  const unauthorized = authorizeCronRequest(req);
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
