import { parsePositiveInt } from "@/lib/api/security";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

type TypebotResultRow = {
  id?: unknown;
  createdAt?: unknown;
};

export interface TypebotResultRetentionResult {
  configured: boolean;
  dryRun: boolean;
  retentionDays: number;
  cutoff: string;
  examined: number;
  eligible: number;
  deleted: number;
  deleteFailures: number;
  apiFailures: number;
  batches: number;
  error?: string;
}

function configured(value: string | undefined) {
  const text = value?.trim() || "";
  return text && !/^(replace-with-|change_me)/i.test(text) ? text : "";
}

function resultBase(options: { env: NodeJS.ProcessEnv; now: Date; dryRun: boolean }): TypebotResultRetentionResult {
  const retentionDays = parsePositiveInt(options.env.TYPEBOT_RESULT_RETENTION_DAYS, 7);
  const cutoff = new Date(options.now.getTime() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  return {
    configured: false,
    dryRun: options.dryRun,
    retentionDays,
    cutoff,
    examined: 0,
    eligible: 0,
    deleted: 0,
    deleteFailures: 0,
    apiFailures: 0,
    batches: 0,
  };
}

function apiBaseUrl(value: string) {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:") throw new Error("Typebot API base URL must use HTTPS");
  return parsed.origin;
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 240) : String(error).slice(0, 240);
}

export async function enforceTypebotResultRetention(options: {
  dryRun?: boolean;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: FetchLike;
  now?: Date;
} = {}): Promise<TypebotResultRetentionResult> {
  const env = options.env || process.env;
  const now = options.now || new Date();
  const dryRun = Boolean(options.dryRun);
  const summary = resultBase({ env, now, dryRun });
  const token = configured(env.TYPEBOT_API_TOKEN);
  const botId = configured(env.TYPEBOT_BOT_ID);
  const baseUrlValue = configured(env.TYPEBOT_API_BASE_URL) || "https://app.typebot.com";
  if (!token || !botId) return summary;

  let baseUrl: string;
  try {
    baseUrl = apiBaseUrl(baseUrlValue);
  } catch (error) {
    return { ...summary, apiFailures: 1, error: errorText(error) };
  }

  const fetchImpl = options.fetchImpl || fetch;
  const endpoint = `${baseUrl}/api/v1/typebots/${encodeURIComponent(botId)}/results`;
  const eligibleIds: string[] = [];
  let cursor = 0;

  try {
    for (let page = 0; page < 100; page += 1) {
      const url = new URL(endpoint);
      url.searchParams.set("limit", "500");
      url.searchParams.set("cursor", String(cursor));
      url.searchParams.set("timeFilter", "allTime");
      url.searchParams.set("timeZone", "UTC");
      const response = await fetchImpl(url.toString(), {
        headers: { authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) throw new Error(`Typebot results list failed with HTTP ${response.status}`);
      const payload = await response.json() as { results?: TypebotResultRow[]; nextCursor?: unknown };
      const results = Array.isArray(payload.results) ? payload.results : [];
      summary.examined += results.length;
      for (const result of results) {
        if (typeof result.id !== "string" || typeof result.createdAt !== "string") continue;
        const createdAt = Date.parse(result.createdAt);
        if (Number.isFinite(createdAt) && createdAt < Date.parse(summary.cutoff)) eligibleIds.push(result.id);
      }
      if (typeof payload.nextCursor !== "number" || !Number.isFinite(payload.nextCursor)) break;
      cursor = payload.nextCursor;
    }
  } catch (error) {
    return { ...summary, configured: true, eligible: eligibleIds.length, apiFailures: 1, error: errorText(error) };
  }

  summary.configured = true;
  summary.eligible = eligibleIds.length;
  if (dryRun || eligibleIds.length === 0) return summary;

  for (let index = 0; index < eligibleIds.length; index += 100) {
    const ids = eligibleIds.slice(index, index + 100);
    const url = new URL(endpoint);
    url.searchParams.set("resultIds", ids.join(","));
    summary.batches += 1;
    try {
      const response = await fetchImpl(url.toString(), {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`Typebot result deletion failed with HTTP ${response.status}`);
      summary.deleted += ids.length;
    } catch (error) {
      summary.deleteFailures += ids.length;
      summary.apiFailures += 1;
      summary.error = errorText(error);
    }
  }
  return summary;
}
