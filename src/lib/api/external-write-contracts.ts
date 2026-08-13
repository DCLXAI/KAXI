import { NextResponse } from "next/server";
import { JsonBodyError, readJsonBody } from "@/lib/api/json-body";

type WriteMethod = "POST" | "PUT" | "PATCH" | "DELETE";
type BodyContract =
  | { kind: "json"; maxBytes: number; allowedKeys: readonly string[] }
  | { kind: "none" }
  | { kind: "multipart"; maxBytes: number }
  | { kind: "binary"; maxBytes: number };

export interface ExternalWriteContract {
  method: WriteMethod;
  path: string;
  body: BodyContract;
  queryKeys?: readonly string[];
}

const KB = 1024;
const json = (method: WriteMethod, path: string, allowedKeys: readonly string[], maxBytes = 16 * KB): ExternalWriteContract => ({
  method,
  path,
  body: { kind: "json", maxBytes, allowedKeys },
});
const none = (method: WriteMethod, path: string): ExternalWriteContract => ({ method, path, body: { kind: "none" } });

const AI_KEYS = ["question", "lang", "history", "mode", "leadId", "studentProfileId"] as const;
const SCHOOL_KEYS = [
  "id", "name", "region", "program", "tuitionPerSemester", "dormitoryAvailable", "dormitoryCost",
  "koreanRequirement", "accreditation", "topikLevel", "intake", "officialUrl", "sourceUrl",
  "verifiedAt", "reviewAfter", "notes",
] as const;

/**
 * Canonical inventory for every externally reachable mutating Route Handler.
 *
 * The schemas deliberately validate the transport envelope here (body kind,
 * byte cap, top-level fields, path and query shape). Feature-level schemas in
 * the handler continue to validate values and nested structures. Keeping this
 * inventory explicit makes a newly added POST/PUT/PATCH/DELETE fail CI until it
 * has a declared, enforced contract.
 */
