import { createHmac } from "crypto";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type OpsAlertChannel = "webhook" | "slack" | "email";

export interface OpsAlertPayload {
  kind: "kaxi_ops_alert";
  source: string;
  severity: "warning" | "error" | "critical";
  eventType: string;
  message: string;
  occurredAt: string;
  details?: Record<string, unknown>;
  adminUrl?: string;
}

export interface OpsAlertChannelResult {
  channel: OpsAlertChannel;
  attempted: boolean;
  sent: boolean;
  status?: number;
  error?: string;
}

export interface OpsAlertResult {
  attempted: boolean;
  sent: boolean;
  allSent: boolean;
  partial: boolean;
  skippedReason?: "not_configured";
  status?: number;
  error?: string;
  channels: OpsAlertChannelResult[];
}

export interface OpsAlertDiagnostics {
  configuredChannels: OpsAlertChannel[];
  requiredChannels: OpsAlertChannel[];
  missingRequiredChannels: OpsAlertChannel[];
  webhookConfigured: boolean;
  slackConfigured: boolean;
  emailConfigured: boolean;
  emailRecipientCount: number;
  required: boolean;
  ready: boolean;
}

function configured(value: string | undefined) {
  const text = value?.trim() || "";
  return text && !/^(replace-with-|change_me)/i.test(text) ? text : "";
}

function isEnvTrue(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

function httpsUrl(value: string | undefined) {
  const text = configured(value);
  try {
    return text && new URL(text).protocol === "https:" ? text : "";
  } catch {
    return "";
  }
}

function legacyWebhookTargets(env: NodeJS.ProcessEnv) {
  const legacyUrl = httpsUrl(env.OPS_ALERT_WEBHOOK_URL);
  const format = env.OPS_ALERT_FORMAT?.trim().toLowerCase();
  const legacyIsSlack = Boolean(
    legacyUrl && (format === "slack" || new URL(legacyUrl).hostname === "hooks.slack.com"),
  );
  return {
    webhookUrl: legacyIsSlack ? "" : legacyUrl,
    slackUrl: httpsUrl(env.OPS_ALERT_SLACK_WEBHOOK_URL) || (legacyIsSlack ? legacyUrl : ""),
  };
}

function emailRecipients(env: NodeJS.ProcessEnv) {
  return (env.OPS_ALERT_EMAIL_TO || "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    .slice(0, 5);
}

function emailConfigured(env: NodeJS.ProcessEnv) {
  return Boolean(
    configured(env.RESEND_API_KEY).length >= 16 &&
    configured(env.OPS_ALERT_EMAIL_FROM || env.NOTIFY_EMAIL_FROM) &&
    emailRecipients(env).length > 0,
  );
}

function requiredChannels(env: NodeJS.ProcessEnv) {
  const valid = new Set<OpsAlertChannel>(["webhook", "slack", "email"]);
  return Array.from(new Set(
    (env.OPS_ALERT_REQUIRED_CHANNELS || "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter((value): value is OpsAlertChannel => valid.has(value as OpsAlertChannel)),
  ));
}

export function getOpsAlertDiagnostics(env: NodeJS.ProcessEnv = process.env): OpsAlertDiagnostics {
  const targets = legacyWebhookTargets(env);
  const configuredChannels: OpsAlertChannel[] = [
    ...(targets.webhookUrl ? ["webhook" as const] : []),
    ...(targets.slackUrl ? ["slack" as const] : []),
    ...(emailConfigured(env) ? ["email" as const] : []),
  ];
  const required = isEnvTrue(env.OPS_ALERT_REQUIRED);
  const expected = requiredChannels(env);
  const requiredSet = expected.length > 0
    ? expected
    : required
      ? ["slack", "email"] satisfies OpsAlertChannel[]
      : [];
  const missingRequiredChannels = requiredSet.filter((channel) => !configuredChannels.includes(channel));

  return {
    configuredChannels,
    requiredChannels: requiredSet,
    missingRequiredChannels,
    webhookConfigured: Boolean(targets.webhookUrl),
    slackConfigured: Boolean(targets.slackUrl),
    emailConfigured: configuredChannels.includes("email"),
    emailRecipientCount: emailRecipients(env).length,
    required,
    ready: missingRequiredChannels.length === 0 && (!required || configuredChannels.length > 0),
  };
}

function slackBody(payload: OpsAlertPayload) {
  const details = payload.details ? `\n\`\`\`${JSON.stringify(payload.details).slice(0, 2200)}\`\`\`` : "";
  return {
    text: `[KAXI ${payload.severity.toUpperCase()}] ${payload.message}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*KAXI ${payload.severity.toUpperCase()}* · ${payload.eventType}\n${payload.message}${details}`,
        },
      },
      ...(payload.adminUrl
        ? [{
            type: "actions",
            elements: [{ type: "button", text: { type: "plain_text", text: "KAXI 운영 확인" }, url: payload.adminUrl }],
          }]
        : []),
    ],
  };
}

