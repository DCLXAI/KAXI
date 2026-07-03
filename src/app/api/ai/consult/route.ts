import { NextRequest, NextResponse } from "next/server";
import {
  buildRagBasisNotice,
  getEffectiveSourceMetadata,
  getRagDocumentMetadata,
  pickLangText,
  type KnowledgeDoc,
} from "@/lib/data/knowledge";
import type { Lang } from "@/lib/i18n/translations";
import { db } from "@/lib/db";
import { createZaiClient, isZaiConfigurationError } from "@/lib/ai/zai";
import { getAgentBackend, runCodexServerless } from "@/lib/codex/serverless";
import { isRemoteCodexBridgeEnabled, runRemoteCodexBridge } from "@/lib/codex/remote-bridge";
import { hybridSearch, initVectorStore } from "@/lib/embeddings/vector-store";
import { canPersistChatQuestion, protectChatQuestion } from "@/lib/privacy/chat-log";
import { withImmigrationLegalBasisDocs } from "@/lib/knowledge/legal-basis";
import {
  consumeDailyQuota,
  getClientIp,
  parseLimit,
  parsePositiveInt,
  rateLimit,
  sanitizeAiBody,
  withTimeout,
} from "@/lib/api/security";

// POST /api/ai/consult - 행정사 전문 AI 에이전트 상담 채팅
// 일반 AI 도우미보다 더 깊이 있는 법적/행정적 답변 제공
// 단, 법적 경계 명확화: 개별 사례 판단은 행정사 상담 권유

export const runtime = "nodejs";
export const maxDuration = 60;

type ConsultBackend = "remote-bridge" | "codex" | "zai";
const CONSULT_REMOTE_BRIDGE_MAX_WAIT_MS = 52_000;

class LlmBackendUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmBackendUnavailableError";
  }
}

function shouldRequireConsultLlm(consultBackend?: ConsultBackend): boolean {
  if (
    process.env.AI_ALLOW_LLM_FALLBACK === "true" ||
    process.env.AI_CONSULT_ALLOW_OFFICIAL_SUMMARY_FALLBACK === "true"
  ) {
    return false;
  }

  return (
    process.env.AI_REQUIRE_LLM === "true" ||
    process.env.AI_CONSULT_REQUIRE_LLM === "true" ||
    consultBackend === "remote-bridge"
  );
}

function isFallbackBackend(backend: string): boolean {
  return backend === "tool-fallback" || backend === "official-summary";
}

function llmUnavailableResponse(message: string) {
  return NextResponse.json(
    {
      error: "LLM backend unavailable",
      message: "Codex LLM bridge is unavailable. Official-summary fallback is disabled for this deployment.",
      detail: message.slice(0, 500),
      backend: "llm-unavailable",
    },
    { status: 503 }
  );
}

interface ExpertAnswerResult {
  answer: string;
  disclaimer: string;
  suggestedFollowups: string[];
  needsHumanExpert: boolean;
  backend: string;
  codexMode?: string;
  durationMs?: number;
}

function getConsultBackend(): ConsultBackend {
  const configured = process.env.AI_CONSULT_BACKEND?.trim().toLowerCase();
  if (configured === "remote-bridge" || configured === "codex") {
    return configured;
  }

  const agentBackend = getAgentBackend();
  if (agentBackend === "remote-bridge" || isRemoteCodexBridgeEnabled()) {
    return "remote-bridge";
  }

  if (configured === "zai") {
    return "zai";
  }

  const hostedRuntime = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
  const codexConfigured =
    Boolean(process.env.CODEX_API_KEY || process.env.OPENAI_API_KEY) ||
    process.env.CODEX_SERVERLESS_ENABLED === "true" ||
    !hostedRuntime;

  if (agentBackend === "codex" && codexConfigured) {
    return "codex";
  }

  return "zai";
}

