import { runtimeEnvironment } from "@/infrastructure/config/runtime-environment";
import { createHash } from "crypto";
import { db } from "../db";
import {
  analyzeKnowledgeDocumentDiff,
  upsertPendingKnowledgeCandidate,
  type KnowledgeDiffSummary,
} from "./repository";
import type { OfficialSourceExtractionMethod } from "./harvest-metadata";
import {
  hasOfficialKnowledgeSourceType,
  hasOfficialKnowledgeSourceUrl,
  isOfficialProtocolDowngrade,
} from "./official-source";
import type { VerifiedOfficialKnowledgeSource } from "./verified-official-sources";
import {
  DEFAULT_CRON_KNOWLEDGE_SOURCE_IDS,
  OFFICIAL_KNOWLEDGE_SOURCE_WATCHLIST,
} from "./official-source-watchlist";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type OfficialKnowledgeSource = VerifiedOfficialKnowledgeSource;

export interface OfficialKnowledgeMonitorResult {
  docId: string;
  title: string;
  sourceUrl: string;
  status: "changed" | "unchanged" | "failed";
  contentHash?: string;
  bodyHash?: string;
  byteLength?: number;
  extractionMethod?: OfficialSourceExtractionMethod;
  extractedCharCount?: number;
  extractionError?: string;
  transportDowngraded?: boolean;
  candidateDocId?: string;
  candidatePersisted?: boolean;
  candidateChunkCount?: number;
  diff?: KnowledgeDiffSummary;
  error?: string;
}

export interface OfficialKnowledgeMonitorSummary {
  checkedAt: string;
  persistCandidates: boolean;
  total: number;
  changed: number;
  unchanged: number;
  failed: number;
  candidatesCreated: number;
  results: OfficialKnowledgeMonitorResult[];
}

export { OFFICIAL_KNOWLEDGE_SOURCE_WATCHLIST };
export { DEFAULT_CRON_KNOWLEDGE_SOURCE_IDS };

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