function emailBody(payload: OpsAlertPayload, env: NodeJS.ProcessEnv) {
  const details = payload.details ? `\n\nDetails\n${JSON.stringify(payload.details, null, 2).slice(0, 6000)}` : "";
  return {
    from: configured(env.OPS_ALERT_EMAIL_FROM || env.NOTIFY_EMAIL_FROM),
    to: emailRecipients(env),
    subject: `[KAXI ${payload.severity.toUpperCase()}] ${payload.eventType}`.slice(0, 180),
    text: [
      payload.message,
      `Source: ${payload.source}`,
      `Occurred at: ${payload.occurredAt}`,
      payload.adminUrl ? `Admin: ${payload.adminUrl}` : "",
    ].filter(Boolean).join("\n") + details,
  };
}

async function postJson(
  channel: OpsAlertChannel,
  url: string,
  body: string,
  headers: Record<string, string>,
  fetchImpl: FetchLike,
): Promise<OpsAlertChannelResult> {
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      return { channel, attempted: true, sent: false, status: response.status, error: `HTTP ${response.status}` };
    }
    return { channel, attempted: true, sent: true, status: response.status };
  } catch (error) {
    return {
      channel,
      attempted: true,
      sent: false,
      error: error instanceof Error ? error.message.slice(0, 240) : String(error).slice(0, 240),
    };
  }
}

export async function sendOpsAlert(
  payload: OpsAlertPayload,
  options: { fetchImpl?: FetchLike; env?: NodeJS.ProcessEnv } = {},
): Promise<OpsAlertResult> {
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || fetch;
  const targets = legacyWebhookTargets(env);
  const deliveries: Array<Promise<OpsAlertChannelResult>> = [];

  if (targets.webhookUrl) {
    const body = JSON.stringify(payload);
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "user-agent": "KAXI-Ops/1.0 (+https://kaxi.vercel.app)",
    };
    const signingSecret = configured(env.OPS_ALERT_SIGNING_SECRET);
    if (signingSecret) {
      headers["x-kaxi-signature"] = `sha256=${createHmac("sha256", signingSecret).update(body).digest("hex")}`;
    }
    deliveries.push(postJson("webhook", targets.webhookUrl, body, headers, fetchImpl));
  }

  if (targets.slackUrl) {
    deliveries.push(postJson(
      "slack",
      targets.slackUrl,
      JSON.stringify(slackBody(payload)),
      { "content-type": "application/json", "user-agent": "KAXI-Ops/1.0 (+https://kaxi.vercel.app)" },
      fetchImpl,
    ));
  }

  if (emailConfigured(env)) {
    deliveries.push(postJson(
      "email",
      "https://api.resend.com/emails",
      JSON.stringify(emailBody(payload, env)),
      {
        authorization: `Bearer ${configured(env.RESEND_API_KEY)}`,
        "content-type": "application/json",
        "user-agent": "KAXI-Ops/1.0 (+https://kaxi.vercel.app)",
      },
      fetchImpl,
    ));
  }

  if (deliveries.length === 0) {
    return {
      attempted: false,
      sent: false,
      allSent: false,
      partial: false,
      skippedReason: "not_configured",
      channels: [],
    };
  }

  const channels = await Promise.all(deliveries);
  const successful = channels.filter((result) => result.sent);
  const failed = channels.filter((result) => !result.sent);
  return {
    attempted: true,
    sent: successful.length > 0,
    allSent: failed.length === 0,
    partial: successful.length > 0 && failed.length > 0,
    status: channels.length === 1 ? channels[0].status : undefined,
    error: failed.length > 0
      ? failed.map((result) => `${result.channel}: ${result.error || "delivery failed"}`).join("; ").slice(0, 500)
      : undefined,
    channels,
  };
}
