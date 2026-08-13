import type { ChatCategory } from "@/lib/chat/category";
import {
  runDirectRagFallback,
  type DirectLexicalFallbackInput,
  type DirectLexicalResponse,
  type DirectRagDependencies,
} from "@/lib/chat/direct-lexical-fallback";
import type { QuestionConversationTurn, QuestionMediation } from "@/lib/chat/question-mediator";
import { applyChatResponseGuardrail } from "@/lib/chat/response-guardrail";
import type { SessionProfile } from "@/lib/chat/session-profile";
import {
  ApplicationExecutionError,
  applicationError,
  assertExecutionActive,
  type AiRequestContext,
  type ApplicationResult,
} from "@/application/ai/contracts";

export interface RunRagAnswerInput {
  context: AiRequestContext;
  question: string;
  retrievalQuery?: string;
  category: ChatCategory;
  fallbackReason: string;
  attachmentCount?: number;
  allowStoredVectorExpansion?: boolean;
  requireOpenAiEmbedding?: boolean;
  mediation?: QuestionMediation;
  conversationHistory?: QuestionConversationTurn[];
  profile?: SessionProfile;
}

export interface RagAnswerUseCaseOutput extends DirectLexicalResponse {
  applicationContract: {
    policyVersion: "rag-answer@v1";
    persistence: {
      owner: "kaxi-gateway";
      state: "pending";
    };
  };
}

export interface RagAnswerUseCaseDependencies extends DirectRagDependencies {
  runDirect?: (
    input: DirectLexicalFallbackInput,
    dependencies: DirectRagDependencies,
  ) => Promise<DirectLexicalResponse>;
  guardResponse?: typeof applyChatResponseGuardrail;
  observeStage?: <T>(
    stage:
      | "retrieval_generation"
      | "retrieval.vector_embedding"
      | "retrieval.lexical_vector"
      | "retrieval.rerank"
      | "answer_provider_attempt"
      | "guardrail",
    run: () => Promise<T>,
  ) => Promise<T>;
}

export async function runRagAnswerUseCase(
  input: RunRagAnswerInput,
  dependencies: RagAnswerUseCaseDependencies = {},
): Promise<ApplicationResult<RagAnswerUseCaseOutput>> {
  try {
    assertExecutionActive(input.context);
    const observe = dependencies.observeStage || (async <T>(_stage: string, run: () => Promise<T>) => run());
    const direct = await observe("retrieval_generation", () => (dependencies.runDirect || runDirectRagFallback)({
      question: input.question,
      retrievalQuery: input.retrievalQuery,
      category: input.category,
      locale: input.context.locale,
      tenantId: input.context.tenantContext.tenantId,
      requestId: input.context.requestId,
      fallbackReason: input.fallbackReason,
      attachmentCount: input.attachmentCount,
      allowStoredVectorExpansion: input.allowStoredVectorExpansion,
      requireOpenAiEmbedding: input.requireOpenAiEmbedding,
      mediation: input.mediation,
      conversationHistory: input.conversationHistory,
      profile: input.profile,
    }, {
      ...dependencies,
      observeDirectStage: (stage, run) => observe(
        stage === "answer_provider_attempt" ? stage : `retrieval.${stage}`,
        run,
      ),
    }));
    assertExecutionActive(input.context);

    const reviewed = input.mediation?.needsHumanReview
      ? {
          ...direct,
          needsHuman: true,
          riskLevel: direct.riskLevel === "high" ? "high" : "medium",
          leadStage: direct.riskLevel === "high" ? "urgent" : "review",
        }
      : direct;
    const guarded = await observe("guardrail", async () =>
      (dependencies.guardResponse || applyChatResponseGuardrail)(
        reviewed,
        input.question,
        input.context.locale,
      ));

    return {
      ok: true,
      value: {
        ...direct,
        ...guarded,
        runtimePath: direct.runtimePath,
        applicationContract: {
          policyVersion: "rag-answer@v1",
          persistence: { owner: "kaxi-gateway", state: "pending" },
        },
      },
    };
  } catch (error) {
    if (error instanceof ApplicationExecutionError) {
      return applicationError(error.code, error.message);
    }
    const message = error instanceof Error ? error.message : "RAG core unavailable";
    const retrievalUnavailable = message.startsWith("OPENAI_QUERY_EMBEDDING_REQUIRED")
      || message.startsWith("DIRECT_RAG_RPC_FAILED");
    return applicationError(
      retrievalUnavailable ? "retrieval_unavailable" : "internal_error",
      retrievalUnavailable ? "RAG retrieval unavailable" : "RAG core unavailable",
      { detail: message.slice(0, 500), retryable: true },
    );
  }
}
