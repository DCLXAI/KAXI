import { createHash, randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import type { RagProvenance } from "@/lib/n8n/provenance";
import { preparePiiField } from "@/lib/privacy/pii";
import { retrievalConfidenceThreshold } from "@/lib/chat/retrieval-confidence";

type SupabaseErrorLike = {
  code?: string;
  message?: string;
};

export interface PersistedAttachmentInput {
  bucket: string;
  storageKey: string;
  name: string;
  size?: number;
  type: string;
  sha256: string;
}

export interface PersistChatExchangeInput {
  requestId: string;
  idempotencyKey: string;
  sessionKey: string;
  tenantId: string;
  locale: string;
  source: string;
  typebotResultId?: string;
  question: string;
  answer: string;
  riskLevel?: string;
  needsHuman?: boolean;
  leadStage?: string;
  nextStep?: string;
  attachments?: PersistedAttachmentInput[];
  executionId?: string;
  provenance: RagProvenance;
  sources?: unknown;
  searchMeta?: unknown;
  latencyMs?: number;
  status?: "completed" | "failed";
  errorCode?: string;
}

function configured(value: string | undefined) {
  const text = value?.trim() || "";
  if (!text || /^replace-with-/i.test(text)) return "";
  return text;
}

export function createSupabaseChatClient() {
  const url = configured(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = configured(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_CHAT_PERSISTENCE_NOT_CONFIGURED");
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function safeJson(value: unknown) {
  if (value === undefined) return null;
  return JSON.parse(JSON.stringify(value));
}

function errorCode(error: unknown) {
  return (error as SupabaseErrorLike | null)?.code || "";
}

function errorMessage(error: unknown) {
  return (error as SupabaseErrorLike | null)?.message || "";
}

function isMissingRelationError(error: unknown) {
  const code = errorCode(error);
  const message = errorMessage(error).toLowerCase();
  return code === "PGRST205" || code === "42P01" || message.includes("could not find the table");
}

function isMissingColumnError(error: unknown) {
  const code = errorCode(error);
  const message = errorMessage(error).toLowerCase();
  return (
    code === "42703" ||
    code === "PGRST204" ||
    message.includes("could not find the") ||
    message.includes("column") && message.includes("does not exist")
  );
}

function compactUndefined<T extends Record<string, unknown>>(record: T) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}

const CHAT_PRIVACY_COLUMNS = new Set([
  "question_ciphertext",
  "question_hash",
  "question_redacted",
  "answer_ciphertext",
  "answer_hash",
  "answer_redacted",
  "query_ciphertext",
  "query_hash",
  "query_redacted",
  "notes_ciphertext",
  "notes_hash",
  "notes_redacted",
  "source_chat_message_id",
]);

const N8N_AUDIT_PRIVACY_COLUMNS = new Set([
  "question_hash",
  "question_redacted",
  "answer_hash",
  "answer_redacted",
]);

function withoutChatPrivacyColumns<T extends Record<string, unknown>>(record: T) {
  return Object.fromEntries(Object.entries(record).filter(([key]) => !CHAT_PRIVACY_COLUMNS.has(key)));
}

function withoutN8nAuditPrivacyColumns<T extends Record<string, unknown>>(record: T) {
  return Object.fromEntries(Object.entries(record).filter(([key]) => !N8N_AUDIT_PRIVACY_COLUMNS.has(key)));
}

function protectConversationText(value: string, maxPlainLength: number) {
  return preparePiiField(value, { kind: "text", maxPlainLength });
}

export async function ensureChatSession(input: {
  sessionKey: string;
  tenantId?: string;
  locale?: string;
  source?: string;
  typebotResultId?: string;
  metadata?: unknown;
}) {
  const supabase = createSupabaseChatClient();
  const now = new Date().toISOString();
  const tenantId = input.tenantId || "default";
  const locale = input.locale || "ko";
  const source = input.source || "kaxi-site";
  const channel = source === "typebot" ? "typebot" : "kaxi-site";

  const updatePayload = compactUndefined({
    tenant_id: tenantId,
    locale,
    source,
    channel,
    typebot_result_id: input.typebotResultId || undefined,
    status: "active",
    last_message_at: now,
    metadata: input.metadata === undefined ? undefined : safeJson(input.metadata),
  });

  const updated = await supabase
    .from("chat_sessions")
    .update(updatePayload)
    .eq("session_key", input.sessionKey)
    .select("id")
    .maybeSingle();

  if (updated.error) {
    if (isMissingRelationError(updated.error)) return null;
    throw updated.error;
  }

  if (updated.data) return updated.data;

  const inserted = await supabase
    .from("chat_sessions")
    .insert({
      id: randomUUID(),
      session_key: input.sessionKey,
      tenant_id: tenantId,
      locale,
      source,
      channel,
      typebot_result_id: input.typebotResultId || null,
      status: "active",
      started_at: now,
      last_message_at: now,
      metadata: input.metadata === undefined ? null : safeJson(input.metadata),
    })
    .select("id")
    .single();

  if (inserted.error) {
    if (isMissingRelationError(inserted.error)) return null;
    if (inserted.error.code === "23505") {
      return ensureChatSession(input);
    }
    throw inserted.error;
  }

  return inserted.data;
}

export async function endChatSession(sessionKey: string) {
  const supabase = createSupabaseChatClient();
  const now = new Date().toISOString();
  const result = await supabase
    .from("chat_sessions")
    .update({ status: "ended", ended_at: now, last_message_at: now })
    .eq("session_key", sessionKey)
    .eq("source", "kaxi-site");
  if (result.error && !isMissingRelationError(result.error) && !isMissingColumnError(result.error)) {
    throw result.error;
  }
}

export async function persistChatAttachment(input: {
  sessionKey: string;
  tenantId?: string;
  locale?: string;
  source?: string;
  bucket: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  status?: string;
  metadata?: unknown;
}) {
  const supabase = createSupabaseChatClient();
  const session = await ensureChatSession({
    sessionKey: input.sessionKey,
    tenantId: input.tenantId,
    locale: input.locale,
    source: input.source,
  });

  if (!session) return null;

  const updatePayload = compactUndefined({
    session_id: input.sessionKey,
    bucket: input.bucket,
    original_name: input.originalName,
    mime_type: input.mimeType,
    size_bytes: input.sizeBytes,
    sha256: input.sha256,
    status: input.status || "quarantined",
    metadata: input.metadata === undefined ? undefined : safeJson(input.metadata),
  });

  const updated = await supabase
    .from("chat_attachments")
    .update(updatePayload)
    .eq("storage_key", input.storageKey)
    .select("id")
    .maybeSingle();

  if (updated.error) {
    if (isMissingRelationError(updated.error)) return null;
    throw updated.error;
  }

  if (updated.data) return updated.data;

  const inserted = await supabase
    .from("chat_attachments")
    .insert({
      id: randomUUID(),
      session_id: input.sessionKey,
      bucket: input.bucket,
      storage_key: input.storageKey,
      original_name: input.originalName,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
      sha256: input.sha256,
      status: input.status || "quarantined",
      metadata: input.metadata === undefined ? null : safeJson(input.metadata),
    })
    .select("id")
    .single();

  if (inserted.error) {
    if (isMissingRelationError(inserted.error)) return null;
    if (inserted.error.code === "23505") {
      return persistChatAttachment(input);
    }
    throw inserted.error;
  }

  return inserted.data;
}

async function linkAttachmentsToMessage(input: PersistChatExchangeInput, messageId: number | string) {
  const storageKeys = (input.attachments || []).map((attachment) => attachment.storageKey).filter(Boolean);
  if (storageKeys.length === 0) return;

  const supabase = createSupabaseChatClient();
  const linked = await supabase
    .from("chat_attachments")
    .update({ message_id: messageId })
    .eq("session_id", input.sessionKey)
    .in("storage_key", storageKeys);

  if (linked.error && !isMissingRelationError(linked.error)) {
    throw linked.error;
  }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function finiteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function persistRetrievalRun(input: PersistChatExchangeInput, messageId: number | string) {
  const supabase = createSupabaseChatClient();
  const searchMeta = record(input.searchMeta);
  const retrievedCount = Math.max(0, Math.trunc(finiteNumber(searchMeta.retrievedCount) || 0));
  const protectedQuery = protectConversationText(input.question, 1_200);
  const payload = {
    request_id: input.requestId,
    message_id: messageId,
    session_id: input.sessionKey,
    execution_id: input.executionId || null,
    workflow_id: input.provenance.workflowId,
    workflow_version_id: input.provenance.workflowVersionId,
    model_version: input.provenance.modelVersion,
    prompt_version: input.provenance.promptVersion,
    query: protectedQuery.plaintext || "",
    query_ciphertext: protectedQuery.ciphertext,
    query_hash: protectedQuery.hash,
    query_redacted: protectedQuery.redacted,
    retrieval_type: String(searchMeta.type || "hybrid"),
    category: String(searchMeta.category || "general"),
    similarity_threshold: retrievalConfidenceThreshold(searchMeta),
    top_score: finiteNumber(searchMeta.topScore),
    retrieved_count: retrievedCount,
    rejected_citation_count: Math.max(0, Math.trunc(finiteNumber(searchMeta.rejectedCitationCount) || 0)),
    no_context: searchMeta.noContext === true || retrievedCount === 0,
    no_context_reason: typeof searchMeta.noContextReason === "string" ? searchMeta.noContextReason : null,
    sources: safeJson(input.sources ?? []),
    search_meta: safeJson(searchMeta),
  };
  let result = await supabase.from("retrieval_runs").upsert(payload, { onConflict: "message_id" });
  if (result.error && isMissingColumnError(result.error)) {
    result = await supabase.from("retrieval_runs").upsert(withoutChatPrivacyColumns(payload), { onConflict: "message_id" });
  }
  if (result.error && !isMissingRelationError(result.error)) throw result.error;
}

async function persistN8nAuditMetadata(input: PersistChatExchangeInput, messageId: number | string) {
  const supabase = createSupabaseChatClient();
  const protectedQuestion = protectConversationText(input.question, 1_200);
  const protectedAnswer = protectConversationText(input.answer, 8_000);
  const payload = compactUndefined({
    execution_id: input.executionId || undefined,
    workflow_id: input.provenance.workflowId,
    workflow_version_id: input.provenance.workflowVersionId,
    model_version: input.provenance.modelVersion,
    prompt_version: input.provenance.promptVersion,
    source_chat_message_id: messageId,
    request_id: input.requestId,
    idempotency_key: input.idempotencyKey,
    session_id: input.sessionKey,
    tenant_id: input.tenantId,
    locale: input.locale,
    source: input.source,
    channel: input.source === "typebot" ? "typebot" : "kaxi-site",
    question: "[canonical-chat-message]",
    question_hash: protectedQuestion.hash,
    question_redacted: true,
    answer: "[canonical-chat-message]",
    answer_hash: protectedAnswer.hash,
    answer_redacted: true,
    risk_level: input.riskLevel || "low",
    needs_human: Boolean(input.needsHuman),
    lead_stage: input.leadStage,
    next_step: null,
    sources_json: "[]",
    audit_source: "kaxi-gateway",
  });

  let result = await supabase.from("n8n_audit_messages").insert(payload);
  if (result.error && isMissingColumnError(result.error)) {
    result = await supabase.from("n8n_audit_messages").insert(withoutN8nAuditPrivacyColumns(payload));
  }
  if (result.error?.code === "23505" || isMissingRelationError(result.error)) return;
  if (result.error) throw result.error;
}

async function persistN8nAuditMetadataBestEffort(input: PersistChatExchangeInput, messageId: number | string) {
  try {
    await persistN8nAuditMetadata(input, messageId);
  } catch (error) {
    console.error("[chat persistence] n8n audit metadata persistence failed", error);
  }
}

function completedTurn(input: PersistChatExchangeInput) {
  return (input.status || "completed") === "completed";
}

function handoffDedupeKey(input: Pick<PersistChatExchangeInput, "tenantId" | "sessionKey" | "question">) {
  const normalizedQuestion = input.question.trim().replace(/\s+/g, " ").toLowerCase();
  return createHash("sha256")
    .update(`${input.tenantId.toLowerCase()}\n${input.sessionKey.trim().toLowerCase()}\n${normalizedQuestion}`)
    .digest("hex");
}

export async function persistCanonicalHandoffTask(
  input: PersistChatExchangeInput & { messageId: number | string },
) {
  if (!completedTurn(input) || !input.needsHuman) return false;
  const supabase = createSupabaseChatClient();
  const protectedQuestion = protectConversationText(input.question, 1_200);
  const protectedAnswer = protectConversationText(input.answer, 8_000);
  const protectedNotes = protectConversationText(input.nextStep || "", 2_000);
  const payload = {
    source_chat_message_id: input.messageId,
    session_id: input.sessionKey,
    tenant_id: input.tenantId,
    question: protectedQuestion.plaintext || "[encrypted-chat-question]",
    question_ciphertext: protectedQuestion.ciphertext,
    question_hash: protectedQuestion.hash,
    question_redacted: protectedQuestion.redacted,
    answer: protectedAnswer.plaintext || "",
    answer_ciphertext: protectedAnswer.ciphertext,
    answer_hash: protectedAnswer.hash,
    answer_redacted: protectedAnswer.redacted,
    risk_level: input.riskLevel || "medium",
    lead_stage: input.leadStage || "review",
    status: "open",
    notes: protectedNotes.plaintext,
    notes_ciphertext: protectedNotes.ciphertext,
    notes_hash: protectedNotes.hash,
    notes_redacted: protectedNotes.redacted,
    dedupe_key: handoffDedupeKey(input),
  };

  let result = await supabase.from("handoff_tasks").insert(payload);
  if (result.error && isMissingColumnError(result.error)) {
    result = await supabase.from("handoff_tasks").insert(withoutChatPrivacyColumns(payload));
  }
  if (result.error && result.error.code !== "23505" && !isMissingRelationError(result.error)) {
    throw result.error;
  }
  return !result.error || result.error.code === "23505";
}

async function updateExistingChatExchange(
  input: PersistChatExchangeInput,
  existing: { id: number | string; status?: string | null; session_id?: string | null },
) {
  if (existing.session_id && existing.session_id !== input.sessionKey) {
    throw new Error("CHAT_IDEMPOTENCY_SESSION_MISMATCH");
  }
  const supabase = createSupabaseChatClient();
  const status = input.status || "completed";
  const protectedQuestion = protectConversationText(input.question, 1_200);
  const protectedAnswer = protectConversationText(input.answer, 8_000);

  if (status === "completed" || existing.status !== "completed") {
    const payload = compactUndefined({
      question: protectedQuestion.plaintext || "",
      question_ciphertext: protectedQuestion.ciphertext,
      question_hash: protectedQuestion.hash,
      question_redacted: protectedQuestion.redacted,
      answer: protectedAnswer.plaintext || "",
      answer_ciphertext: protectedAnswer.ciphertext,
      answer_hash: protectedAnswer.hash,
      answer_redacted: protectedAnswer.redacted,
      risk_level: input.riskLevel || "low",
      needs_human: Boolean(input.needsHuman),
      execution_id: input.executionId,
      workflow_id: input.provenance.workflowId,
      workflow_version_id: input.provenance.workflowVersionId,
      model_version: input.provenance.modelVersion,
      prompt_version: input.provenance.promptVersion,
      status,
      error_code: status === "completed" ? null : input.errorCode || "request_failed",
      lead_stage: input.leadStage,
      next_step: input.nextStep,
      latency_ms: input.latencyMs,
    });
    let updated = await supabase
      .from("chat_messages")
      .update(payload)
      .eq("id", existing.id);
    if (updated.error && isMissingColumnError(updated.error)) {
      updated = await supabase
        .from("chat_messages")
        .update(withoutChatPrivacyColumns(payload))
        .eq("id", existing.id);
    }
    if (updated.error && !isMissingRelationError(updated.error)) throw updated.error;
  }

  await linkAttachmentsToMessage(input, existing.id);
  if (completedTurn(input)) await persistRetrievalRun(input, existing.id);
  await persistN8nAuditMetadataBestEffort(input, existing.id);
  return { id: existing.id, mode: "canonical" as const, deduplicated: true };
}

export async function persistChatExchange(input: PersistChatExchangeInput) {
  const supabase = createSupabaseChatClient();
  await ensureChatSession({
    sessionKey: input.sessionKey,
    tenantId: input.tenantId,
    locale: input.locale,
    source: input.source,
    typebotResultId: input.typebotResultId,
  });
  const protectedQuestion = protectConversationText(input.question, 1_200);
  const protectedAnswer = protectConversationText(input.answer, 8_000);

  const existing = await supabase
    .from("chat_messages")
    .select("id,status,session_id")
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    return updateExistingChatExchange(input, existing.data);
  }

  const payload = compactUndefined({
    request_id: input.requestId,
    idempotency_key: input.idempotencyKey,
    session_id: input.sessionKey,
    tenant_id: input.tenantId,
    question: protectedQuestion.plaintext || "",
    question_ciphertext: protectedQuestion.ciphertext,
    question_hash: protectedQuestion.hash,
    question_redacted: protectedQuestion.redacted,
    answer: protectedAnswer.plaintext || "",
    answer_ciphertext: protectedAnswer.ciphertext,
    answer_hash: protectedAnswer.hash,
    answer_redacted: protectedAnswer.redacted,
    risk_level: input.riskLevel || "low",
    needs_human: Boolean(input.needsHuman),
    sources_json: "[]",
    locale: input.locale,
    source: input.source,
    channel: input.source === "typebot" ? "typebot" : "kaxi-site",
    execution_id: input.executionId,
    workflow_id: input.provenance.workflowId,
    workflow_version_id: input.provenance.workflowVersionId,
    model_version: input.provenance.modelVersion,
    prompt_version: input.provenance.promptVersion,
    status: input.status || "completed",
    error_code: input.status === "failed" ? input.errorCode || "request_failed" : null,
    n8n_request: null,
    n8n_response: null,
    sources: null,
    search_meta: null,
    lead_stage: input.leadStage,
    next_step: input.nextStep,
    latency_ms: input.latencyMs,
  });

  let inserted = await supabase.from("chat_messages").insert(payload).select("id").single();

  if (inserted.error && isMissingColumnError(inserted.error)) {
    inserted = await supabase
      .from("chat_messages")
      .insert(withoutChatPrivacyColumns(payload))
      .select("id")
      .single();
  }

  if (inserted.error) {
    if (inserted.error.code === "23505") {
      const raced = await supabase
        .from("chat_messages")
        .select("id,status,session_id")
        .eq("idempotency_key", input.idempotencyKey)
        .maybeSingle();
      if (raced.data) {
        return updateExistingChatExchange(input, raced.data);
      }
    }
    throw inserted.error;
  }

  await linkAttachmentsToMessage(input, inserted.data.id);
  if (completedTurn(input)) await persistRetrievalRun(input, inserted.data.id);
  await persistN8nAuditMetadataBestEffort(input, inserted.data.id);

  await supabase
    .from("chat_sessions")
    .update({ last_message_at: new Date().toISOString() })
    .eq("session_key", input.sessionKey)
    .then((result) => {
      if (result.error && !isMissingRelationError(result.error)) throw result.error;
    });

  return { id: inserted.data.id, mode: "canonical" as const, deduplicated: false };
}
