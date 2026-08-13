import { createHash } from "crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import type { PersistChatExchangeInput } from "@/lib/chat/persistence";
import { preparePiiField } from "@/lib/privacy/pii";
import { retrievalConfidenceThreshold } from "@/lib/chat/retrieval-confidence";
import { retrievalRunHasNoContext } from "@/lib/chat/persistence";
import { assertTenantContext } from "@/application/tenancy/tenant-context";
import {
  buildRetrievalPlanSnapshot,
  withRetrievalPlanMetadata,
} from "@/application/rag/retrieval-plan";

export interface AtomicChatTurnResult {
  id: bigint;
  mode: "canonical-transaction";
  deduplicated: boolean;
  handoffTaskPersisted: boolean;
  handoffTaskId: bigint | null;
  outboxEventId: string;
  persistenceAccepted: true;
}

export interface AtomicChatTurnFailureInjection {
  beforeRetrieval?: () => void | Promise<void>;
  beforeHandoff?: () => void | Promise<void>;
  beforeOutbox?: () => void | Promise<void>;
}

export interface AtomicChatTurnDependencies {
  client?: PrismaClient;
  failureInjection?: AtomicChatTurnFailureInjection;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function finiteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function json(value: unknown, fallback: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? fallback)) as Prisma.InputJsonValue;
}

function handoffDedupeKey(input: Pick<PersistChatExchangeInput, "tenantContext" | "sessionKey" | "question">) {
  const normalizedQuestion = input.question.trim().replace(/\s+/g, " ").toLowerCase();
  return createHash("sha256")
    .update(`${input.tenantContext.tenantId}\n${input.sessionKey.trim().toLowerCase()}\n${normalizedQuestion}`)
    .digest("hex");
}

function eventType(input: PersistChatExchangeInput) {
  return input.needsHuman ? "handoff.created" : "chat.turn.accepted";
}

/**
 * Commits the accepted chat turn as one PostgreSQL unit of work.
 *
 * The message upsert is the serialization point for concurrent retries of the
 * same idempotency key. Retrieval, attachment links, required handoff and the
 * outbox event are committed or rolled back with that row.
 */
