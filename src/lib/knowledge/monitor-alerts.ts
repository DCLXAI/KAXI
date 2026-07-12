import { createHmac } from "crypto";
import type { OfficialKnowledgeMonitorSummary } from "./source-monitor";
import { sendOpsAlert, type OpsAlertChannelResult } from "@/lib/ops/alerts";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface KnowledgeMonitorAlertContext {
  actor: string;
  trigger: "cron" | "admin-preview" | "admin-persist" | "test";
  fetchImpl?: FetchLike;
  now?: Date;
}

export interface KnowledgeMonitorAlertResult {
  attempted: boolean;
  sent: boolean;
  skippedReason?: "not_configured" | "no_change";
  status?: number;
  error?: string;
  channels?: OpsAlertChannelResult[];
}

export interface KnowledgeMonitorAlertPayload {
  kind: "knowledge_monitor_alert";
  trigger: KnowledgeMonitorAlertContext["trigger"];
  actor: string;
  checkedAt: string;
  generatedAt: string;
  summary: {
    total: number;
    changed: number;
    failed: number;
    candidatesCreated: number;
    impactedRules: number;
    impactedUsers: number;
  };
  changedSources: Array<{
    docId: string;
    title: string;
    sourceUrl: string;
    candidateDocId?: string;
    candidatePersisted: boolean;
    sourceDocIds: string[];
    impactedRules: number;
    impactedUsers: number;
    impactedRuleCodes: string[];
    impactedChatLogIds: string[];
  }>;
  failedSources: Array<{
    docId: string;
    title: string;
    sourceUrl: string;
    error?: string;
  }>;
  adminUrl: string;
  message: string;
}

function configured(value: string | undefined): boolean {
  const trimmed = value?.trim() || "";
  return Boolean(trimmed) && !/^replace-with-/i.test(trimmed);
}

function shouldAlert(summary: OfficialKnowledgeMonitorSummary): boolean {
  return summary.changed > 0 || summary.failed > 0 || summary.candidatesCreated > 0;
}

function appBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (explicit?.trim()) return explicit.trim().replace(/\/+$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/+$/, "")}`;
  return "https://kaxi.vercel.app";
}

function impactTotals(summary: OfficialKnowledgeMonitorSummary) {
  return summary.results.reduce(
    (acc, result) => {
      acc.rules += result.diff?.impact.ruleCount || 0;
      acc.users += result.diff?.impact.userCount || 0;
      return acc;
    },
    { rules: 0, users: 0 }
  );
}

export function buildKnowledgeMonitorAlertPayload(
  summary: OfficialKnowledgeMonitorSummary,
  context: KnowledgeMonitorAlertContext
): KnowledgeMonitorAlertPayload {
  const totals = impactTotals(summary);
  const changedSources = summary.results
    .filter((result) => result.status === "changed")
    .slice(0, 12)
    .map((result) => ({
      docId: result.docId,
      title: result.title,
      sourceUrl: result.sourceUrl,
      candidateDocId: result.candidateDocId,
      candidatePersisted: result.candidatePersisted === true,
      sourceDocIds: result.diff?.impact.sourceDocIds || [result.docId],
      impactedRules: result.diff?.impact.ruleCount || 0,
      impactedUsers: result.diff?.impact.userCount || 0,
      impactedRuleCodes: (result.diff?.impact.rules || [])
        .map((rule) => `${rule.code}@v${rule.version}`)
        .slice(0, 10),
      impactedChatLogIds: (result.diff?.impact.users || [])
        .map((user) => user.chatLogId)
        .slice(0, 10),
    }));
  const failedSources = summary.results
    .filter((result) => result.status === "failed")
    .slice(0, 8)
    .map((result) => ({
      docId: result.docId,
      title: result.title,
      sourceUrl: result.sourceUrl,
      error: result.error,
    }));
  const adminUrl = `${appBaseUrl()}/admin/knowledge`;
  const message = [
    `KAXI 공식 출처 감시: 변경 ${summary.changed}개, 실패 ${summary.failed}개, 후보 ${summary.candidatesCreated}개`,
    `영향 룰 ${totals.rules}개, 영향 대화 ${totals.users}개`,
    `검토: ${adminUrl}`,
  ].join("\n");

  return {
    kind: "knowledge_monitor_alert",
    trigger: context.trigger,
    actor: context.actor,
    checkedAt: summary.checkedAt,
    generatedAt: (context.now || new Date()).toISOString(),
    summary: {
      total: summary.total,
      changed: summary.changed,
      failed: summary.failed,
      candidatesCreated: summary.candidatesCreated,
      impactedRules: totals.rules,
      impactedUsers: totals.users,
    },
    changedSources,
    failedSources,
    adminUrl,
    message,
  };
}

function toSlackPayload(payload: KnowledgeMonitorAlertPayload) {
  const changedLines = payload.changedSources
    .slice(0, 6)
    .map((source) => `• ${source.title} (${source.docId}) · 룰 ${source.impactedRules} · 대화 ${source.impactedUsers}`)
    .join("\n");
  const failedLines = payload.failedSources
    .slice(0, 4)
    .map((source) => `• ${source.title}: ${source.error || "감시 실패"}`)
    .join("\n");

  return {
    text: payload.message,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: `*${payload.message.replace(/\n/g, "*\n")}` },
      },
      ...(changedLines
        ? [{ type: "section", text: { type: "mrkdwn", text: `*변경 출처*\n${changedLines}` } }]
        : []),
      ...(failedLines
        ? [{ type: "section", text: { type: "mrkdwn", text: `*실패 출처*\n${failedLines}` } }]
        : []),
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "KAXI 검토" },
            url: payload.adminUrl,
          },
        ],
      },
    ],
  };
}

function signBody(body: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

export async function sendKnowledgeMonitorAlert(
  summary: OfficialKnowledgeMonitorSummary,
  context: KnowledgeMonitorAlertContext
): Promise<KnowledgeMonitorAlertResult> {
  const webhookUrl = process.env.KNOWLEDGE_MONITOR_ALERT_WEBHOOK_URL?.trim() || "";
  if (!shouldAlert(summary)) {
    return { attempted: false, sent: false, skippedReason: "no_change" };
  }

  const payload = buildKnowledgeMonitorAlertPayload(summary, context);
  if (!configured(webhookUrl)) {
    const shared = await sendOpsAlert({
      kind: "kaxi_ops_alert",
      source: "kaxi-knowledge-monitor",
      severity: summary.failed > 0 ? "error" : "warning",
      eventType: summary.failed > 0 ? "knowledge_monitor_failed" : "knowledge_source_changed",
      message: payload.message,
      occurredAt: payload.generatedAt,
      details: {
        ...payload.summary,
        changedSourceIds: payload.changedSources.map((source) => source.docId),
        failedSourceIds: payload.failedSources.map((source) => source.docId),
      },
      adminUrl: payload.adminUrl,
    }, { fetchImpl: context.fetchImpl });
    return {
      attempted: shared.attempted,
      sent: shared.sent,
      skippedReason: shared.skippedReason,
      status: shared.status,
      error: shared.error,
      channels: shared.channels,
    };
  }

  const format = process.env.KNOWLEDGE_MONITOR_ALERT_FORMAT?.trim().toLowerCase();
  const body = JSON.stringify(
    format === "slack" || webhookUrl.includes("hooks.slack.com")
      ? toSlackPayload(payload)
      : payload
  );
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "user-agent": "KAXI-Knowledge-Monitor/1.0 (+https://kaxi.vercel.app)",
  };
  const signingSecret = process.env.KNOWLEDGE_MONITOR_ALERT_SIGNING_SECRET?.trim() || "";
  if (configured(signingSecret)) {
    headers["x-kaxi-signature"] = signBody(body, signingSecret);
  }

  try {
    const fetchImpl = context.fetchImpl || fetch;
    const response = await fetchImpl(webhookUrl, { method: "POST", headers, body });
    if (!response.ok) {
      return {
        attempted: true,
        sent: false,
        status: response.status,
        error: `HTTP ${response.status} ${response.statusText}`.trim(),
      };
    }
    return { attempted: true, sent: true, status: response.status };
  } catch (err) {
    return {
      attempted: true,
      sent: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
