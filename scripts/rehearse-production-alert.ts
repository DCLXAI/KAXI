import { alertRehearsalErrors } from "../src/application/ops/alert-rehearsal";
import { getOpsAlertDiagnostics, sendOpsAlert } from "../src/lib/ops/alerts";
import { recordAuditLog } from "../src/lib/audit";
import { db, getRuntimeDatabaseInfo } from "../src/lib/db";

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

if (!process.argv.includes("--execute")) fail("alert rehearsal sends real notifications; repeat with --execute after operator approval");
const ticket = argument("ticket")?.trim() || "";
const actor = argument("actor")?.trim() || "";
if (ticket.length < 4 || actor.length < 3) fail("--ticket and --actor are required");
if (!getRuntimeDatabaseInfo().sharedWritable) fail("alert rehearsal requires the shared production PostgreSQL target");

try {
  const diagnostics = getOpsAlertDiagnostics();
  const result = await sendOpsAlert({
    kind: "kaxi_ops_alert",
    source: "production-rollout-rehearsal",
    severity: "warning",
    eventType: "alert_delivery_rehearsal",
    message: `KARXY production alert delivery rehearsal (${ticket}). No incident action is required.`,
    occurredAt: new Date().toISOString(),
    details: { ticket, rehearsal: true },
  });
  const errors = alertRehearsalErrors(diagnostics, result);
  await recordAuditLog({
    actor,
    actorRole: "owner",
    action: "ops.alert.delivery_rehearsal",
    targetType: "OpsAlert",
    targetId: ticket,
    success: errors.length === 0,
    metadata: {
      ticket,
      requiredChannels: diagnostics.requiredChannels,
      deliveredChannels: result.channels.filter((item) => item.sent).map((item) => item.channel),
      errors,
    },
  });
  const auditEvidence = await db.adminAuditLog.findFirst({
    where: {
      actor,
      action: "ops.alert.delivery_rehearsal",
      targetType: "OpsAlert",
      targetId: ticket,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, success: true },
  });
  if (!auditEvidence) errors.push("alert rehearsal audit evidence was not persisted");
  console.log(JSON.stringify({ ticket, diagnostics, result, errors }, null, 2));
  if (errors.length > 0) fail(errors.join(", "));
  console.log("PASS production alert delivery rehearsal");
} finally {
  await db.$disconnect();
}
