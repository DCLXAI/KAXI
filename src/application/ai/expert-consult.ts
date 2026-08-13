import {
  buildRagBasisNotice,
  getEffectiveSourceMetadata,
  getRagDocumentMetadata,
  pickLangText,
  type KnowledgeDoc,
} from "@/lib/data/knowledge";
import type { Lang } from "@/lib/i18n/translations";
import { db } from "@/lib/db";
import { getConsultBackend, shouldRequireConsultLlm } from "@/lib/ai/backend-selector";
import { generateLlmText, getLlmModel, isLlmNotConfiguredError, type LlmGatewayMessage } from "@/lib/ai/llm-gateway";
import { searchSharedOpenAiRag } from "@/lib/chat/shared-openai-rag";
import { canPersistChatQuestion, protectChatQuestion } from "@/lib/privacy/chat-log";
import { withImmigrationLegalBasisDocs } from "@/lib/knowledge/legal-basis";
import { ensureGroundedCitationAnswer } from "@/lib/knowledge/citations";
import { withTimeout } from "@/lib/runtime/config";
import { maybeCreateHighRiskEscalationCase } from "@/lib/cases/high-risk-hook";
import { reportLlmFallback } from "@/lib/ops/llm-fallback-events";
import { buildOfficialSummaryLead } from "@/lib/chat/official-summary-lead";
import { guardAnswerFields } from "@/lib/chat/response-guardrail";
import {
  ApplicationExecutionError,
  applicationError,
  assertExecutionActive,
  type AiRequestContext,
  type ObserveAiExecutionStage,
  type ApplicationResult,
} from "@/application/ai/contracts";
import {
  DEFAULT_APPLICATION_AI_RUNTIME_CONFIG,
  type ApplicationAiRuntimeConfig,
} from "@/application/ai/runtime-config";

export type ExpertMode = "general" | "visa" | "documents" | "appeal" | "business";

export interface RunExpertConsultInput {
  context: AiRequestContext;
  question: string;
  history: Array<{ role: "user"; content: string }>;
  mode: ExpertMode;
}

export interface ExpertConsultDependencies {
  resolveStudentProfileId?: () => Promise<string | null>;
  reportProgress?: (stage: "searching" | "generating" | "finalizing") => void;
  reportVerifiedDelta?: (delta: string) => void;
  runtimeConfig?: ApplicationAiRuntimeConfig;
  observeStage?: ObserveAiExecutionStage;
}

export interface ExpertConsultOutput {
  answer: string;
  disclaimer: string;
  retrievedDocs: Array<{
    id: string;
    title: string;
    category: string;
    source: string;
    sourceMeta: ReturnType<typeof getEffectiveSourceMetadata>;
    ragMeta: ReturnType<typeof getRagDocumentMetadata>;
    basis: string;
    excerpt: string;
  }>;
  suggestedFollowups: string[];
  needsHumanExpert: boolean;
  escalationCaseCreated: boolean;
  backend: string;
  model: string | null;
  sourceNotice: string;
  searchMeta: Array<{
    id: string;
    title: string;
    score: number;
    vectorScore: number | null;
    keywordScore: number | null;
    method: string;
    category: string;
    docSource: string;
  }>;
  retrieval: Awaited<ReturnType<typeof searchSharedOpenAiRag>>["retrieval"];
}

class LlmBackendUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmBackendUnavailableError";
  }
}

interface ExpertAnswerResult {
  answer: string;
  disclaimer: string;
  suggestedFollowups: string[];
  needsHumanExpert: boolean;
  backend: string;
  durationMs?: number;
}

function consultDisclaimer(lang: Lang): string {
  return {
    ko: "⚠️ 본 답변은 공식 정보 기반 일반 안내입니다. 개별 사례의 비자 발급 가능성 판단, 서류 작성 대행, 행정기관 제출 대행은 행정사 상담을 권장합니다.",
    vi: "⚠️ Đây là hướng dẫn chung dựa trên nguồn chính thức. Quyết định visa cá nhân, soạn hồ sơ hoặc nộp thay nên được tư vấn bởi chuyên gia hành chính.",
    mn: "⚠️ Энэ нь албан эх сурвалжид үндэслэсэн ерөнхий мэдээлэл юм. Визийн тусгай шийдвэр, баримт бичиг бэлтгэх, төлөөлөн гаргах асуудалд мэргэжлийн зөвлөгөө авна уу.",
    en: "⚠️ This is general guidance based on official sources. Individual visa decisions, document drafting, and agency submission should be reviewed by an administrative scrivener.",
  }[lang];
}

