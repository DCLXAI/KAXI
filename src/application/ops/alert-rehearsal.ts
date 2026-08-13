import type { OpsAlertDiagnostics, OpsAlertResult } from "@/lib/ops/alerts";

export function alertRehearsalErrors(diagnostics: OpsAlertDiagnostics, result: OpsAlertResult) {
  const errors: string[] = [];
  if (!diagnostics.required) errors.push("alerts_not_required_in_environment");
  if (!diagnostics.ready) errors.push("required_alert_channel_missing");
  if (!result.attempted) errors.push("alert_delivery_not_attempted");
  for (const channel of diagnostics.requiredChannels) {
    if (!result.channels.some((item) => item.channel === channel && item.sent)) {
      errors.push(`required_channel_not_delivered:${channel}`);
    }
  }
  if (!result.allSent) errors.push("configured_channel_delivery_failed");
  return [...new Set(errors)];
}
