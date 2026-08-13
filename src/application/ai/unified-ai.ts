import type { Lang } from "@/lib/i18n/translations";
import {
  decideUnifiedAiRoute,
  unifiedRouteLabel,
  type UnifiedAiCapability,
  type UnifiedAiRouteDecision,
  type UnifiedExpertMode,
} from "@/lib/ai/unified-router";
import { docsWorkspaceHref, DOCS_WORKSPACE_CTA_LABELS } from "@/lib/agent/meta";
import type { AgentSuggestion } from "@/components/agent/types";
import { guardAnswerFields } from "@/lib/chat/response-guardrail";
import { runActionAgentUseCase } from "@/application/ai/action-agent";
import { runExpertConsultUseCase } from "@/application/ai/expert-consult";
import type { AiRequestContext, ApplicationResult } from "@/application/ai/contracts";
import type { ObserveAiExecutionStage } from "@/application/ai/contracts";
import type { ApplicationAiRuntimeConfig } from "@/application/ai/runtime-config";

export interface RunUnifiedAiInput {
  context: AiRequestContext;
  question: string;
  history: Array<{ role: "user"; content: string }>;
  leadId: string | null;
  previousCapability?: UnifiedAiCapability | null;
  previousExpertMode?: UnifiedExpertMode | null;
}

export interface UnifiedAiDependencies {
  resolveStudentProfileId?: () => Promise<string | null>;
  runAction?: typeof runActionAgentUseCase;
  runExpert?: typeof runExpertConsultUseCase;
  reportProgress?: (stage: "routing" | "searching" | "generating" | "finalizing") => void;
  reportVerifiedDelta?: (delta: string) => void;
  runtimeConfig?: ApplicationAiRuntimeConfig;
  observeStage?: ObserveAiExecutionStage;
}

