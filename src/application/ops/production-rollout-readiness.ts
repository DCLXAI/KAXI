export type RolloutPhase = "deploy" | "observe" | "all";

export interface ProductionRolloutReadinessInput {
  phase: RolloutPhase;
  approvedTicket: boolean;
  rollbackOwner: boolean;
  cleanReleaseCheckout: boolean;
  sourceCommit: boolean;
  productionDatabase: boolean;
  railwayDeploymentAccess: boolean;
  vercelProjectLinked: boolean;
  aiProviderCredential: boolean;
  productionBaseUrl: boolean;
  latencyBudgets: boolean;
  alertChannel: boolean;
  alertRecipientsAcknowledged: boolean;
  canaryStartUtc: boolean;
}

export interface RolloutReadinessCheck {
  id: string;
  requiredFor: Exclude<RolloutPhase, "all">;
  ok: boolean;
}

const DEPLOY_CHECKS = [
  "approved_ticket",
  "rollback_owner",
  "clean_release_checkout",
  "source_commit",
  "production_database",
  "railway_deployment_access",
  "vercel_project_linked",
  "ai_provider_credential",
] as const;

const OBSERVE_CHECKS = [
  "approved_ticket",
  "rollback_owner",
  "clean_release_checkout",
  "source_commit",
  "production_database",
  "ai_provider_credential",
  "production_base_url",
  "latency_budgets",
  "alert_channel",
  "alert_recipients_acknowledged",
  "canary_start_utc",
] as const;

type CheckId = typeof DEPLOY_CHECKS[number] | typeof OBSERVE_CHECKS[number];

function valueFor(input: ProductionRolloutReadinessInput, id: CheckId): boolean {
  const values: Record<CheckId, boolean> = {
    approved_ticket: input.approvedTicket,
    rollback_owner: input.rollbackOwner,
    clean_release_checkout: input.cleanReleaseCheckout,
    source_commit: input.sourceCommit,
    production_database: input.productionDatabase,
    railway_deployment_access: input.railwayDeploymentAccess,
    vercel_project_linked: input.vercelProjectLinked,
    ai_provider_credential: input.aiProviderCredential,
    production_base_url: input.productionBaseUrl,
    latency_budgets: input.latencyBudgets,
    alert_channel: input.alertChannel,
    alert_recipients_acknowledged: input.alertRecipientsAcknowledged,
    canary_start_utc: input.canaryStartUtc,
  };
  return values[id];
}

export function evaluateProductionRolloutReadiness(input: ProductionRolloutReadinessInput) {
  const phases: Array<Exclude<RolloutPhase, "all">> = input.phase === "all" ? ["deploy", "observe"] : [input.phase];
  const checks: RolloutReadinessCheck[] = phases.flatMap((phase) => {
    const ids = phase === "deploy" ? DEPLOY_CHECKS : OBSERVE_CHECKS;
    return ids.map((id) => ({ id, requiredFor: phase, ok: valueFor(input, id) }));
  });
  return {
    ready: checks.every((check) => check.ok),
    checks,
    missing: checks.filter((check) => !check.ok).map((check) => `${check.requiredFor}:${check.id}`),
  };
}
