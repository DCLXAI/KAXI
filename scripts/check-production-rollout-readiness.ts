import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { evaluateProductionRolloutReadiness, type RolloutPhase } from "../src/application/ops/production-rollout-readiness";
import { runtimeEnvironment } from "../src/infrastructure/config/runtime-environment";

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function configured(value: string | undefined) {
  const normalized = value?.trim() || "";
  return Boolean(normalized) && !/^replace-with-/i.test(normalized);
}

function positive(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

function approvedTicket(value: string | undefined) {
  const normalized = value?.trim() || "";
  return normalized.length >= 4 && !/^CHANGE-0+$/i.test(normalized);
}

function productionUrl(value: string | undefined) {
  try {
    const url = new URL(value || "");
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && host !== "localhost" && host !== "127.0.0.1" && host !== "::1";
  } catch {
    return false;
  }
}

function sharedPostgres(value: string | undefined) {
  try {
    const url = new URL(value || "");
    const host = url.hostname.toLowerCase();
    return /^postgres(?:ql)?:$/i.test(url.protocol) && host !== "localhost" && host !== "127.0.0.1" && host !== "::1";
  } catch {
    return false;
  }
}

function exactUtc(value: string | undefined) {
  const normalized = value?.trim() || "";
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(normalized) && Number.isFinite(Date.parse(normalized));
}

function gitOutput(args: string[]) {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

const phaseValue = argument("phase") || "all";
if (!(["deploy", "observe", "all"] as string[]).includes(phaseValue)) {
  console.error("FAIL --phase must be deploy, observe or all");
  process.exit(1);
}
const phase = phaseValue as RolloutPhase;
const env = runtimeEnvironment();
const dbValues = [env.DATABASE_URL, env.POSTGRES_URL, env.SUPABASE_DATABASE_URL, env.SUPABASE_POOLER_URL];
const sourceCommit = gitOutput(["rev-parse", "HEAD"]);
const approvedSourceCommit = argument("source-commit")?.trim() || "";
const cleanReleaseCheckout = gitOutput(["status", "--porcelain"]) === "";
const railwayCli = Bun.which("railway") !== null;
const railwayDeploymentAccess = process.argv.includes("--railway-deploy-authorized") && (railwayCli || configured(env.RAILWAY_TOKEN));
const alertChannel = configured(env.OPS_ALERT_WEBHOOK_URL) || configured(env.OPS_ALERT_SLACK_WEBHOOK_URL) ||
  (configured(env.OPS_ALERT_EMAIL_TO) && (configured(env.RESEND_API_KEY) || configured(env.SMTP_HOST)));

const result = evaluateProductionRolloutReadiness({
  phase,
  approvedTicket: approvedTicket(argument("ticket")),
  rollbackOwner: configured(argument("rollback-owner")),
  cleanReleaseCheckout,
  sourceCommit: /^[0-9a-f]{40}$/i.test(approvedSourceCommit) && sourceCommit === approvedSourceCommit,
  productionDatabase: dbValues.some(sharedPostgres),
  railwayDeploymentAccess,
  vercelProjectLinked: existsSync(".vercel/project.json"),
  aiProviderCredential: configured(env.OPENAI_API_KEY) || configured(env.ANTHROPIC_API_KEY),
  productionBaseUrl: productionUrl(argument("base-url")),
  latencyBudgets: positive(argument("baseline-complete-p95-ms")) && positive(argument("cold-first-progress-budget-ms")),
  alertChannel,
  alertRecipientsAcknowledged: process.argv.includes("--alert-recipients-acknowledged"),
  canaryStartUtc: exactUtc(argument("canary-start-utc")),
});

// Deliberately emit only check names and booleans. Never print credential values,
// database hosts, recipients, ticket content or operator identity.
console.log(JSON.stringify({ phase, ready: result.ready, checks: result.checks, missing: result.missing }, null, 2));
if (!result.ready) {
  console.error(`FAIL production rollout preflight: ${result.missing.join(", ")}`);
  process.exit(1);
}
console.log("PASS production rollout preflight");