function compactBasisText(value: string, max = 220): string {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function checkedLabel(lang: Lang, checkedAt: string): string {
  return {
    ko: `확인일 ${checkedAt}`,
    vi: `kiểm tra ${checkedAt}`,
    mn: `шалгасан ${checkedAt}`,
    en: `checked ${checkedAt}`,
  }[lang];
}

// When the answer LLM is unavailable this fallback is the whole answer, so its
// scaffolding has to speak the user's language too. The document excerpts and
// buildRagBasisNotice() were already localized; the heading, the labels and the
// "verify the original before filing" paragraph were not, which left a
// Vietnamese reader with Vietnamese content wrapped in Korean chrome exactly
// when the product was already degraded.
const OUTAGE_SUMMARY_COPY: Record<Lang, {
  heading: string;
  intro: string;
  source: string;
  checked: string;
}> = {
  ko: {
    heading: "공식 근거 기반 요약",
    intro:
      "검색된 승인 문서를 기준으로 질문과 가까운 근거를 먼저 정리했습니다. 개별 체류 이력, 학교 상태, 만료일, 재정 상황에 따라 요구 서류가 달라질 수 있으므로 접수 전 원문 확인과 행정사 검토가 필요합니다.",
    source: "출처",
    checked: "확인일",
  },
  vi: {
    heading: "Tóm tắt dựa trên căn cứ chính thức",
    intro:
      "Chúng tôi sắp xếp trước những căn cứ gần nhất với câu hỏi, dựa trên các tài liệu đã được phê duyệt. Hồ sơ yêu cầu có thể khác nhau tùy lịch sử lưu trú, tình trạng trường, ngày hết hạn và điều kiện tài chính, nên cần đối chiếu bản gốc và nhờ chuyên gia hành chính kiểm tra trước khi nộp.",
    source: "Nguồn",
    checked: "Ngày kiểm tra",
  },
  mn: {
    heading: "Албан эх сурвалжид үндэслэсэн хураангуй",
    intro:
      "Батлагдсан баримтуудаас асуултад хамгийн нийцэх үндэслэлүүдийг эхэлж эмхэтгэв. Оршин суух түүх, сургуулийн байдал, хүчинтэй хугацаа, санхүүгийн нөхцөлөөс шалтгаалан шаардах баримт өөр байж болох тул мэдүүлэхээс өмнө эх бичгийг шалгаж, мэргэжлийн зөвлөгөө авна уу.",
    source: "Эх сурвалж",
    checked: "Шалгасан өдөр",
  },
  en: {
    heading: "Summary based on official sources",
    intro:
      "These are the approved documents closest to your question, ordered by relevance. Required paperwork can differ with your stay history, school status, expiry date, and finances, so check the originals and have an administrative scrivener review them before filing.",
    source: "Source",
    checked: "Checked",
  },
};

function buildAnswerBasis(doc: KnowledgeDoc, lang: Lang): string {
  const meta = getRagDocumentMetadata(doc, lang);
  const excerpt = compactBasisText(pickLangText(doc.content, lang));
  return `${excerpt} (${checkedLabel(lang, meta.last_checked_at)})`;
}

export async function runExpertConsultUseCase(
  input: RunExpertConsultInput,
  dependencies: ExpertConsultDependencies = {},
): Promise<ApplicationResult<ExpertConsultOutput>> {
  const runtimeConfig = dependencies.runtimeConfig || DEFAULT_APPLICATION_AI_RUNTIME_CONFIG;
  const observe = dependencies.observeStage || (async <T>(_stage: string, run: () => Promise<T>) => run());
  const { question, history, mode } = input;
  const lang = input.context.locale;

  try {
    assertExecutionActive(input.context);
    dependencies.reportProgress?.("searching");
    const category = mode === "documents"
      ? "documents"
      : mode === "visa" || mode === "appeal" ? "visa" : undefined;
    const sharedRag = await observe("retrieval", () => searchSharedOpenAiRag({
      query: question,
      locale: lang,
      tenantContext: input.context.tenantContext,
      category,
      maxDocuments: 6,
    }));
    assertExecutionActive(input.context);

    const searchMeta = sharedRag.search.documents.map((document) => ({
      id: document.id,
      title: document.title,
      score: Number(document.rerankScore.toFixed(3)),
      vectorScore: document.vectorScore === null ? null : Number(document.vectorScore.toFixed(3)),
      keywordScore: document.keywordScore === null ? null : Number(document.keywordScore.toFixed(3)),
      method: "openai-pgvector",
      category: document.category,
      docSource: document.source,
    }));
    const retrieval = sharedRag.retrieval;
    const docs: KnowledgeDoc[] = withImmigrationLegalBasisDocs(
      question,
      sharedRag.docs,
      { mode, maxDocs: 8, minRetrievedDocs: Math.min(5, sharedRag.docs.length) },
    );
    const sourceNotice = buildRagBasisNotice(lang, docs);
    if (docs.length > 0) {
      dependencies.reportVerifiedDelta?.({
        ko: `승인된 공식 근거 ${docs.length}건을 확인했습니다.\n`,
        vi: `Đã xác minh ${docs.length} nguồn chính thức được phê duyệt.\n`,
        mn: `${docs.length} батлагдсан албан эх сурвалжийг шалгалаа.\n`,
        en: `Verified ${docs.length} approved official source(s).\n`,
      }[lang]);
    }

    dependencies.reportProgress?.("generating");
    const result = await observe("provider_attempt", () => withTimeout(
      generateExpertAnswer(question, lang, docs, history, mode),
      runtimeConfig.expertLlmTimeoutMs,
      "Expert LLM generation",
    ));
    assertExecutionActive(input.context);
    dependencies.reportProgress?.("finalizing");

    const guarded = await observe("guardrail", async () => {
      const cited = ensureGroundedCitationAnswer({
        answer: result.answer,
        docs,
        lang,
        sourceNotice,
        maxSources: 8,
      });
      return guardAnswerFields({
        answer: cited.answer,
        sources: docs,
        searchMeta,
        question,
        locale: lang,
        grounded: cited.grounded,
      });
    });
    const answer = guarded.answer;
    const guardrailIntervened = guarded.intervened;

    await observe("persistence", async () => {
      try {
        if (canPersistChatQuestion(question)) {
          await db.chatLog.create({
          data: {
            lang,
            ...protectChatQuestion(question),
            answer,
            source: "expert",
            retrievedDocs: JSON.stringify({
              docIds: docs.map((document) => document.id),
              searchMeta,
              retrieval,
              mode,
              expert: true,
              backend: result.backend,
              sourceNotice,
              requestId: input.context.requestId,
              traceId: input.context.traceId,
            }),
          },
          });
        }
      } catch (error) {
        console.error("[ChatLog save error]", error);
      }
    });

    let escalationCaseCreated = false;
    if (result.needsHumanExpert) {
      try {
        const studentProfileId = await dependencies.resolveStudentProfileId?.() || null;
        const created = await maybeCreateHighRiskEscalationCase({
          studentProfileId,
          category: `consult:${mode}`,
          summary: "전문 상담 고위험/행정사 검토 필요 판정",
          conversationSummary: question,
          ruleSnapshot: {
            mode,
            backend: result.backend,
            docIds: docs.map((document) => document.id),
            sourceNotice,
            retrieval,
          },
          aiDraft: answer,
          source: "consult",
        });
        escalationCaseCreated = Boolean(created);
      } catch (error) {
        console.warn("[consult high-risk escalation skipped]", error instanceof Error ? error.message : error);
      }
    }

    return {
      ok: true,
      value: {
        answer,
        disclaimer: result.disclaimer,
        retrievedDocs: (guardrailIntervened ? [] : docs).map((document) => ({
          id: document.id,
          title: pickLangText(document.title, lang),
          category: document.category,
          source: document.source,
          sourceMeta: getEffectiveSourceMetadata(document, lang),
          ragMeta: getRagDocumentMetadata(document, lang),
          basis: buildAnswerBasis(document, lang),
          excerpt: pickLangText(document.content, lang).replace(/\s+/g, " ").trim().slice(0, 260),
        })),
        suggestedFollowups: result.suggestedFollowups,
        needsHumanExpert: result.needsHumanExpert || guarded.needsHuman,
        escalationCaseCreated,
        backend: result.backend,
        model: ["openai", "anthropic", "kimi", "claude"].includes(result.backend) ? getLlmModel() : null,
        sourceNotice,
        searchMeta,
        retrieval,
      },
    };
  } catch (error) {
    if (error instanceof ApplicationExecutionError) {
      return applicationError(error.code, error.message);
    }
    if (error instanceof LlmBackendUnavailableError) {
      return applicationError(
        "llm_unavailable",
        "The configured LLM gateway is unavailable. Official-summary fallback is disabled for this deployment.",
        { detail: error.message.slice(0, 500), retryable: true },
      );
    }
    if (error instanceof Error && (
      error.message.startsWith("OPENAI_QUERY_EMBEDDING_REQUIRED")
      || error.message.startsWith("DIRECT_RAG_RPC_FAILED")
    )) {
      return applicationError(
        "retrieval_unavailable",
        "The shared OpenAI pgvector retrieval service is unavailable. A lower-quality fallback was not used.",
        { retryable: true },
      );
    }
    console.error("[runExpertConsultUseCase]", error);
    return applicationError("internal_error", "Internal error", { retryable: true });
  }
}

async function generateExpertAnswer(
  question: string,
  lang: Lang,
  docs: KnowledgeDoc[],
  history: { role: string; content: string }[],
  mode: string
): Promise<ExpertAnswerResult> {
  const langName = { ko: "Korean", vi: "Vietnamese", mn: "Mongolian", en: "English" }[lang];

  // 모드별 전문 영역 설정
  const modeConfig = {
    general: {
      role: "행정사·유학 전문 컨설턴트",
      focus: "비자, 체류, 서류, 학교, 비용 등 전반",
    },
    visa: {
      role: "비자·체류자격 전문 행정사",
      focus: "D-2, D-4 비자 발급/연장/변경, 체류자격 변경",
    },
    documents: {
      role: "서류·증빙 전문 행정사",
      focus: "표준입학허가서, 재정증빙, 결핵진단서, 번역공증",
    },
    appeal: {
      role: "비자 거절 대응 전문 행정사",
      focus: "거절 사유 분석, 재신청, 이의신청",
    },
    business: {
      role: "유학원 운영·컴플라이언스 전문가",
      focus: "유학원 등록, 직업안정법, 행정사법 컴플라이언스",
    },
  }[mode] || { role: "행정사·유학 전문 컨설턴트", focus: "전반" };

  // 위험 신호 감지 (허위서류, 불법취업 등)
  const dangerSignals = detectDangerSignals(question);
  const needsHumanExpert = checkNeedsHumanExpert(question, dangerSignals);

  const context = docs.length > 0
    ? docs
        .map((d, i) => {
          const meta = getRagDocumentMetadata(d, lang);
          return [
            `[문서 ${i + 1}] ${pickLangText(d.title, lang)}`,
            `주석 번호: [${i + 1}]`,
            `출처: ${d.source} <${meta.source_url}>`,
            `확인일: ${meta.last_checked_at}, 검수상태: ${meta.review_status}`,
            pickLangText(d.content, lang),
          ].join("\n");
        })
        .join("\n\n---\n\n")
    : "(관련 공식 문서가 검색되지 않음 — 일반 지식으로 답변시 명확히 표시)";

  const systemPrompt = `당신은 KARXY의 ${modeConfig.role}입니다. 한국 유학 준비생에게 전문적이고 정확한 행정·법률 정보를 제공합니다.

## 전문 영역
${modeConfig.focus}

## 핵심 원칙
1. **정확성 최우선**: 제공된 공식 문서만 근거로 답변. 추측 금지.
2. **법적 경계 명확화**:
   - 개별 사례의 비자 발급 가능성 판단 ❌ (불가)
   - 구체적 서류 작성 대행 ❌ (불가)
   - 행정기관 제출 대행 ❌ (불가)
   - 이런 경우 "행정사 상담이 필요합니다"라고 명시
3. **법령 우선 해석**: 비자·체류·출입국 답변은 출입국관리법 → 출입국관리법 시행령(체류자격 별표) → 출입국관리법 시행규칙(첨부서류·수수료) → 하이코리아/매뉴얼 순서로 해석. 법령 근거가 검색되지 않으면 확정 답변 금지.
4. **위험 신호 감지**: 허위서류, 불법취업, 비자 보장 약속 등 감지시 즉시 경고
5. **다국어 답변**: 사용자 언어(${langName})로 답변
6. **실용적 구조**:
   - 핵심 답변 (2-3문장)
   - 관련 법령/규정 근거 (조문·별표·확인일 먼저)
   - 필요한 경우 단계별 절차
   - 주의사항
   - 출처 표기

## 위험 신호 감지 결과
${dangerSignals.length > 0 ? "⚠️ 감지된 위험 신호:\n" + dangerSignals.map(s => `- ${s}`).join("\n") : "✓ 위험 신호 없음"}

## 검색된 공식 문서 (RAG)
${context}

## 응답 형식
- 마크다운 사용 (## 소제목, **굵게**, - 리스트)
- 간결하되 전문적 (3~8문단)
- 법령/규정 인용시 정확한 조문 표기
- 사실·법령·요건·절차를 단정하는 문장 뒤에는 반드시 [1], [2]처럼 근거 주석을 붙임
- 주석 번호는 검색된 공식 문서의 [문서 N] 번호와 일치해야 하며, 근거가 없는 단정은 하지 않음
- 출처를 답변 끝에 "📚 출처:" 로 표기
- 답변 마지막에는 다음 출처 기준 문장을 그대로 포함: "${buildRagBasisNotice(lang, docs)}"
- ${needsHumanExpert ? "⚠️ 이 사례는 반드시 행정사 상담이 필요합니다. 답변 끝에 권유하세요." : ""}`;

  const messages: LlmGatewayMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.slice(-6).map((h) => ({
      role: h.role === "user" ? ("user" as const) : ("assistant" as const),
      content: h.content,
    })),
    { role: "user", content: question },
  ];

  const suggestedFollowups = generateFollowups(question, lang, mode);
  const sourceNotice = buildRagBasisNotice(lang, docs);
  const disclaimer = [sourceNotice, consultDisclaimer(lang)].filter(Boolean).join(" ");
  const consultBackend = getConsultBackend();

  try {
    const completion = await generateLlmText({
      feature: "consult",
      messages,
      temperature: 0.2,
      maxTokens: 1500,
      expectLongResponse: true,
    });
    const answer = completion.text || "";

    return {
      answer,
      disclaimer,
      suggestedFollowups,
      needsHumanExpert,
      backend: completion.backend,
      durationMs: completion.durationMs,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const configurationFallback = isLlmNotConfiguredError(e);
    if (configurationFallback) {
      console.warn("[Expert LLM skipped]", message);
    } else {
      console.error("[Expert LLM error]", e);
    }
    if (shouldRequireConsultLlm(consultBackend)) {
      throw new LlmBackendUnavailableError(message);
    }
    void reportLlmFallback({
      feature: "consult",
      failureReason: configurationFallback ? "llm_not_configured_fallback" : "llm_backend_fallback",
      detail: message,
    });
    return buildOfficialSummaryExpertResult({
      question,
      docs,
      lang,
      sourceNotice,
      disclaimer,
      suggestedFollowups,
      needsHumanExpert,
      temporaryModelFailure: !configurationFallback,
    });
  }
}

function buildOfficialSummaryExpertResult({
  question,
  docs,
  lang,
  sourceNotice,
  disclaimer,
  suggestedFollowups,
  needsHumanExpert,
  temporaryModelFailure,
}: {
  question: string;
  docs: KnowledgeDoc[];
  lang: Lang;
  sourceNotice: string;
  disclaimer: string;
  suggestedFollowups: string[];
  needsHumanExpert: boolean;
  temporaryModelFailure: boolean;
}): ExpertAnswerResult {
  const answer = docs.length > 0
    ? buildOfficialSummaryFallback(question, docs, lang, sourceNotice)
    : {
        ko: "관련 공식 문서를 충분히 찾지 못했습니다. 비자·체류, 서류, 거절 대응, 유학원 운영 중 어느 영역인지 조금 더 구체적으로 알려주세요. 개별 사례의 판단·서류 작성·제출 대행은 행정사 상담을 권장합니다.",
        vi: "Chưa tìm thấy đủ tài liệu chính thức liên quan. Hãy cho biết rõ hơn về visa/lưu trú, hồ sơ, kháng từ chối, hoặc vận hành tư vấn du học. Trường hợp cá nhân nên tư vấn chuyên gia hành chính.",
        mn: "Холбогдох албан эх сурвалж хангалттай олдсонгүй. Виз/байршил, баримт бичиг, татгалзлын хариу, эсвэл сургалтын зөвлөгөөний үйл ажиллагааны аль хэсэг болохыг тодруулна уу. Тусгай тохиолдолд мэргэжлийн зөвлөгөө авна уу.",
        en: "I could not find enough relevant official source material. Please specify whether this is about visa/stay, documents, refusal response, or study-agency operations. Individual case decisions and filing work should go through an administrative scrivener.",
      }[lang];

  return {
    answer,
    disclaimer: temporaryModelFailure
      ? {
          ko: "⚠️ 생성 모델 응답에 실패해 검색된 공식 문서를 직접 요약했습니다. 개별 사례 판단은 행정사 상담을 권장합니다.",
          vi: "⚠️ Lỗi phản hồi mô hình, đang tóm tắt trực tiếp tài liệu chính thức đã tìm được. Trường hợp cá nhân nên tư vấn chuyên gia hành chính.",
          mn: "⚠️ Загварын хариу амжилтгүй болсон тул олдсон албан эх сурвалжийг шууд хураангуйллаа. Тусгай тохиолдолд мэргэжлийн зөвлөгөө авна уу.",
          en: "⚠️ Model response failed, so I summarized the retrieved official source material directly. Individual cases should be reviewed by an administrative scrivener.",
        }[lang]
      : disclaimer,
    suggestedFollowups,
    needsHumanExpert,
    backend: "official-summary",
  };
}

function asksForFreshness(question: string): boolean {
  return /최신|최근공포|시행일|시행예정|개정|변경된|바뀐|현행|current|recent|updated|amended|effective date/i.test(
    question
  );
}

function officialSummaryDocScore(question: string, doc: KnowledgeDoc, lang: Lang): number {
  const q = question.toLowerCase();
  const title = pickLangText(doc.title, lang).toLowerCase();
  const content = pickLangText(doc.content, lang).slice(0, 1200).toLowerCase();
  const haystack = `${doc.id} ${title} ${doc.keywords.join(" ")} ${content}`.toLowerCase();
  const words = q.split(/\s+/).filter((word) => word.length > 1);

  let score = 0;
  const wantsDocuments = /서류|제출|첨부|체크리스트|신청|document|checklist|forms|hồ sơ/i.test(question);
  const wantsExtension = /연장|체류기간|extend|extension|gia hạn/i.test(question);
  const wantsFreshness = asksForFreshness(question);
  const asksKeta = /k[-\s]?eta|전자여행허가/i.test(question);
  const asksEArrival = /e[-\s]?arrival|전자입국신고|arrival card|입국신고서/i.test(question);
  const asksVisaPassport = /사증|비자|여권|무사증|사증면제|재입국허가|visa|valid passport|visa[-\s]?free|visa waiver|re[-\s]?entry permit/i.test(question);
  const asksVisaCertificate = /사증발급인정서|비자발급인정서|사증\s*발급|단수사증|복수사증|초청인|초청자|대리\s*신청|visa issuance certificate|certificate for confirmation of visa issuance|ccvi|single visa|multiple visa|inviter|sponsor/i.test(question);
  const asksEntryInspection = /입국심사|입국\s*목적|entry inspection|entry purpose|arrival inspection/i.test(question);
  const asksEntryBan = /입국금지|입국\s*거부|입국불허|entry ban|refusal of entry|denied entry|inadmissible/i.test(question);
  const asksDeportation = /강제퇴거|퇴거명령|추방|deportation|removal/i.test(question);
  const asksDepartureOrder = /출국권고|출국명령|자진출국|출국기한|departure recommendation|departure order|voluntary departure/i.test(question);
  const asksDepartureInspection = /출국심사|출국\s*심사|출국.*여권|공항.*출국|항만.*출국|departure inspection|depart.*passport|valid passport.*departure/i.test(question);
  const asksDepartureSuspension = /출국정지|출국\s*정지|출국금지|출국\s*금지|출국.*(막|못|불가).*(수사|재판|세금|체납|벌금|범죄)|departure suspension|departure ban|cannot depart.*(criminal|investigation|tax|fine)/i.test(question);
  const asksPermitCancellation = /허가취소|허가\s*취소|허가변경|허가\s*변경|체류허가.*취소|사증.*취소|신원보증.*철회|허가조건.*위반|출석통지|7일\s*전.*통지|의견진술|permit cancellation|permission change|seven-day notice|opinion hearing/i.test(question);
  const asksDetentionOrder = /보호명령서|보호명령|긴급보호|48시간|도주\s*우려|보호의\s*필요성|detention order|protection order|emergency protection|48 hours|risk of flight/i.test(question);
  const asksDeportationObjection = /강제퇴거.*이의|퇴거.*이의|이의신청|강제퇴거명령서.*7일|7일.*강제퇴거|deportation objection|removal objection|object.*deportation/i.test(question);
  const asksDeportationDetention = /보호소|보호시설|외국인보호|보호기간|강제퇴거.*보호|2개월|9개월|20개월|immigration detention|deportation detention|protection facility|detention period/i.test(question);
  const asksDetentionTemporaryRelease = /보호\s*일시해제|보호의\s*일시해제|일시해제|보증금|2천만원|정기\s*보고|신원보증인|temporary release|release from detention|bond|20 million won|regular reporting/i.test(question);
  const asksEmployerReport = /고용주|사업주|사용자|해고|퇴직|사직|소재불명|고용계약.*변경|계약.*변경|employer report|employer reporting|dismissal|resignation|employment contract change|unable to locate|disappearance/i.test(question);
  const asksStudentManagement = /유학생.*(휴학|제적|미등록|행방불명|학적|학교.*신고)|학적변동|학적\s*변동|유학생정보시스템|학교.*(휴학|제적|미등록|행방불명|신고)|school reporting|student status change|leave of absence|removal from register|training discontinuation|student disappearance/i.test(question);
  const asksArcReturn = /외국인등록증.*(반납|반환|회수)|등록증.*(반납|반환|회수)|출국.*등록증|arc return|alien registration card.*return|registration card.*return/i.test(question);
  const asksBiometrics = /생체정보|지문|얼굴정보|안면정보|지문.*거부|생체.*거부|biometric|fingerprint|face information|fingerprint refusal/i.test(question);

  for (const word of words) {
    if (haystack.includes(word)) score += 0.75;
  }

  for (const visaType of ["d-2", "d2", "d-4", "d4", "d-10", "d10", "e-7", "e7", "f-2", "f2", "f-5", "f5"]) {
    if (q.includes(visaType) && haystack.includes(visaType)) score += 6;
  }

  if (wantsDocuments) {
    if (/서류|첨부|체크리스트|통합신청서|documents|attachments|forms|checklist/i.test(haystack)) score += 7;
    if (doc.id === "immigration-rule-documents-attachments") score += 20;
    if (doc.id === "hikorea-forms-document-checklist") score += 16;
    if (doc.id === "visa-documents") score += 14;
  }
  if (wantsExtension) {
    if (/연장|체류기간|허가|permission|extension|stay-extension/i.test(haystack)) score += 6;
    if (doc.id === "hikorea-stay-extension") score += 18;
    if (doc.id === "immigration-act-permission-matrix") score += 14;
    if (doc.id === "immigration-rule-documents-attachments") score += 8;
  }
  if (/변경|전환|change|transfer/i.test(question)) {
    if (/변경|전환|change|transfer|permission/i.test(haystack)) score += 5;
  }
  if (/수수료|비용|처리기간|fee|cost|payment/i.test(question)) {
    if (/수수료|비용|fee|cost|payment/i.test(haystack)) score += 5;
  }
  if (asksKeta) {
    if (doc.id === "moj-k-eta-entry-authorization") score += 30;
    if (doc.id === "moj-k-eta-scam-warning") score += 12;
    if (!/k[-_ ]?eta|전자여행허가/i.test(haystack)) score -= 4;
  }
  if (asksEArrival) {
    if (doc.id === "moj-e-arrival-card") score += 30;
    if (doc.id === "moj-e-arrival-card-notice") score += 18;
    if (!/e[-_ ]?arrival|전자입국신고|arrival card|입국신고서/i.test(haystack)) score -= 4;
  }
  if (asksVisaPassport) {
    if (doc.id === "immigration-act-visa-passport-requirement") score += 26;
    if (doc.id === "immigration-act-entry-inspection") score += 8;
  }
  if (asksVisaCertificate) {
    if (doc.id === "immigration-act-visa-issuance-certificate") score += 32;
    if (doc.id === "immigration-rule-documents-attachments") score += 8;
  }
  if (asksEntryInspection) {
    if (doc.id === "immigration-act-entry-inspection") score += 28;
    if (doc.id === "immigration-act-entry-ban") score += 10;
  }
  if (asksEntryBan) {
    if (doc.id === "immigration-act-entry-ban") score += 30;
    if (doc.id === "immigration-act-entry-inspection") score += 8;
  }
  if (asksDeportation) {
    const asksSpecificDeportationProcedure =
      asksDepartureOrder ||
      asksDetentionOrder ||
      asksDeportationObjection ||
      asksDeportationDetention ||
      asksDetentionTemporaryRelease;
    if (doc.id === "immigration-act-deportation-grounds") score += asksSpecificDeportationProcedure ? 8 : 32;
    if (doc.id === "immigration-law-violation-risk") score += asksSpecificDeportationProcedure ? 4 : 10;
  }
  if (asksDepartureOrder) {
    if (doc.id === "immigration-act-departure-recommendation-order") score += 48;
    if (doc.id === "immigration-act-deportation-grounds") score += 6;
  }
  if (asksDepartureInspection) {
    if (doc.id === "immigration-act-departure-inspection") score += 32;
    if (doc.id === "immigration-act-arc-return-duty") score += 8;
  }
  if (asksDepartureSuspension) {
    if (doc.id === "immigration-act-departure-suspension") score += 32;
    if (doc.id === "immigration-act-departure-inspection") score += 8;
  }
  if (asksPermitCancellation) {
    if (doc.id === "immigration-act-permit-cancellation-change") score += 64;
    if (doc.id === "immigration-act-false-application-documents") score += 8;
    if (doc.id === "immigration-act-permission-matrix") score += 6;
  }
  if (asksDetentionOrder) {
    if (doc.id === "immigration-act-detention-order") score += 64;
    if (doc.id === "immigration-act-deportation-grounds") score += 6;
  }
  if (asksDeportationObjection) {
    if (doc.id === "immigration-act-deportation-objection") score += 64;
    if (doc.id === "immigration-act-deportation-grounds") score += 4;
  }
  if (asksDeportationDetention) {
    if (doc.id === "immigration-act-deportation-detention") score += 64;
    if (doc.id === "immigration-act-deportation-objection") score += 6;
    if (doc.id === "immigration-act-deportation-grounds") score += 4;
  }
  if (asksDetentionTemporaryRelease) {
    if (doc.id === "immigration-act-detention-temporary-release") score += 64;
    if (doc.id === "immigration-act-deportation-detention") score += 8;
  }
  if (asksEmployerReport) {
    if (doc.id === "immigration-act-employer-reporting-duty") score += 32;
    if (doc.id === "immigration-act-employment-restriction") score += 10;
    if (doc.id === "immigration-act-workplace-change-addition") score += 8;
  }
  if (asksStudentManagement) {
    if (doc.id === "immigration-act-student-management-reporting") score += 32;
    if (doc.id === "hikorea-d2-d4-d10-e7-f2-f5-requirements") score += 8;
    if (doc.id === "immigration-act-outside-status-activity") score += 6;
  }
  if (asksArcReturn) {
    if (doc.id === "immigration-act-arc-return-duty") score += 32;
    if (doc.id === "immigration-act-alien-registration") score += 10;
    if (doc.id === "immigration-act-reentry-permit") score += 8;
  }
  if (asksBiometrics) {
    if (doc.id === "immigration-act-biometric-information-duty") score += 32;
    if (doc.id === "immigration-act-alien-registration") score += 10;
  }

  if (doc.id === "immigration-law-recent-promulgations") {
    score += wantsFreshness ? 6 : -8;
  }
  if (!wantsFreshness && /최신 본문 감시|최근공포|시행일자 감시/.test(pickLangText(doc.title, "ko"))) score -= 8;
  if (doc.id === "immigration-law-interpretation-hierarchy") score += 1;

  return score;
}

const SOURCE_TYPE_LABELS: Record<string, Record<Lang, string>> = {
  official_government: { ko: "정부 공식", vi: "Chính phủ", mn: "Засгийн газрын", en: "Government official" },
  official_law: { ko: "법령", vi: "Pháp luật", mn: "Хууль", en: "Law" },
  internal_analysis: { ko: "KARXY 분석", vi: "Phân tích KARXY", mn: "KARXY шинжилгээ", en: "KARXY analysis" },
  internal_policy: { ko: "KARXY 정책", vi: "Chính sách KARXY", mn: "KARXY бодлого", en: "KARXY policy" },
};

function sourceDisplayLabel(source: string, lang: Lang): string {
  return SOURCE_TYPE_LABELS[source]?.[lang] || source;
}

// Exported as a test seam, not a public API — same convention as
// `normalizeExpertResponse` in unified/route.ts.
export function buildOfficialSummaryFallback(
  question: string,
  docs: KnowledgeDoc[],
  lang: Lang,
  sourceNotice: string
): string {
  const copy = OUTAGE_SUMMARY_COPY[lang];
  const prioritized = docs
    .map((doc) => ({ doc, score: officialSummaryDocScore(question, doc, lang) }))
    .sort((a, b) => b.score - a.score)
    .map(({ doc }) => doc)
    .slice(0, 4);

  const sections = prioritized
    .map((doc, index) => {
      const meta = getRagDocumentMetadata(doc, lang);
      const content = pickLangText(doc.content, lang)
        .replace(/^#{1,6}\s.*$/gm, " ")
        .replace(/\s+/g, " ")
        .trim();
      const excerpt = content.length > 520 ? `${content.slice(0, 520)}...` : content;
      const checked = meta?.last_checked_at ? `\n${copy.checked}: ${meta.last_checked_at}` : "";
      const sourceUrl = meta?.source_url ? ` <${meta.source_url}>` : "";
      return `### [${index + 1}] ${pickLangText(doc.title, lang)}\n\n${excerpt} [${index + 1}]\n\n${copy.source}: ${sourceDisplayLabel(doc.source, lang)}${sourceUrl}${checked}`;
    })
    .join("\n\n");

  const lead = buildOfficialSummaryLead({
    question,
    docContents: prioritized.map((doc, index) => ({
      content: pickLangText(doc.content, lang),
      index: index + 1,
    })),
    lang,
  });

  return `## ${copy.heading}

${lead ? `${lead}

` : ""}${copy.intro}

${sections}

${sourceNotice}`;
}

// 위험 신호 감지
function detectDangerSignals(question: string): string[] {
  const q = question.toLowerCase();
  const signals: string[] = [];

  const checks = [
    { pattern: /허위|위조|fake|forgery|giả|хуурамч/, msg: "허위서류/위조 관련 표현 감지" },
    { pattern: /잔고증명.*대신|잔고.*만들어|허위.*잔고|sổ giả/, msg: "허위 잔고증명 요청 의심" },
    { pattern: /비자.*보장|100%.*비자|visa.*guarantee|bảo đảm.*visa/, msg: "비자 보장 약속 요청" },
    { pattern: /취업.*알선|알바.*소개|공장.*취업|việc làm.*bất hợp pháp/, msg: "불법취업 알선 요청" },
    { pattern: /체류.*불법|밀입국|불법체류/, msg: "불법 체류 관련" },
    { pattern: /대리.*신청|대신.*제출|nộp.*thay|төлөөлөн/, msg: "대리 신청/제출 요청 (행정사 영역)" },
  ];

  for (const c of checks) {
    if (c.pattern.test(q)) signals.push(c.msg);
  }

  return signals;
}

// 행정사 상담 필요 여부 판단
function checkNeedsHumanExpert(question: string, dangerSignals: string[]): boolean {
  // 위험 신호 있으면 무조건 행정사 상담 권유
  if (dangerSignals.length > 0) return true;

  const q = question.toLowerCase();
  // 복잡한 개별 사례
  const complexPatterns = [
    /비자.*거절|거절.*재신청|refusal|appeal/,
    /체류자격.*변경|전환|change.*status/,
    /추방|강제퇴거|deportation/,
    /이혼|가족.*사망|emergency/,
    /범죄.*이력|criminal.*record/,
    /과거.*불법|previous.*illegal/,
  ];

  return complexPatterns.some((p) => p.test(q));
}

// 제안 후속 질문
function generateFollowups(question: string, lang: Lang, mode: string): string[] {
  const followups: Record<Lang, string[]> = {
    ko: [
      "필요한 서류 목록을 자세히 알려주세요",
      "예상 비용은 얼마인가요?",
      "처리 기간은 얼마나 걸리나요?",
      "행정사 상담이 필요한가요?",
    ],
    vi: [
      "Cho tôi danh sách hồ sơ chi tiết",
      "Chi phí dự kiến là bao nhiêu?",
      "Thời gian xử lý mất bao lâu?",
      "Có cần chuyên gia hành chính không?",
    ],
    mn: [
      "Шаардлагатай баримтын жагсаалт",
      "Урьдчилсан зардал хэд вэ?",
      "Боловсруулах хугацаа хэд вэ?",
      "Зөвлөгөө шаардлагатай юу?",
    ],
    en: [
      "What documents do I need?",
      "What's the estimated cost?",
      "How long does processing take?",
      "Do I need an administrative scrivener?",
    ],
  };
  return followups[lang].slice(0, 3);
}