export type UnifiedAiOutput = Record<string, unknown> & {
  answer: string;
  routing: UnifiedAiRouteDecision;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function boolean(value: unknown): boolean {
  return value === true;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function supportedLang(value: unknown): Lang {
  return value === "vi" || value === "mn" || value === "en" ? value : "ko";
}

function expertMode(value: unknown): UnifiedExpertMode | null {
  return value === "general" || value === "visa" || value === "documents" || value === "appeal" || value === "business"
    ? value
    : null;
}

function previousCapability(value: unknown): UnifiedAiCapability | null {
  return value === "action" || value === "expert" ? value : null;
}

function humanReviewText(lang: Lang): string {
  return {
    ko: "개별 판단이나 대행이 필요한 사안으로, 검증된 전문가 확인이 필요합니다.",
    vi: "Trường hợp này cần đánh giá cá nhân hoặc đại diện, vì vậy cần chuyên gia đã xác minh kiểm tra.",
    mn: "Энэ тохиолдолд хувь хүний үнэлгээ эсвэл төлөөлөл шаардлагатай тул баталгаажсан мэргэжилтэн шалгах хэрэгтэй.",
    en: "This case needs individual assessment or representation, so a verified expert should review it.",
  }[lang];
}

function expertPlan(lang: Lang): string[] {
  return {
    ko: ["질문 안전 분류", "공식 문서 검색", "법적 경계 확인"],
    vi: ["Phân loại an toàn", "Tìm nguồn chính thức", "Kiểm tra ranh giới pháp lý"],
    mn: ["Аюулгүй ангилал", "Албан эх сурвалж хайх", "Хуулийн хязгаар шалгах"],
    en: ["Safety classification", "Official-source search", "Legal boundary check"],
  }[lang];
}

/**
 * Applies the shared chat guardrail to whichever delegate answered.
 *
 * Both branches expose `answer` at the top level and carry retrieval under
 * `meta.sources` / `meta.quality`, so one adapter covers them. When the
 * guardrail refuses, the sources go with the answer — shipping the documents
 * behind a refused claim would still present it as researched.
 */
function guardUnifiedResponse(delegated: unknown, question: string, lang: Lang) {
  const base = record(delegated);
  const meta = record(base.meta);
  const guarded = guardAnswerFields({
    answer: text(base.answer),
    sources: Array.isArray(meta.sources) ? meta.sources : [],
    searchMeta: meta.quality,
    question,
    locale: lang,
  });
  if (!guarded.intervened) return delegated;

  return {
    ...base,
    answer: guarded.answer,
    needsHumanExpert: true,
    meta: {
      ...meta,
      sources: guarded.sources,
      quality: guarded.searchMeta,
      sourceNotice: undefined,
      safetyFlags: [humanReviewText(lang)],
    },
  };
}

export function normalizeExpertResponse(
  raw: Record<string, unknown>,
  decision: UnifiedAiRouteDecision,
  lang: Lang,
  question: string,
  durationMs: number,
) {
  const docs = Array.isArray(raw.retrievedDocs) ? raw.retrievedDocs.map(record) : [];
  const retrieval = record(raw.retrieval);
  const methods = stringArray(retrieval.methods);
  const backend = text(raw.backend, "expert");
  const needsHumanExpert = boolean(raw.needsHumanExpert);
  const disclaimer = text(raw.disclaimer) || text(raw.sourceNotice);
  const sources = docs.map((doc) => {
    const sourceMeta = record(doc.sourceMeta);
    const ragMeta = record(doc.ragMeta);
    const source = text(doc.source, "KARXY knowledge");
    return {
      id: text(doc.id, text(doc.title, source)),
      title: text(doc.title, source),
      label: text(sourceMeta.label, source),
      url: text(sourceMeta.url) || null,
      kind: text(sourceMeta.owner) === "internal" ? "internal" : "knowledge",
      owner: text(sourceMeta.owner) || undefined,
      verifiedAt: text(sourceMeta.verifiedAt) || text(ragMeta.last_checked_at) || undefined,
      reviewAfter: text(sourceMeta.reviewAfter) || undefined,
      sourceType: text(sourceMeta.sourceType) || undefined,
      reviewStatus: text(sourceMeta.reviewStatus) || text(ragMeta.review_status) || undefined,
      checkedBy: text(sourceMeta.checkedBy) || text(ragMeta.checked_by) || undefined,
      basis: text(doc.basis) || undefined,
      excerpt: text(doc.excerpt) || undefined,
    };
  });
  const suggestions: AgentSuggestion[] = stringArray(raw.suggestedFollowups).map((prompt) => ({
    kind: "followup" as const,
    label: prompt,
    prompt,
  }));
  if (decision.mode === "documents") {
    // Detection order matters: D-10 must win before the D-(2|4) digit match so
    // that "D-10" never collapses to a study-visa track. E-7 is recognized next.
    let track: string | undefined;
    if (/d\s*-?\s*10/i.test(question)) {
      track = "D-10";
    } else if (/e\s*-?\s*7/i.test(question)) {
      track = "E-7";
    } else {
      const trackMatch = question.match(/d\s*-?\s*(2|4)/i);
      if (trackMatch) track = `D-${trackMatch[1]}`;
    }
    suggestions.unshift({
      kind: "documents" as const,
      label: DOCS_WORKSPACE_CTA_LABELS[lang],
      prompt: "",
      href: docsWorkspaceHref(track),
    });
  }

  return {
    answer: text(raw.answer),
    backend,
    toolResults: docs.length > 0
      ? [{
          tool: "search_knowledge",
          args: { mode: decision.mode || "general" },
          result: docs,
          summary: `${sources.length} official sources`,
          success: true,
        }]
      : [],
    iterations: 1,
    durationMs,
    grounded: docs.length > 0,
    routing: decision,
    expert: {
      mode: decision.mode || "general",
      needsHumanExpert,
      disclaimer,
      consultationQuestion: question,
    },
    needsHumanExpert,
    escalationCaseCreated: boolean(raw.escalationCaseCreated),
    meta: {
      summary: `${unifiedRouteLabel(lang, "expert")} · ${sources.length}`,
      plan: expertPlan(lang),
      sources,
      clarifyingQuestions: [],
      suggestions,
      safetyFlags: needsHumanExpert ? [humanReviewText(lang)] : [],
      sourceNotice: disclaimer || undefined,
      quality: {
        backend,
        grounded: docs.length > 0,
        toolCount: docs.length > 0 ? 1 : 0,
        officialSourceCount: sources.length,
        retrievalBackends: methods.length > 0 ? methods : [text(retrieval.backend, "none")],
        pgvectorResultCount: boolean(retrieval.pgvectorUsed) ? Number(retrieval.resultCount || 0) : 0,
        answerSource: backend === "official-summary" ? "official-summary" as const : "llm" as const,
        intentConfidence: backend === "official-summary" ? undefined : "high" as const,
        missingSlotCount: 0,
        durationMs,
      },
    },
  };
}

export async function runUnifiedAiUseCase(
  input: RunUnifiedAiInput,
  dependencies: UnifiedAiDependencies = {},
): Promise<ApplicationResult<UnifiedAiOutput>> {
  const decision = decideUnifiedAiRoute(input.question, {
    previousCapability: input.previousCapability,
    previousExpertMode: input.previousExpertMode,
  });
  dependencies.reportProgress?.("routing");
  const startedAt = Date.now();

  const delegated = decision.capability === "expert"
    ? await (dependencies.runExpert || runExpertConsultUseCase)({
        context: input.context,
        question: input.question,
        history: input.history,
        mode: decision.mode || "general",
      }, dependencies)
    : await (dependencies.runAction || runActionAgentUseCase)({
        context: input.context,
        question: input.question,
        history: input.history,
        leadId: input.leadId,
      }, dependencies);

  if (!delegated.ok) return delegated;

  const normalized = decision.capability === "expert"
    ? normalizeExpertResponse(
        record(delegated.value),
        decision,
        input.context.locale,
        input.question,
        Date.now() - startedAt,
      )
    : { ...delegated.value, routing: decision };

  return {
    ok: true,
    value: guardUnifiedResponse(
      normalized,
      input.question,
      input.context.locale,
    ) as UnifiedAiOutput,
  };
}