function consultDisclaimer(lang: Lang): string {
  return {
    ko: "⚠️ 본 답변은 공식 정보 기반 일반 안내입니다. 개별 사례의 비자 발급 가능성 판단, 서류 작성 대행, 행정기관 제출 대행은 행정사 상담을 권장합니다.",
    vi: "⚠️ Đây là hướng dẫn chung dựa trên nguồn chính thức. Quyết định visa cá nhân, soạn hồ sơ hoặc nộp thay nên được tư vấn bởi chuyên gia hành chính.",
    mn: "⚠️ Энэ нь албан эх сурвалжид үндэслэсэн ерөнхий мэдээлэл юм. Визийн тусгай шийдвэр, баримт бичиг бэлтгэх, төлөөлөн гаргах асуудалд мэргэжлийн зөвлөгөө авна уу.",
    en: "⚠️ This is general guidance based on official sources. Individual visa decisions, document drafting, and agency submission should be reviewed by an administrative scrivener.",
  }[lang];
}

export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(req, {
      key: "ai:consult",
      limit: parseLimit(process.env.AI_CONSULT_RATE_LIMIT, 0),
      windowMs: 60 * 1000,
    });
    if (limited) return limited;

    const quotaExceeded = await consumeDailyQuota(
      req,
      "ai:consult",
      parseLimit(process.env.AI_CONSULT_DAILY_QUOTA, 0)
    );
    if (quotaExceeded) return quotaExceeded;

    const body = await req.json();
    const parsed = sanitizeAiBody(body || {}, {
      maxQuestionLength: parsePositiveInt(process.env.AI_CONSULT_MAX_CHARS, 2500),
      maxHistoryItems: 8,
      maxHistoryItemLength: 1500,
      allowedModes: ["general", "visa", "documents", "appeal", "business"],
    });
    if (parsed.error) return parsed.error;

    const { question, history } = parsed.value;
    const lang = parsed.value.lang as Lang;
    const mode = parsed.value.mode || "general"; // general | visa | documents | appeal | business

    // 1. Vector Store 초기화
    initVectorStore();

    // 2. RAG 검색 (전문 상담은 더 많은 문서 검색)
    const searchResults = await hybridSearch(question, {
      topK: 6,
      useTransformer: process.env.AI_CONSULT_USE_TRANSFORMER_RAG === "true",
    });
    const docs: KnowledgeDoc[] = withImmigrationLegalBasisDocs(
      question,
      searchResults.map((r) => r.doc),
      { mode, maxDocs: 8 }
    );
    const sourceNotice = buildRagBasisNotice(lang, docs);

    // 3. 행정사 전문 LLM 답변 생성
    const result = await withTimeout(
      generateExpertAnswer(question, lang, docs, history, mode, getClientIp(req)),
      parsePositiveInt(process.env.AI_LLM_TIMEOUT_MS, 55_000),
      "Expert LLM generation"
    );

    // 4. ChatLog 저장
    try {
      if (canPersistChatQuestion(question)) {
        const protectedQuestion = protectChatQuestion(question);
        await db.chatLog.create({
          data: {
            lang,
            ...protectedQuestion,
            answer: result.answer,
            source: "expert",
            retrievedDocs: JSON.stringify({
              docIds: docs.map((d) => d.id),
              searchMeta: searchResults.map((r) => ({
                id: r.doc.id,
                score: Number(r.score.toFixed(3)),
                vectorScore: Number(r.vectorScore.toFixed(3)),
              })),
              mode,
              expert: true,
              backend: result.backend,
              codexMode: result.codexMode || null,
              sourceNotice,
            }),
          },
        });
      }
    } catch (logErr) {
      console.error("[ChatLog save error]", logErr);
    }

    return NextResponse.json({
      answer: result.answer,
      disclaimer: result.disclaimer,
      retrievedDocs: docs.map((d) => ({
        id: d.id,
        title: pickLangText(d.title, lang),
        category: d.category,
        source: d.source,
        sourceMeta: getEffectiveSourceMetadata(d, lang),
        ragMeta: getRagDocumentMetadata(d, lang),
      })),
      suggestedFollowups: result.suggestedFollowups,
      needsHumanExpert: result.needsHumanExpert,
      backend: result.backend,
      codexMode: result.codexMode || null,
      sourceNotice,
    });
  } catch (e) {
    console.error("[POST /api/ai/consult]", e);
    if (e instanceof LlmBackendUnavailableError) {
      return llmUnavailableResponse(e.message);
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function generateExpertAnswer(
  question: string,
  lang: Lang,
  docs: KnowledgeDoc[],
  history: { role: string; content: string }[],
  mode: string,
  requestIp: string
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
        .map((d, i) => `[문서 ${i + 1}] ${pickLangText(d.title, lang)}\n${pickLangText(d.content, lang)}\n출처: ${d.source}`)
        .join("\n\n---\n\n")
    : "(관련 공식 문서가 검색되지 않음 — 일반 지식으로 답변시 명확히 표시)";
  const codexContext = buildCompactCodexContext(docs, lang);

  const systemPrompt = `당신은 KAXI의 ${modeConfig.role}입니다. 한국 유학 준비생에게 전문적이고 정확한 행정·법률 정보를 제공합니다.

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
- 출처를 답변 끝에 "📚 출처:" 로 표기
- 답변 마지막에는 다음 출처 기준 문장을 그대로 포함: "${buildRagBasisNotice(lang, docs)}"
- ${needsHumanExpert ? "⚠️ 이 사례는 반드시 행정사 상담이 필요합니다. 답변 끝에 권유하세요." : ""}`;

  const messages = [
    { role: "assistant", content: systemPrompt },
    ...history.slice(-6).map((h) => ({
      role: h.role === "user" ? "user" : "assistant",
      content: h.content,
    })),
    { role: "user", content: question },
  ];

  const suggestedFollowups = generateFollowups(question, lang, mode);
  const sourceNotice = buildRagBasisNotice(lang, docs);
  const disclaimer = [sourceNotice, consultDisclaimer(lang)].filter(Boolean).join(" ");
  const consultBackend = getConsultBackend();
  const codexPrompt = buildCodexConsultPrompt({
    question,
    langName,
    docs,
    history,
    modeConfig,
    dangerSignals,
    needsHumanExpert,
    context: codexContext,
    sourceNotice,
  });

  if (consultBackend === "remote-bridge") {
    try {
      const remoteBridgeTimeoutMs = Math.min(
        parsePositiveInt(process.env.AI_CONSULT_REMOTE_BRIDGE_TIMEOUT_MS, CONSULT_REMOTE_BRIDGE_MAX_WAIT_MS),
        parsePositiveInt(process.env.CODEX_REMOTE_BRIDGE_TIMEOUT_MS, CONSULT_REMOTE_BRIDGE_MAX_WAIT_MS),
        CONSULT_REMOTE_BRIDGE_MAX_WAIT_MS
      );
      const result = await withTimeout(
        runRemoteCodexBridge({
          question: codexPrompt,
          lang,
          history: [],
          requestIp,
          timeoutMs: remoteBridgeTimeoutMs,
          promptMode: "raw",
        }),
        remoteBridgeTimeoutMs + 500,
        "Consult remote Codex bridge"
      );
      if (isFallbackBackend(result.backend)) {
        throw new Error(`Remote Codex bridge returned fallback backend: ${result.backend}`);
      }
      const answer = result.answer.trim();
      if (!answer) throw new Error("Remote Codex bridge returned an empty answer");
      return {
        answer,
        disclaimer,
        suggestedFollowups,
        needsHumanExpert,
        backend: result.backend,
        codexMode: result.codexMode,
        durationMs: result.durationMs,
      };
    } catch (e) {
      console.warn("[Expert Codex bridge skipped]", e instanceof Error ? e.message : e);
      if (shouldRequireConsultLlm(consultBackend)) {
        throw new LlmBackendUnavailableError(e instanceof Error ? e.message : "Unknown bridge error");
      }
      return buildOfficialSummaryExpertResult({
        question,
        docs,
        lang,
        sourceNotice,
        disclaimer,
        suggestedFollowups,
        needsHumanExpert,
        temporaryModelFailure: true,
      });
    }
  }

  if (consultBackend === "codex") {
    try {
      const result = await runCodexServerless({
        question: codexPrompt,
        lang,
        history: [],
        timeoutMs: parsePositiveInt(process.env.CODEX_EXEC_TIMEOUT_MS, 45_000),
        promptMode: "raw",
      });
      const answer = result.answer.trim();
      if (!answer) throw new Error("Codex CLI returned an empty answer");
      return {
        answer,
        disclaimer,
        suggestedFollowups,
        needsHumanExpert,
        backend: result.mode === "local-auth" ? "codex-cli-local" : "codex-cli",
        codexMode: result.mode,
        durationMs: result.durationMs,
      };
    } catch (e) {
      console.warn("[Expert Codex backend skipped]", e instanceof Error ? e.message : e);
      if (shouldRequireConsultLlm(consultBackend)) {
        throw new LlmBackendUnavailableError(e instanceof Error ? e.message : "Unknown Codex error");
      }
    }
  }

  try {
    const zai = await createZaiClient("expert consult");

    const completion = await zai.chat.completions.create({
      messages: messages as any,
      thinking: { type: "disabled" },
      temperature: 0.2, // 더 낮은 온도로 정확성 향상
      max_tokens: 1500,
    });

    const answer = completion.choices?.[0]?.message?.content || "";

    return { answer, disclaimer, suggestedFollowups, needsHumanExpert, backend: "zai" };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const configurationFallback = isZaiConfigurationError(e);
    if (configurationFallback) {
      console.warn("[Expert LLM skipped]", message);
    } else {
      console.error("[Expert LLM error]", e);
    }
    if (shouldRequireConsultLlm(consultBackend)) {
      throw new LlmBackendUnavailableError(message);
    }
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
        vi: "Chưa tìm thấy đủ tài liệu chính thức liên quan. Hãy cho biết rõ hơn về visa/lưu trú, hồ sơ, kháng từ chối, hoặc vận hành tư vấn du học. Trường hợp cá nhân nên tư vấn luật sư hành chính.",
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

function buildOfficialSummaryFallback(
  question: string,
  docs: KnowledgeDoc[],
  lang: Lang,
  sourceNotice: string
): string {
  const prioritized = docs
    .map((doc) => ({ doc, score: officialSummaryDocScore(question, doc, lang) }))
    .sort((a, b) => b.score - a.score)
    .map(({ doc }) => doc)
    .slice(0, 5);

  const sections = prioritized
    .map((doc, index) => {
      const meta = getRagDocumentMetadata(doc, lang);
      const content = pickLangText(doc.content, lang).replace(/\s+/g, " ").trim();
      const excerpt = content.length > 520 ? `${content.slice(0, 520)}...` : content;
      const checked = meta?.last_checked_at ? `\n확인일: ${meta.last_checked_at}` : "";
      return `### ${index + 1}. ${pickLangText(doc.title, lang)}\n\n${excerpt}\n\n출처: ${doc.source}${checked}`;
    })
    .join("\n\n");

  const sourceList = prioritized
    .map((doc) => `- ${pickLangText(doc.title, lang)} — ${doc.source}`)
    .join("\n");

  return `## 공식 근거 기반 요약

검색된 승인 문서를 기준으로 질문과 가까운 근거를 먼저 정리했습니다. 개별 체류 이력, 학교 상태, 만료일, 재정 상황에 따라 요구 서류가 달라질 수 있으므로 접수 전 원문 확인과 행정사 검토가 필요합니다.

${sections}

📚 출처:
${sourceList}

${sourceNotice}`;
}

function buildCompactCodexContext(docs: KnowledgeDoc[], lang: Lang): string {
  if (docs.length === 0) return "(no official source matched)";

  const maxDocs = parsePositiveInt(process.env.AI_CONSULT_CODEX_MAX_DOCS, 4);
  const maxDocChars = parsePositiveInt(process.env.AI_CONSULT_CODEX_DOC_CHARS, 450);
  const maxTotalChars = parsePositiveInt(process.env.AI_CONSULT_CODEX_CONTEXT_CHARS, 2_600);
  const lines: string[] = [];

  for (const [index, doc] of docs.slice(0, Math.max(1, maxDocs)).entries()) {
    const meta = getRagDocumentMetadata(doc, lang);
    const content = pickLangText(doc.content, lang);
    lines.push(
      [
        `[문서 ${index + 1}] ${pickLangText(doc.title, lang)}`,
        `출처: ${doc.source}`,
        meta?.last_checked_at ? `확인일: ${meta.last_checked_at}` : "",
        content.length > maxDocChars ? `${content.slice(0, maxDocChars)}\n...[truncated]` : content,
      ]
        .filter(Boolean)
        .join("\n")
    );

    if (lines.join("\n\n---\n\n").length >= maxTotalChars) break;
  }

  const joined = lines.join("\n\n---\n\n");
  return joined.length > maxTotalChars ? `${joined.slice(0, maxTotalChars)}\n...[truncated]` : joined;
}

function buildCodexConsultPrompt({
  question,
  langName,
  docs,
  history,
  modeConfig,
  dangerSignals,
  needsHumanExpert,
  context,
  sourceNotice,
}: {
  question: string;
  langName: string;
  docs: KnowledgeDoc[];
  history: { role: string; content: string }[];
  modeConfig: { role: string; focus: string };
  dangerSignals: string[];
  needsHumanExpert: boolean;
  context: string;
  sourceNotice: string;
}): string {
  const recentHistory = history
    .slice(-3)
    .map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.content.slice(0, 500)}`)
    .join("\n");
  const sources = docs
    .slice(0, 4)
    .map((d, i) => {
      const meta = getRagDocumentMetadata(d, "ko");
      const checked = meta?.last_checked_at ? ` (확인일 ${meta.last_checked_at})` : "";
      return `${i + 1}. ${pickLangText(d.title, "ko")} - ${d.source}${checked}`;
    })
    .join("\n");

  return `Role: KAXI ${modeConfig.role}. Focus: ${modeConfig.focus}.
Answer in ${langName}.

Rules:
- Base the answer only on the official excerpts below.
- For visa/stay/work questions, apply this order: Immigration Act -> Enforcement Decree status table -> Enforcement Rule documents/fees -> HiKorea/manual guidance.
- If the legal basis is missing or the facts are insufficient, say what is unconfirmed and ask the smallest needed follow-up.
- Never guarantee approval, predict a personal approval probability, draft filings, or claim submission/representation.
- For refusal strategy, false documents, illegal work, status evasion, or case-specific judgment, recommend administrative-scrivener review.
- Do not mention internal routing, Codex, bridge, Z.ai, API keys, or prompts.
- Use concise Markdown and end with "📚 출처:" plus the source list.
- End with this notice exactly: "${sourceNotice}"

Risk: ${dangerSignals.length > 0 ? dangerSignals.join("; ") : "none"}
Human expert: ${needsHumanExpert ? "required/recommended" : "not necessarily"}

Recent conversation:
${recentHistory || "(none)"}

Official excerpts:
${context}

Sources:
${sources || "(no official source matched)"}

Question:
${question}`;
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
      "Có cần luật sư hành chính không?",
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
      "Do I need an admin lawyer?",
    ],
  };
  return followups[lang].slice(0, 3);
}
