import { createSupabaseChatClient } from "@/lib/chat/persistence";
import type { RagProvenance } from "@/lib/n8n/provenance";
import { readPiiField } from "@/lib/privacy/pii";

export type ChatHistorySource = {
  title?: string;
  source?: string;
  sourceUrl: string;
  checkedAt?: string;
};

export type ChatHistoryExchange = RagProvenance & {
  id: string;
  requestId: string;
  question: string;
  answer: string;
  status: "completed" | "failed";
  errorCode?: string;
  nextStep?: string;
  sources: ChatHistorySource[];
  createdAt: string;
};

export type ChatHistoryAttachment = {
  id: string;
  bucket: string;
  storageKey: string;
  name: string;
  size: number;
  type: string;
  sha256: string;
  status: "processing" | "ready" | "error";
  error?: string;
};

export type ChatSessionSnapshot = {
  messages: ChatHistoryExchange[];
  attachments: ChatHistoryAttachment[];
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown, maxLength: number) {
  if (typeof value === "string") return value.trim().slice(0, maxLength);
  if (typeof value === "number" && Number.isFinite(value)) return String(value).slice(0, maxLength);
  return "";
}

function storedProvenance(value: Record<string, unknown>): RagProvenance {
  return {
    workflowId: text(value.workflow_id, 200) || "legacy-unversioned",
    workflowVersionId: text(value.workflow_version_id, 200) || "legacy-unversioned",
    modelVersion: text(value.model_version, 200) || "legacy-unversioned",
    promptVersion: text(value.prompt_version, 200) || "legacy-unversioned",
  };
}

function parseLegacySources(value: unknown) {
  if (typeof value !== "string") return [];
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return [];
  }
}

export function normalizeChatHistorySources(value: unknown): ChatHistorySource[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 12).flatMap((item) => {
    const source = record(item);
    const sourceUrl = text(source.sourceUrl ?? source.source_url ?? source.url, 2_000);
    if (!sourceUrl.startsWith("https://")) return [];

    return [{
      title: text(source.title, 240) || undefined,
      source: text(source.source, 240) || undefined,
      sourceUrl,
      checkedAt: text(source.checkedAt ?? source.checked_at, 80) || undefined,
    }];
  }).slice(0, 3);
}

function attachmentState(status: string, processingStatus: string) {
  if (status === "ready" && processingStatus === "completed") return "ready" as const;
  if (processingStatus === "failed") return "error" as const;
  return "processing" as const;
}

export async function loadChatSessionSnapshot(
  sessionKey: string,
  options: {
    messageLimit?: number;
    attachmentLimit?: number;
    source?: "kaxi-site" | "typebot";
  } = {},
): Promise<ChatSessionSnapshot | null> {
  const messageLimit = Math.min(50, Math.max(1, Math.trunc(options.messageLimit || 20)));
  const attachmentLimit = Math.min(3, Math.max(1, Math.trunc(options.attachmentLimit || 3)));
  const source = options.source === "typebot" ? "typebot" : "kaxi-site";
  const channel = source;
  const supabase = createSupabaseChatClient();
  const session = await supabase
    .from("chat_sessions")
    .select("id")
    .eq("session_key", sessionKey)
    .eq("source", source)
    .eq("channel", channel)
    .is("deleted_at", null)
    .maybeSingle();
  if (session.error) throw session.error;
  if (!session.data) return null;

  const messagesResult = await supabase
    .from("chat_messages")
    .select("id,request_id,question,question_ciphertext,answer,answer_ciphertext,status,error_code,next_step,sources,sources_json,workflow_id,workflow_version_id,model_version,prompt_version,created_at")
    .eq("session_id", sessionKey)
    .eq("source", source)
    .eq("channel", channel)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(messageLimit);
  if (messagesResult.error) throw messagesResult.error;

  const messageRows = (messagesResult.data || []).map(record);
  const messageIds = messageRows.map((message) => text(message.id, 40)).filter(Boolean);
  const retrievalByMessageId = new Map<string, unknown>();
  if (messageIds.length > 0) {
    const retrievals = await supabase
      .from("retrieval_runs")
      .select("message_id,sources")
      .in("message_id", messageIds);
    if (retrievals.error) throw retrievals.error;
    for (const row of retrievals.data || []) {
      const retrieval = record(row);
      retrievalByMessageId.set(text(retrieval.message_id, 40), retrieval.sources);
    }
  }

  const attachmentsResult = await supabase
    .from("chat_attachments")
    .select("id,message_id,bucket,storage_key,original_name,size_bytes,mime_type,sha256,status,processing_status,created_at")
    .eq("session_id", sessionKey)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(Math.max(12, attachmentLimit * 4));
  if (attachmentsResult.error) throw attachmentsResult.error;

  const messageStatusById = new Map(
    messageRows.map((message) => [text(message.id, 40), text(message.status, 40)]),
  );
  const attachmentRows = (attachmentsResult.data || [])
    .map(record)
    .filter((attachment) => {
      const messageId = text(attachment.message_id, 40);
      return !messageId || (
        messageStatusById.has(messageId)
        && messageStatusById.get(messageId) !== "completed"
      );
    })
    .slice(0, attachmentLimit);

  const messages = messageRows.reverse().flatMap((message): ChatHistoryExchange[] => {
    const question = readPiiField(
      text(message.question, 8_000),
      text(message.question_ciphertext, 32_000),
    )?.trim() || "";
    if (!question) return [];
    const answer = readPiiField(
      text(message.answer, 16_000),
      text(message.answer_ciphertext, 64_000),
    )?.trim() || "";
    const messageId = text(message.id, 40);
    const rawSources = retrievalByMessageId.get(messageId)
      ?? message.sources
      ?? parseLegacySources(message.sources_json);

    return [{
      id: messageId,
      requestId: text(message.request_id, 80),
      question,
      answer,
      status: message.status === "completed" ? "completed" : "failed",
      errorCode: text(message.error_code, 120) || undefined,
      nextStep: text(message.next_step, 2_000) || undefined,
      sources: normalizeChatHistorySources(rawSources),
      ...storedProvenance(message),
      createdAt: text(message.created_at, 80),
    }];
  });

  const attachments = attachmentRows.reverse().map((attachment): ChatHistoryAttachment => {
    const status = attachmentState(
      text(attachment.status, 40),
      text(attachment.processing_status, 40),
    );
    return {
      id: text(attachment.id, 120),
      bucket: text(attachment.bucket, 120),
      storageKey: text(attachment.storage_key, 1_000),
      name: text(attachment.original_name, 240),
      size: Math.max(0, Number(attachment.size_bytes) || 0),
      type: text(attachment.mime_type, 120),
      sha256: text(attachment.sha256, 80),
      status,
      error: status === "error" ? "첨부 내용을 읽지 못했습니다." : undefined,
    };
  });

  return { messages, attachments };
}