const BODY_HASH_LINE_RE = /^body_sha256:\s*([a-f0-9]{64})\s*$/im;
const DEFAULT_MONITOR_CONCURRENCY = 2;
const MAX_MONITOR_CONCURRENCY = 4;

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function normalizeHtml(value: string): string {
  return decodeHtmlEntities(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|tr|h[1-6]|section|article|table)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeText(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function detectOfficialSourceCharset(buffer: Buffer, contentType: string): string {
  const headerCharset = contentType.match(/charset\s*=\s*["']?\s*([a-z0-9._-]+)/i)?.[1];
  const htmlPrefix = buffer.toString("latin1", 0, Math.min(buffer.length, 8192));
  const metaCharset = htmlPrefix.match(/charset\s*=\s*["']?\s*([a-z0-9._-]+)/i)?.[1];
  const charset = (headerCharset || metaCharset || "utf-8").toLowerCase();
  if (/^(euc-kr|ks_c_5601|ks-c-5601|cp949|windows-949)/.test(charset)) return "euc-kr";
  return charset;
}

function decodeOfficialSourceText(buffer: Buffer, contentType: string): {
  text: string;
  charset: string;
} {
  const charset = detectOfficialSourceCharset(buffer, contentType);
  try {
    return {
      text: new TextDecoder(charset, { fatal: false }).decode(buffer),
      charset,
    };
  } catch {
    return {
      text: buffer.toString("utf8"),
      charset: "utf-8-fallback",
    };
  }
}

type PdfParseParser = {
  getText: () => Promise<{ text?: string }>;
  destroy?: () => Promise<void> | void;
};

type PdfParseModule = {
  PDFParse: new (options: { data: Uint8Array }) => PdfParseParser;
};

function isPdfOfficialSource(contentType: string, sourceUrl: string): boolean {
  return /pdf/i.test(contentType) || /\.pdf(?:[?#]|$)/i.test(sourceUrl);
}

function isBinaryOfficialSource(contentType: string, sourceUrl: string): boolean {
  return isPdfOfficialSource(contentType, sourceUrl) || /excel|spreadsheet|hwp|octet-stream|zip/i.test(contentType);
}

function buildBinarySourceMetadata(input: {
  contentType: string;
  byteHash: string;
  byteLength: number;
  extractionError?: string;
}): string {
  return [
    "Binary official source detected.",
    `content_type: ${input.contentType || "unknown"}`,
    `byte_sha256: ${input.byteHash}`,
    `byte_length: ${input.byteLength}`,
    input.extractionError ? `extraction_error: ${input.extractionError}` : undefined,
  ].filter(Boolean).join("\n");
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse") as unknown as PdfParseModule;
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return normalizeText(result.text || "");
  } finally {
    await parser.destroy?.();
  }
}

async function fetchWithTimeout(
  fetchImpl: FetchLike,
  url: string,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "KAXI-Knowledge-Monitor/1.0 (+https://kaxi.vercel.app)",
        accept: "text/html,application/xhtml+xml,application/pdf,text/plain,*/*;q=0.8",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

// law.go.kr intermittently answers an otherwise-live document with 404 or a 5xx:
// the failing document set differs on every run and the same URLs succeed on the
// next pass, so a single blip was enough to fail a whole batch and turn the
// scheduled monitor red. Retry those.
//
// The retry must never cost more than the run can afford. The monitor route fetches
// with an 8s budget at concurrency 2 inside a 60s maxDuration, and the largest batch
// holds 11 sources, so a stalled upstream already spends ~48s of that 60s. Blowing the
// ceiling is strictly worse than a failed source: Vercel kills the invocation, and the
// per-document error list the operator actually debugs from is never returned. Three
// rules keep the added cost bounded:
//
//   1. Timeouts and network errors are not retried at all. Each attempt would take a
//      fresh full timeout, and a stall lasting minutes — the other observed failure
//      mode — is not recoverable inside one invocation anyway. The next scheduled run
//      is the real retry.
//   2. Only a status that came back promptly is retried. A slow 5xx (a gateway giving
//      up on a stalled origin) is a stall wearing a status code, and retrying it costs
//      the same as retrying a timeout.
//   3. No attempt is started that could run past the batch deadline, so retries are a
//      bonus taken from genuine slack rather than a risk charged to the ceiling.
const RETRYABLE_FETCH_STATUSES = new Set([404, 408, 425, 429, 500, 502, 503, 504]);
const FETCH_ATTEMPTS = 3;
const FETCH_RETRY_BACKOFF_MS = [500, 1_000];
const FETCH_RETRY_MAX_LATENCY_MS = 2_000;
const FETCH_RETRY_BATCH_BUDGET_MS = 25_000;

async function fetchOfficialSourceWithRetry(
  fetchImpl: FetchLike,
  url: string,
  timeoutMs: number,
  retryDeadlineAt?: number
): Promise<Response> {
  for (let attempt = 1; ; attempt += 1) {
    const attemptStartedAt = Date.now();
    const response = await fetchWithTimeout(fetchImpl, url, timeoutMs);
    if (response.ok) return response;

    const statusError = new Error(`HTTP ${response.status} ${response.statusText}`.trim());
    if (attempt >= FETCH_ATTEMPTS || !RETRYABLE_FETCH_STATUSES.has(response.status)) {
      throw statusError;
    }
    if (Date.now() - attemptStartedAt > FETCH_RETRY_MAX_LATENCY_MS) {
      throw statusError;
    }

    const backoffMs = FETCH_RETRY_BACKOFF_MS[attempt - 1] ?? FETCH_RETRY_BACKOFF_MS[FETCH_RETRY_BACKOFF_MS.length - 1];
    if (retryDeadlineAt !== undefined && Date.now() + backoffMs + timeoutMs > retryDeadlineAt) {
      throw statusError;
    }

    await new Promise((resolve) => setTimeout(resolve, backoffMs));
  }
}

export async function fetchOfficialKnowledgeSource(
  source: OfficialKnowledgeSource,
  options: { fetchImpl?: FetchLike; timeoutMs?: number; maxChars?: number; retryDeadlineAt?: number } = {}
): Promise<{
  content: string;
  contentHash: string;
  bodyHash: string;
  byteLength: number;
  extractionMethod: OfficialSourceExtractionMethod;
  extractedCharCount: number;
  extractionError?: string;
  transportDowngraded: boolean;
}> {
  if (!hasOfficialKnowledgeSourceType(source.sourceType)) {
    throw new Error(`Non-official source type rejected: ${source.sourceType}`);
  }
  if (!hasOfficialKnowledgeSourceUrl(source.sourceUrl)) {
    throw new Error(`Non-official source URL rejected: ${source.sourceUrl}`);
  }

  const fetchImpl = options.fetchImpl || fetch;
  const timeoutMs = options.timeoutMs || 15_000;
  const maxChars = options.maxChars || 80_000;
  const response = await fetchOfficialSourceWithRetry(
    fetchImpl,
    source.sourceUrl,
    timeoutMs,
    options.retryDeadlineAt,
  );
  let transportDowngraded = false;
  if (response.url && !hasOfficialKnowledgeSourceUrl(response.url)) {
    if (isOfficialProtocolDowngrade(source.sourceUrl, response.url)) {
      transportDowngraded = true;
    } else {
      throw new Error(`Official source redirected to non-official URL: ${response.url}`);
    }
  }

  const contentType = response.headers.get("content-type") || "";
  const buffer = Buffer.from(await response.arrayBuffer());
  const byteHash = sha256(buffer);
  const decoded = decodeOfficialSourceText(buffer, contentType);
  const rawText = decoded.text;
  const isPdf = isPdfOfficialSource(contentType, source.sourceUrl);
  const looksBinary = isBinaryOfficialSource(contentType, source.sourceUrl);
  let extractionMethod: OfficialSourceExtractionMethod = "plain_text";
  let extractionError: string | undefined;
  let normalized = "";
  let stableBody = "";

  if (isPdf) {
    try {
      const pdfText = await extractPdfText(buffer);
      if (!pdfText) {
        throw new Error("empty_pdf_text");
      }
      extractionMethod = "pdf_text";
      stableBody = normalizeText(pdfText);
      normalized = [
        "PDF official source extracted.",
        `content_type: ${contentType || "application/pdf"}`,
        `byte_sha256: ${byteHash}`,
        `byte_length: ${buffer.length}`,
        "extraction_method: pdf-parse",
        `extracted_chars: ${pdfText.length}`,
        "",
        pdfText,
      ].join("\n");
    } catch (err) {
      extractionMethod = "binary_metadata";
      extractionError = err instanceof Error ? err.message : String(err);
      stableBody = byteHash;
      normalized = buildBinarySourceMetadata({
        contentType,
        byteHash,
        byteLength: buffer.length,
        extractionError,
      });
    }
  } else if (looksBinary) {
    extractionMethod = "binary_metadata";
    stableBody = byteHash;
    normalized = buildBinarySourceMetadata({ contentType, byteHash, byteLength: buffer.length });
  } else if (contentType.includes("html") || /<html|<!doctype/i.test(rawText)) {
    extractionMethod = "html";
    normalized = normalizeHtml(rawText);
    stableBody = normalized;
  } else {
    extractionMethod = "plain_text";
    normalized = normalizeText(rawText);
    stableBody = normalized;
  }

  const validationBody = extractionMethod === "binary_metadata" ? "" : stableBody;
  // When validation fails because extraction degraded, the underlying
  // extraction error is the actionable fact — carry it into the failure.
  const extractionDetail = `extraction: ${extractionMethod}${extractionError ? `, error: ${extractionError.slice(0, 200)}` : ""}`;
  const minimumExtractedChars = source.minimumExtractedChars || 0;
  if (minimumExtractedChars > 0 && validationBody.length < minimumExtractedChars) {
    throw new Error(
      `Official source body too short: ${validationBody.length} < ${minimumExtractedChars} (${extractionDetail})`,
    );
  }
  const requiredContentSignals = (source.requiredContentSignals || [])
    .map((signal) => signal.trim())
    .filter(Boolean);
  if (
    requiredContentSignals.length > 0 &&
    !requiredContentSignals.some((signal) =>
      validationBody.toLocaleLowerCase().includes(signal.toLocaleLowerCase())
    )
  ) {
    throw new Error(
      `Official source body missing required signals: ${requiredContentSignals.join(", ")} (${extractionDetail})`,
    );
  }

  const clipped = normalized.slice(0, maxChars);
  const bodyHash = sha256(stableBody.slice(0, maxChars));
  const content = [
    `# ${source.title}`,
    `source_url: ${source.sourceUrl}`,
    `source_type: ${source.sourceType}`,
    `topic: ${source.topic}`,
    `legal_priority: ${source.legalPriority || "unclassified"}`,
    `monitor_cadence: ${source.monitorCadence || "daily"}`,
    `change_signals: ${(source.changeSignals || []).join(", ") || "content_hash"}`,
    `evidence_kind: ${source.evidenceKind || "government_guidance"}`,
    `applicant_region: ${source.applicantRegion || "global"}`,
    `required_content_signals: ${requiredContentSignals.join(", ") || "none"}`,
    `extraction_method: ${extractionMethod}`,
    `body_sha256: ${bodyHash}`,
    `content_type: ${contentType || "unknown"}`,
    `content_encoding: ${decoded.charset}`,
    `byte_sha256: ${byteHash}`,
    `byte_length: ${buffer.length}`,
    `extracted_chars: ${normalized.length}`,
    extractionError ? `extraction_error: ${extractionError}` : undefined,
    "",
    clipped,
  ].filter((line): line is string => typeof line === "string").join("\n");

  return {
    content,
    contentHash: bodyHash,
    bodyHash,
    byteLength: buffer.length,
    extractionMethod,
    extractedCharCount: normalized.length,
    extractionError,
    transportDowngraded,
  };
}

function candidateDocIdFor(docId: string, contentHash: string): string {
  return `${docId}__candidate__${contentHash.slice(0, 12)}`;
}

function candidateBodyHash(chunks: Array<{ chunkIndex: number; content: string }>): string | undefined {
  const content = chunks
    .slice()
    .sort((a, b) => a.chunkIndex - b.chunkIndex)
    .map((chunk) => chunk.content)
    .join("\n\n");
  return content.match(BODY_HASH_LINE_RE)?.[1]?.toLowerCase();
}

async function findSingleOpenCandidate(sourceDocId: string, actor: string) {
  const candidates = await db.knowledgeDocument.findMany({
    where: {
      reviewStatus: "PENDING",
      docId: { startsWith: `${sourceDocId}__candidate__` },
    },
    include: {
      chunks: {
        select: { chunkIndex: true, content: true },
        orderBy: { chunkIndex: "asc" },
      },
    },
    orderBy: [{ lastCheckedAt: "desc" }, { updatedAt: "desc" }, { docId: "asc" }],
  });
  const keeper = candidates[0];
  if (!keeper || candidates.length === 1) return keeper;

  await db.knowledgeDocument.updateMany({
    where: { id: { in: candidates.slice(1).map((candidate) => candidate.id) } },
    data: {
      reviewStatus: "REJECTED",
      supersededBy: keeper.docId,
      checkedBy: actor,
    },
  });
  return keeper;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getOfficialKnowledgeSourceWatchlist(): OfficialKnowledgeSource[] {
  const configured = (runtimeEnvironment().KNOWLEDGE_MONITOR_SOURCE_IDS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const sources = configured.length > 0
    ? OFFICIAL_KNOWLEDGE_SOURCE_WATCHLIST.filter((source) => configured.includes(source.docId))
    : OFFICIAL_KNOWLEDGE_SOURCE_WATCHLIST;
  const maxSources = parsePositiveInt(runtimeEnvironment().KNOWLEDGE_MONITOR_MAX_SOURCES, sources.length);
  return sources.slice(0, maxSources);
}

export function getCronOfficialKnowledgeSources(env: NodeJS.ProcessEnv = runtimeEnvironment()) {
  const configuredIds = (env.KNOWLEDGE_MONITOR_CRON_SOURCE_IDS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const ids = configuredIds.length > 0 ? configuredIds : [...DEFAULT_CRON_KNOWLEDGE_SOURCE_IDS];
  const byId = new Map(OFFICIAL_KNOWLEDGE_SOURCE_WATCHLIST.map((source) => [source.docId, source]));
  return ids.flatMap((id) => {
    const source = byId.get(id);
    return source ? [source] : [];
  });
}

export async function runOfficialKnowledgeSourceMonitor(
  options: {
    actor?: string;
    persistCandidates?: boolean;
    sources?: OfficialKnowledgeSource[];
    fetchImpl?: FetchLike;
    timeoutMs?: number;
    maxChars?: number;
    chunkMaxChars?: number;
    concurrency?: number;
    now?: Date;
  } = {}
): Promise<OfficialKnowledgeMonitorSummary> {
  const now = options.now || new Date();
  const persistCandidates = options.persistCandidates ?? false;
  const actor = options.actor || "knowledge-monitor";
  const sources = options.sources || getOfficialKnowledgeSourceWatchlist();
  const configuredConcurrency = parsePositiveInt(
    runtimeEnvironment().KNOWLEDGE_MONITOR_CONCURRENCY,
    DEFAULT_MONITOR_CONCURRENCY,
  );
  const concurrency = Math.min(
    Math.max(options.concurrency || configuredConcurrency, 1),
    MAX_MONITOR_CONCURRENCY,
  );
  // Retries are only taken from slack near the start of the batch. Once the run is
  // this far in, the remaining sources still need their own fetches inside the route's
  // 60s maxDuration, so no further retry is started.
  const retryDeadlineAt = Date.now() + FETCH_RETRY_BATCH_BUDGET_MS;

  const inspectSource = async (source: OfficialKnowledgeSource): Promise<OfficialKnowledgeMonitorResult> => {
    try {
      const fetched = await fetchOfficialKnowledgeSource(source, {
        fetchImpl: options.fetchImpl,
        timeoutMs: options.timeoutMs,
        maxChars: options.maxChars,
        retryDeadlineAt,
      });
      const diff = await analyzeKnowledgeDocumentDiff({
        docId: source.docId,
        actor,
        title: source.title,
        content: fetched.content,
        sourceUrl: source.sourceUrl,
        sourceType: source.sourceType,
        language: source.language || "ko",
        jurisdiction: source.jurisdiction || "KR",
        topic: source.topic,
        chunkMaxChars: options.chunkMaxChars,
        now,
      });
      const proposedCandidateDocId = candidateDocIdFor(source.docId, fetched.bodyHash);
      let candidateDocId = proposedCandidateDocId;
      let candidatePersisted = false;
      if (diff.changed && persistCandidates) {
        const openCandidate = await findSingleOpenCandidate(source.docId, actor);
        candidateDocId = openCandidate?.docId || proposedCandidateDocId;
        const openBodyHash = openCandidate ? candidateBodyHash(openCandidate.chunks) : undefined;
        const closedMatchingCandidate = openCandidate
          ? null
          : await db.knowledgeDocument.findUnique({
              where: { docId: proposedCandidateDocId },
              select: { reviewStatus: true },
            });
        if (!closedMatchingCandidate && (!openCandidate || openBodyHash !== fetched.bodyHash)) {
          const persistCandidate = (docId: string) =>
            upsertPendingKnowledgeCandidate({
              docId,
              actor,
              title: `[검토 후보] ${source.title}`,
              content: fetched.content,
              sourceUrl: source.sourceUrl,
              sourceType: source.sourceType,
              language: source.language || "ko",
              jurisdiction: source.jurisdiction || "KR",
              topic: source.topic,
              supersedes: [source.docId],
              chunkMaxChars: options.chunkMaxChars,
              now,
            });
          try {
            await persistCandidate(candidateDocId);
            candidatePersisted = true;
          } catch (error) {
            const winningCandidate = await findSingleOpenCandidate(source.docId, actor).catch(() => undefined);
            if (!winningCandidate || winningCandidate.docId === candidateDocId) throw error;
            candidateDocId = winningCandidate.docId;
            if (candidateBodyHash(winningCandidate.chunks) !== fetched.bodyHash) {
              await persistCandidate(candidateDocId);
              candidatePersisted = true;
            }
          }
        }
      }

      return {
        docId: source.docId,
        title: source.title,
        sourceUrl: source.sourceUrl,
        status: diff.changed ? "changed" : "unchanged",
        contentHash: fetched.contentHash,
        bodyHash: fetched.bodyHash,
        byteLength: fetched.byteLength,
        extractionMethod: fetched.extractionMethod,
        extractedCharCount: fetched.extractedCharCount,
        extractionError: fetched.extractionError,
        transportDowngraded: fetched.transportDowngraded,
        candidateDocId: diff.changed ? candidateDocId : undefined,
        candidatePersisted,
        candidateChunkCount: diff.candidateChunkCount,
        diff,
      };
    } catch (err) {
      return {
        docId: source.docId,
        title: source.title,
        sourceUrl: source.sourceUrl,
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  };

  const resultSlots = new Array<OfficialKnowledgeMonitorResult | undefined>(sources.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < sources.length) {
      const index = nextIndex;
      nextIndex += 1;
      resultSlots[index] = await inspectSource(sources[index]);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, sources.length) }, () => worker()),
  );
  const results = resultSlots.filter((result): result is OfficialKnowledgeMonitorResult => Boolean(result));

  return {
    checkedAt: now.toISOString(),
    persistCandidates,
    total: results.length,
    changed: results.filter((result) => result.status === "changed").length,
    unchanged: results.filter((result) => result.status === "unchanged").length,
    failed: results.filter((result) => result.status === "failed").length,
    candidatesCreated: results.filter((result) => result.candidatePersisted).length,
    results,
  };
}