export async function persistAtomicChatTurn(
  input: PersistChatExchangeInput & { traceId?: string },
  dependencies: AtomicChatTurnDependencies = {},
): Promise<AtomicChatTurnResult> {
  if ((input.status || "completed") !== "completed") {
    throw new Error("ATOMIC_CHAT_TURN_REQUIRES_COMPLETED_STATUS");
  }
  if (!input.idempotencyKey.trim()) throw new Error("CHAT_IDEMPOTENCY_KEY_REQUIRED");
  assertTenantContext(input.tenantContext);
  const tenantId = input.tenantContext.tenantId;

  const client = dependencies.client || db;
  return client.$transaction(async (tx) => {
    // Serialize retries of one logical turn before any read/write decisions.
    // Unlike process-local locks this works across Vercel instances and workers.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${tenantId}:${input.idempotencyKey}`}, 0))`;
    const now = new Date();
    const channel = input.source === "typebot" ? "typebot" : "kaxi-site";
    const question = preparePiiField(input.question, { kind: "text", maxPlainLength: 1_200 });
    const answer = preparePiiField(input.answer, { kind: "text", maxPlainLength: 8_000 });
    const notes = preparePiiField(input.nextStep || "", { kind: "text", maxPlainLength: 2_000 });
    const searchMeta = withRetrievalPlanMetadata(input.searchMeta, input.sources);
    const retrievalPlan = buildRetrievalPlanSnapshot(searchMeta, input.sources);
    const retrievedCount = Math.max(0, Math.trunc(finiteNumber(searchMeta.retrievedCount) || 0));

    await tx.chatSession.upsert({
      where: { tenantId_sessionKey: { tenantId, sessionKey: input.sessionKey } },
      create: {
        sessionKey: input.sessionKey,
        tenantId,
        locale: input.locale,
        source: input.source,
        channel,
        typebotResultId: input.typebotResultId || null,
        status: "active",
        lastMessageAt: now,
        metadata: input.sessionMetadata === undefined ? undefined : json(input.sessionMetadata, {}),
      },
      update: {
        locale: input.locale,
        source: input.source,
        channel,
        typebotResultId: input.typebotResultId || undefined,
        status: "active",
        lastMessageAt: now,
        metadata: input.sessionMetadata === undefined ? undefined : json(input.sessionMetadata, {}),
      },
    });

    const prior = await tx.chatMessage.findUnique({
      where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: input.idempotencyKey } },
      select: { id: true, sessionKey: true, questionHash: true, status: true },
    });
    if (prior && prior.sessionKey !== input.sessionKey) {
      throw new Error("CHAT_IDEMPOTENCY_SESSION_MISMATCH");
    }
    if (prior?.questionHash && question.hash && prior.questionHash !== question.hash) {
      throw new Error("CHAT_IDEMPOTENCY_PAYLOAD_MISMATCH");
    }

    const message = await tx.chatMessage.upsert({
      where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: input.idempotencyKey } },
      create: {
        requestId: input.requestId,
        idempotencyKey: input.idempotencyKey,
        sessionKey: input.sessionKey,
        tenantId,
        question: question.plaintext || "",
        questionCiphertext: question.ciphertext,
        questionHash: question.hash,
        questionRedacted: question.redacted,
        answer: answer.plaintext || "",
        answerCiphertext: answer.ciphertext,
        answerHash: answer.hash,
        answerRedacted: answer.redacted,
        riskLevel: input.riskLevel || "low",
        needsHuman: Boolean(input.needsHuman),
        sourcesJson: "[]",
        source: input.source,
        channel,
        locale: input.locale,
        executionId: input.executionId,
        workflowId: input.provenance.workflowId,
        workflowVersionId: input.provenance.workflowVersionId,
        modelVersion: input.provenance.modelVersion,
        promptVersion: input.provenance.promptVersion,
        status: "completed",
        errorCode: null,
        sources: json(input.sources, []),
        searchMeta: json(searchMeta, {}),
        leadStage: input.leadStage,
        nextStep: input.nextStep,
        latencyMs: input.latencyMs,
      },
      update: {
        answer: answer.plaintext || "",
        answerCiphertext: answer.ciphertext,
        answerHash: answer.hash,
        answerRedacted: answer.redacted,
        riskLevel: input.riskLevel || "low",
        needsHuman: Boolean(input.needsHuman),
        executionId: input.executionId,
        workflowId: input.provenance.workflowId,
        workflowVersionId: input.provenance.workflowVersionId,
        modelVersion: input.provenance.modelVersion,
        promptVersion: input.provenance.promptVersion,
        status: "completed",
        errorCode: null,
        sources: json(input.sources, []),
        searchMeta: json(searchMeta, {}),
        leadStage: input.leadStage,
        nextStep: input.nextStep,
        latencyMs: input.latencyMs,
      },
      select: { id: true },
    });

    const storageKeys = (input.attachments || []).map((attachment) => attachment.storageKey).filter(Boolean);
    if (storageKeys.length > 0) {
      await tx.chatAttachment.updateMany({
        where: { tenantId, sessionKey: input.sessionKey, storageKey: { in: storageKeys } },
        data: { messageId: message.id },
      });
    }

    await dependencies.failureInjection?.beforeRetrieval?.();
    await tx.retrievalRun.upsert({
      where: { messageId: message.id },
      create: {
        tenantId,
        requestId: input.requestId,
        messageId: message.id,
        sessionKey: input.sessionKey,
        executionId: input.executionId,
        workflowId: input.provenance.workflowId,
        workflowVersionId: input.provenance.workflowVersionId,
        modelVersion: input.provenance.modelVersion,
        promptVersion: input.provenance.promptVersion,
        query: question.plaintext || "",
        queryCiphertext: question.ciphertext,
        queryHash: question.hash,
        queryRedacted: question.redacted,
        retrievalType: String(searchMeta.type || "hybrid"),
        category: String(searchMeta.category || "general"),
        similarityThreshold: retrievalConfidenceThreshold(searchMeta),
        topScore: finiteNumber(searchMeta.topScore),
        retrievedCount,
        rejectedCitationCount: Math.max(0, Math.trunc(finiteNumber(searchMeta.rejectedCitationCount) || 0)),
        noContext: retrievalRunHasNoContext(searchMeta, retrievedCount),
        noContextReason: typeof searchMeta.noContextReason === "string" ? searchMeta.noContextReason : null,
        planVersion: retrievalPlan.planVersion,
        scoreVersion: retrievalPlan.scoreVersion,
        thresholdSet: retrievalPlan.thresholdSet,
        embeddingSource: retrievalPlan.embeddingSource,
        candidateCount: retrievalPlan.candidateCount,
        corpusSnapshotId: retrievalPlan.corpusSnapshotId,
        replaySpec: json(retrievalPlan.replaySpec, {}),
        sources: json(input.sources, []),
        searchMeta: json(searchMeta, {}),
      },
      update: {
        executionId: input.executionId,
        workflowId: input.provenance.workflowId,
        workflowVersionId: input.provenance.workflowVersionId,
        modelVersion: input.provenance.modelVersion,
        promptVersion: input.provenance.promptVersion,
        query: question.plaintext || "",
        queryCiphertext: question.ciphertext,
        queryHash: question.hash,
        queryRedacted: question.redacted,
        retrievalType: String(searchMeta.type || "hybrid"),
        category: String(searchMeta.category || "general"),
        similarityThreshold: retrievalConfidenceThreshold(searchMeta),
        topScore: finiteNumber(searchMeta.topScore),
        retrievedCount,
        rejectedCitationCount: Math.max(0, Math.trunc(finiteNumber(searchMeta.rejectedCitationCount) || 0)),
        noContext: retrievalRunHasNoContext(searchMeta, retrievedCount),
        noContextReason: typeof searchMeta.noContextReason === "string" ? searchMeta.noContextReason : null,
        planVersion: retrievalPlan.planVersion,
        scoreVersion: retrievalPlan.scoreVersion,
        thresholdSet: retrievalPlan.thresholdSet,
        embeddingSource: retrievalPlan.embeddingSource,
        candidateCount: retrievalPlan.candidateCount,
        corpusSnapshotId: retrievalPlan.corpusSnapshotId,
        replaySpec: json(retrievalPlan.replaySpec, {}),
        sources: json(input.sources, []),
        searchMeta: json(searchMeta, {}),
      },
    });

    let handoffTaskId: bigint | null = null;
    if (input.needsHuman) {
      await dependencies.failureInjection?.beforeHandoff?.();
      const dedupeKey = handoffDedupeKey(input);
      const existingTask = await tx.handoffTask.findFirst({
        where: {
          tenantId,
          dedupeKey,
          status: { in: ["open", "review", "contact_requested", "contact_received"] },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true },
      });
      const handoff = existingTask
        ? await tx.handoffTask.update({
            where: { id: existingTask.id },
            data: {
              sourceChatMessageId: message.id,
              question: question.plaintext || "[encrypted-chat-question]",
              questionCiphertext: question.ciphertext,
              questionHash: question.hash,
              questionRedacted: question.redacted,
              answer: answer.plaintext || "",
              answerCiphertext: answer.ciphertext,
              answerHash: answer.hash,
              answerRedacted: answer.redacted,
              notes: notes.plaintext,
              notesCiphertext: notes.ciphertext,
              notesHash: notes.hash,
              notesRedacted: notes.redacted,
              riskLevel: input.riskLevel || "medium",
              leadStage: input.leadStage || "review",
            },
            select: { id: true },
          })
        : await tx.handoffTask.create({
            data: {
              sourceChatMessageId: message.id,
              sessionKey: input.sessionKey,
              tenantId,
              question: question.plaintext || "[encrypted-chat-question]",
              questionCiphertext: question.ciphertext,
              questionHash: question.hash,
              questionRedacted: question.redacted,
              answer: answer.plaintext || "",
              answerCiphertext: answer.ciphertext,
              answerHash: answer.hash,
              answerRedacted: answer.redacted,
              riskLevel: input.riskLevel || "medium",
              leadStage: input.leadStage || "review",
              status: "open",
              notes: notes.plaintext,
              notesCiphertext: notes.ciphertext,
              notesHash: notes.hash,
              notesRedacted: notes.redacted,
              dedupeKey,
            },
            select: { id: true },
          });
      handoffTaskId = handoff.id;
    }

    await dependencies.failureInjection?.beforeOutbox?.();
    const nextEventType = eventType(input);
    const outbox = await tx.outboxEvent.upsert({
      where: {
        tenantId_eventType_idempotencyKey: {
          tenantId,
          eventType: nextEventType,
          idempotencyKey: input.idempotencyKey,
        },
      },
      create: {
        tenantId,
        requestId: input.requestId,
        aggregateType: input.needsHuman ? "handoff" : "chat",
        aggregateId: handoffTaskId?.toString() || message.id.toString(),
        eventType: nextEventType,
        idempotencyKey: input.idempotencyKey,
        messageId: message.id,
        traceId: input.traceId || input.requestId,
        payload: json({
          schemaVersion: 1,
          messageId: message.id.toString(),
          handoffTaskId: handoffTaskId?.toString() || null,
          source: input.source,
          channel,
          locale: input.locale,
          needsHuman: Boolean(input.needsHuman),
          riskLevel: input.riskLevel || "low",
        }, {}),
      },
      update: {
        requestId: input.requestId,
        aggregateId: handoffTaskId?.toString() || message.id.toString(),
        messageId: message.id,
        traceId: input.traceId || input.requestId,
      },
      select: { id: true },
    });

    return {
      id: message.id,
      mode: "canonical-transaction" as const,
      deduplicated: Boolean(prior),
      handoffTaskPersisted: Boolean(!input.needsHuman || handoffTaskId),
      handoffTaskId,
      outboxEventId: outbox.id,
      persistenceAccepted: true as const,
    };
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    maxWait: 5_000,
    timeout: 15_000,
  });
}