export const EXTERNAL_WRITE_CONTRACTS: readonly ExternalWriteContract[] = [
  json("POST", "/api/admin/cases/[id]/actions", ["action", "assignedUserId", "documentItemIds", "note", "organizationId", "responseDraft"]),
  json("PATCH", "/api/admin/documents/[id]/review", ["status", "reviewStatus", "reviewNote"]),
  json("POST", "/api/admin/documents/[id]/verification-feedback", ["label", "note", "issueCodes", "layerStatuses"]),
  json("POST", "/api/admin/documents/[id]/verify", ["visaType", "stayAction", "applicantContext", "enableRag", "enableLlm", "minRagVectorScore", "minRagKeywordScore", "persist"]),
  json("POST", "/api/admin/documents/verify-batch", ["caseId", "studentProfileId", "visaType", "stayAction", "applicantContext", "enableRag", "enableLlm", "minRagVectorScore", "minRagKeywordScore", "persist", "createMissingPlaceholders"]),
  json("PATCH", "/api/admin/handoffs", ["id", "ids", "action", "assignee", "assigneeUserId", "organizationId", "slaMinutes", "slaPolicy", "note", "resolutionCode"]),
  json("PATCH", "/api/admin/knowledge", ["docId", "action", "title", "content", "sourceUrl", "sourceType", "language", "jurisdiction", "topic", "supersedes", "supersededBy", "docIds", "allPendingCandidates", "checkedBy", "checkedAt", "reviewedBy", "reviewedAt", "minApprovedCandidateChunks", "minProjectedApprovedChunks"], 256 * KB),
  none("POST", "/api/admin/ops"),
  json("POST", "/api/admin/ops/dead-letters/[id]/replay", ["kind", "reason", "confirmation"], 4 * KB),
  json("PATCH", "/api/admin/ops", ["eventId", "eventIds", "acknowledgeBefore"], 32 * KB),
  json("PATCH", "/api/admin/partner-requests", ["requestId", "organizationId", "assignedUserId"]),
  json("POST", "/api/admin/rag-ingestion", ["docId", "doc_id", "title", "content", "sourceUrl", "source_url", "sourceType", "source_type", "language", "jurisdiction", "category", "topic", "supersedes"], 192 * KB),
  json("POST", "/api/admin/rag-serving", ["limit", "force"]),
  json("PATCH", "/api/admin/rules", ["versionId", "reviewStatus"]),
  json("POST", "/api/ai/agent", AI_KEYS, 100 * KB),
  json("POST", "/api/ai/chat", AI_KEYS, 100 * KB),
  json("POST", "/api/ai/consult", AI_KEYS, 100 * KB),
  json("POST", "/api/ai/unified", [...AI_KEYS, "previousCapability", "previousExpertMode"], 100 * KB),
  json("POST", "/api/ai/unified/stream", [...AI_KEYS, "previousCapability", "previousExpertMode"], 100 * KB),
  none("DELETE", "/api/auth/session"),
  json("POST", "/api/auth/supabase/otp", ["email", "inviteToken", "locale", "next"]),
  json("POST", "/api/auth/supabase/sync", ["inviteToken", "locale", "next"]),
  { method: "POST", path: "/api/chat-attachments", body: { kind: "multipart", maxBytes: 9 * 1024 * KB } },
  json("PATCH", "/api/chat-attachments", ["sessionId", "attachmentId"], 4 * KB),
  json("DELETE", "/api/chat-attachments", ["sessionId", "attachmentId"], 4 * KB),
  json("POST", "/api/chat-session/claim", [], 1 * KB),
  json("POST", "/api/chat-session", ["forceNew", "locale"], 4 * KB),
  json("POST", "/api/diagnosis", ["nationality", "age", "education", "korean", "goal", "budget", "region", "usingBroker", "brokerCost", "hasHistory"]),
  { method: "PUT", path: "/api/documents/upload-direct", body: { kind: "binary", maxBytes: 20 * 1024 * KB } },
  json("POST", "/api/documents/upload-intent", ["documentType", "originalName", "mimeType", "sizeBytes", "sha256"]),
  json("POST", "/api/internal/chat-attachments/process", [], 1 * KB),
  json("POST", "/api/internal/n8n/error-report", ["workflowId", "workflowName", "workflowVersionId", "executionId", "message", "eventType", "severity", "modelVersion", "promptVersion", "lastNodeExecuted", "executionUrl", "mode"], 32 * KB),
  json("POST", "/api/internal/n8n/handoff-update", ["verificationToken", "payload"], 128 * KB),
  json("POST", "/api/internal/n8n/rag-ingestion", ["verificationToken", "payload", "chunkEmbedding"], 128 * KB),
  json("POST", "/api/internal/n8n/rag-runtime", ["verificationToken", "payload", "queryEmbedding"], 128 * KB),
  json("POST", "/api/internal/n8n/verify", ["purpose", "timestamp", "nonce", "signature", "payload"], 2 * 1024 * KB),
  json("POST", "/api/internal/rag-serving/sync", ["action", "limit", "force"]),
  json("POST", "/api/knowledge/monitor", ["jobId", "sourceIds", "maxSources", "persistCandidates"], 32 * KB),
  none("DELETE", "/api/leads/[id]"),
  json("POST", "/api/leads", ["nickname", "nationality", "pathKey", "age", "education", "koreanLevel", "goal", "currentVisa", "budget", "region", "usingBroker", "brokerCost", "hasHistory", "estimatedCost", "prepTime", "requiredDocs", "warnings", "nextActions", "contact", "contactType"]),
  json("PATCH", "/api/notifications", ["notificationId"]),
  json("POST", "/api/ops/embedding-audit", [], 1 * KB),
  json("POST", "/api/ops/health", [], 1 * KB),
  json("POST", "/api/ops/sla", [], 1 * KB),
  json("PATCH", "/api/partner-requests/[id]", ["status"]),
  json("POST", "/api/partner-requests", ["leadId", "partnerType", "question", "name", "contact", "contactType", "consent"]),
  json("POST", "/api/partner/cases/[id]/actions", ["action", "note", "documentItemIds"]),
  json("PATCH", "/api/partner/handoffs", ["id", "action"]),
  json("PATCH", "/api/partner/requests", ["requestId", "action"]),
  json("POST", "/api/privacy/delete-request", ["contact", "locale", "question"]),
  json("POST", "/api/privacy/retention", ["dryRun"]),
  json("POST", "/api/product-events", ["eventId", "eventName", "anonymousId", "sessionId", "locale", "surface", "path", "properties", "occurredAt"], 8 * KB),
  json("POST", "/api/schools/[id]/review", ["verifiedAt", "reviewAfter", "sourceUrl", "officialUrl"]),
  json("PATCH", "/api/schools/[id]", SCHOOL_KEYS),
  none("DELETE", "/api/schools/[id]"),
  json("POST", "/api/schools", SCHOOL_KEYS),
  json("PATCH", "/api/synonyms/[id]", ["targets", "category", "origin", "enabled"]),
  none("DELETE", "/api/synonyms/[id]"),
  json("POST", "/api/synonyms", ["source", "targets", "category", "origin", "enabled"]),
  json("POST", "/api/synonyms/suggest", ["days", "topN"]),
  json("POST", "/api/typebot-handoff", ["typebotResultId", "sessionId", "handoffToken", "leadContact", "locale", "privacyConsent", "privacyNoticeVersion", "leadName", "leadNote", "question", "answer", "leadContactType", "riskLevel", "leadStage", "provenance"], 32 * KB),
  json("POST", "/api/typebot-rag", ["question", "sessionId", "locale", "source", "typebotResultId", "category", "attachments", "requestId"], 64 * KB),
] as const;

