import { createHmac } from "crypto";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

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

export interface OpsAlertResult {
  attempted: boolean;
  sent: boolean;
  skippedReason?: "not_configured";
  status?: number;
  error?: string;
}

function configured(value: string | undefined) {
  const text = value?.trim() || "";
  return text && !/^(replace-with-|change_me)/i.test(text) ? text : "";
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

export async function sendOpsAlert(
  payload: OpsAlertPayload,
  options: { fetchImpl?: FetchLike; env?: NodeJS.ProcessEnv } = {},
): Promise<OpsAlertResult> {
  const env = options.env || process.env;
  const webhookUrl = configured(env.OPS_ALERT_WEBHOOK_URL);
  if (!webhookUrl) return { attempted: false, sent: false, skippedReason: "not_configured" };

  let parsed: URL;
  try {
    parsed = new URL(webhookUrl);
    if (parsed.protocol !== "https:") throw new Error("OPS alert webhook must use HTTPS");
  } catch (error) {
    return { attempted: false, sent: false, error: error instanceof Error ? error.message : String(error) };
  }

  const format = env.OPS_ALERT_FORMAT?.trim().toLowerCase();
  const body = JSON.stringify(
    format === "slack" || parsed.hostname === "hooks.slack.com" ? slackBody(payload) : payload,
  );
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "user-agent": "KAXI-Ops/1.0 (+https://kaxi.vercel.app)",
  };
  const signingSecret = configured(env.OPS_ALERT_SIGNING_SECRET);
  if (signingSecret) {
    headers["x-kaxi-signature"] = `sha256=${createHmac("sha256", signingSecret).update(body).digest("hex")}`;
  }

  try {
    const response = await (options.fetchImpl || fetch)(webhookUrl, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      return { attempted: true, sent: false, status: response.status, error: `HTTP ${response.status}` };
    }
    return { attempted: true, sent: true, status: response.status };
  } catch (error) {
    return {
      attempted: true,
      sent: false,
      error: error instanceof Error ? error.message.slice(0, 240) : String(error).slice(0, 240),
    };
  }
}