function pathPattern(template: string) {
  const escaped = template.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped.replace(/\\\[[^/]+\\\]/g, "([^/]+)")}$`);
}

export function externalWriteContract(method: string, pathname: string) {
  return EXTERNAL_WRITE_CONTRACTS.find((contract) =>
    contract.method === method && pathPattern(contract.path).test(pathname),
  );
}

function contractError(requestId: string, code: string, message: string, status: 400 | 413, issues: string[] = []) {
  return NextResponse.json({
    error: { code, message, requestId, retryable: false, issues },
  }, { status, headers: { "x-request-id": requestId } });
}

function declaredLength(headers: Headers) {
  const raw = headers.get("content-length");
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

async function bodyExceeds(request: Request, maxBytes: number) {
  const declared = declaredLength(request.headers);
  if (declared !== null && declared > maxBytes) return true;
  if (!request.body) return false;
  const reader = request.clone().body!.getReader();
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return false;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel("request_body_too_large").catch(() => undefined);
        return true;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function validateExternalWriteRequest(request: Request): Promise<NextResponse | null> {
  const url = new URL(request.url);
  const requestId = request.headers.get("x-request-id")?.trim().slice(0, 128) || crypto.randomUUID();
  const contract = externalWriteContract(request.method, url.pathname);
  if (!contract) {
    return contractError(requestId, "WRITE_CONTRACT_MISSING", "Write endpoint contract is not registered", 400);
  }

  const allowedQuery = new Set(contract.queryKeys || []);
  const unknownQuery = [...url.searchParams.keys()].filter((key) => !allowedQuery.has(key));
  if (unknownQuery.length > 0) {
    return contractError(requestId, "QUERY_SCHEMA_INVALID", "Unknown query parameter", 400, unknownQuery);
  }

  const matched = url.pathname.match(pathPattern(contract.path));
  const invalidPath = (matched?.slice(1) || []).some((value) => {
    const decoded = decodeURIComponent(value).trim();
    return decoded.length === 0 || decoded.length > 240 || decoded.includes("/");
  });
  if (invalidPath) {
    return contractError(requestId, "PATH_SCHEMA_INVALID", "Invalid path parameter", 400);
  }

  if (contract.body.kind === "none") {
    if (await bodyExceeds(request, 0)) {
      return contractError(requestId, "BODY_NOT_ALLOWED", "Request body is not allowed", 400);
    }
    return null;
  }

  if (contract.body.kind === "multipart" || contract.body.kind === "binary") {
    if (await bodyExceeds(request, contract.body.maxBytes)) {
      return contractError(requestId, "BODY_TOO_LARGE", "Request body is too large", 413);
    }
    return null;
  }

  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    return contractError(requestId, "CONTENT_TYPE_INVALID", "Content-Type must be application/json", 400);
  }

  let raw: unknown;
  try {
    raw = await readJsonBody(request.clone(), contract.body.maxBytes);
  } catch (error) {
    if (error instanceof JsonBodyError) {
      return contractError(
        requestId,
        error.status === 413 ? "BODY_TOO_LARGE" : "BODY_MALFORMED",
        error.message,
        error.status,
      );
    }
    return contractError(requestId, "BODY_MALFORMED", "Invalid JSON body", 400);
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return contractError(requestId, "BODY_SCHEMA_INVALID", "JSON body must be an object", 400);
  }
  const allowedKeys = new Set(contract.body.allowedKeys);
  const unknownKeys = Object.keys(raw).filter((key) => !allowedKeys.has(key));
  if (unknownKeys.length > 0) {
    return contractError(requestId, "BODY_SCHEMA_INVALID", "Unknown request field", 400, unknownKeys);
  }
  return null;
}
