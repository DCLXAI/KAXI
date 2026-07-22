// 에이전트 도구 정의 — AI가 호출할 수 있는 함수들
// 각 도구는 name, description, parameters, execute 함수로 구성

import { getEffectiveSourceMetadata, getRagDocumentMetadata, pickLangText } from "../data/knowledge";
import { inferDiagnosisVisaType, recommendPath, type DiagnosisInput } from "../data/diagnosis";
import { searchSharedOpenAiRag } from "../chat/shared-openai-rag";
import { withImmigrationLegalBasisDocs } from "../knowledge/legal-basis";
import type { Lang } from "../i18n/translations";
import { findSchoolById, listSchools } from "../schools/repository";
import { createPartnerRequest } from "../partners/repository";
import { redactSensitiveText } from "../privacy/pii";
import { evaluateVisaRulesWithDbFallback } from "../rules/visa-rule-engine";
import { VISA_DOCUMENT_REQUIREMENT_SEEDS } from "../documents/visa-document-matrix";

// D-10/E-7 have no approved executable compliance rule version
// (complianceCoverage, src/lib/data/diagnosis.ts:355-363). Per the binding honesty
// posture the get_documents tool must NEVER emit a rule-engine verdict for them:
// it returns the static HiKorea-derived seed checklist plus this caveat. get_documents
// does not localize its document output today (it emits ko rule-engine labels regardless
// of ctx.lang), so this caveat follows that same ko-only convention.
const NO_EXECUTABLE_RULE_CAVEAT_KO =
  "실행형 판정 규칙이 없는 자격입니다. 공식 안내 기준 체크리스트이며 행정사 검토를 권장합니다.";

// 도구 호출 결과 (UI에서 시각화)
export type ToolArgs = Record<string, unknown>;
export type ToolResultPayload = unknown;

export interface ToolResult {
  tool: string;
  args: ToolArgs;
  result: ToolResultPayload;
  summary: string; // UI에 표시용 요약
  success: boolean;
}

// 도구 정의 인터페이스
export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
  execute: (args: ToolArgs, ctx: ToolContext) => Promise<{ result: ToolResultPayload; summary: string }>;
}

export interface ToolContext {
  lang: Lang;
  leadId?: string | null;
  dryRun?: boolean;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringArg(args: ToolArgs, key: string, fallback = ""): string {
  const value = args[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberArg(args: ToolArgs, key: string, fallback = 0): number {
  const value = args[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[,\s]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function optionalNumberArg(args: ToolArgs, key: string): number | undefined {
  const value = args[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/[,\s]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function booleanArg(args: ToolArgs, key: string, fallback = false): boolean {
  const value = args[key];
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "1", "y"].includes(normalized)) return true;
    if (["false", "no", "0", "n"].includes(normalized)) return false;
  }
  return fallback;
}

function enumArg<const Values extends readonly string[]>(
  args: ToolArgs,
  key: string,
  values: Values,
  fallback: Values[number]
): Values[number] {
  const value = stringArg(args, key);
  return values.includes(value as Values[number]) ? (value as Values[number]) : fallback;
}

export function sanitizeToolArgsForDisplay(args: ToolArgs): ToolArgs {
  return Object.fromEntries(
    Object.entries(args || {}).map(([key, value]) => {
      if (typeof value === "string") return [key, redactSensitiveText(value).slice(0, 500)];
      return [key, value];
    })
  );
}

// ============ 도구 1: 학교 검색 ============
const searchSchoolsTool: Tool = {
  name: "search_schools",
  description: "한국 유학 학교/어학당 검색. 50개 검증 DB에서 필터링. 인증대학, 비자심사강화 여부 포함.",
  parameters: {
    type: "object",
    properties: {
      region: {
        type: "string",
        description: "지역 필터",
        enum: ["all", "seoul", "gyeonggi", "busan", "daegu", "gwangju", "other"],
      },
      program: {
        type: "string",
        description: "과정 필터",
        enum: ["all", "language", "college", "university", "graduate", "vocational"],
      },
      accreditation: {
        type: "string",
        description: "인증 여부",
        enum: ["all", "accredited", "standard", "caution"],
      },
      max_tuition: {
        type: "number",
        description: "최대 등록금 (KRW, 학기당). 예: 2000000",
      },
      school_name: {
        type: "string",
        description: "사용자가 지정한 학교명 또는 학교명 일부. 예: 연세대학교",
      },
      limit: {
        type: "number",
        description: "최대 결과 수 (기본 5)",
      },
    },
    required: [],
  },
  execute: async (args) => {
    const region = enumArg(args, "region", ["all", "seoul", "gyeonggi", "busan", "daegu", "gwangju", "other"] as const, "all");
    const program = enumArg(args, "program", ["all", "language", "college", "university", "graduate", "vocational"] as const, "all");
    const accreditation = enumArg(args, "accreditation", ["all", "accredited", "standard", "caution"] as const, "all");
    const maxTuition = optionalNumberArg(args, "max_tuition");
    const schoolName = stringArg(args, "school_name");
    const limit = Math.max(1, Math.min(10, Math.round(numberArg(args, "limit", 5))));
    const schools = (await listSchools({
      region,
      program,
      accreditation,
      maxTuition,
      query: schoolName || undefined,
    })).slice(0, limit);

    return {
      result: schools.map((s) => ({
        id: s.id,
        name: s.name.ko,
        region: s.region,
        program: s.program,
        tuition: s.tuitionPerSemester,
        dormitory: s.dormitoryAvailable,
        accreditation: s.accreditation,
        topik: s.topikLevel,
        officialUrl: s.officialUrl,
        sourceUrl: s.sourceUrl,
        verifiedAt: s.verifiedAt,
        reviewAfter: s.reviewAfter,
      })),
      summary: `${schools.length}개 학교 검색됨${schoolName ? ` (학교명: ${schoolName})` : ""}${region !== "all" ? ` (지역: ${region})` : ""}${maxTuition ? ` (학비 ≤ ${maxTuition.toLocaleString()}₩)` : ""}`,
    };
  },
};

// ============ 도구 2: 비용 계산 ============
const calculateCostTool: Tool = {
  name: "calculate_cost",
  description: "특정 학교의 유학 총비용 계산. 등록금, 기숙사, 서류, 비자, 항공, 정착비 항목별 분해. 브로커 견적과 비교.",
  parameters: {
    type: "object",
    properties: {
      school_id: {
        type: "string",
        description: "학교 ID (search_schools 결과에서 확인)",
      },
      include_dormitory: {
        type: "boolean",
        description: "기숙사 포함 여부 (기본 true)",
      },
      broker_quote: {
        type: "number",
        description: "브로커 견적 (KRW, 선택사항). 비교용",
      },
    },
    required: ["school_id"],
  },
  execute: async (args) => {
    const schoolId = stringArg(args, "school_id");
    const school = await findSchoolById(schoolId);
    if (!school) {
      return { result: null, summary: `학교 ID '${schoolId}'를 찾을 수 없음` };
    }

    const includeDorm = booleanArg(args, "include_dormitory", true);
    const items = {
      application_fee: 80000,
      tuition: school.tuitionPerSemester,
      dormitory: includeDorm && school.dormitoryAvailable ? (school.dormitoryCost ?? 0) : 0,
      insurance: 240000,
      translation: 150000,
      visa_fee: 60000,
      flight: 400000,
      settlement: 1200000,
      platform_fee: 49000,
      partner_fee: 99000,
    };
    const total = Object.values(items).reduce((a, b) => a + b, 0);
    const brokerTotal = numberArg(args, "broker_quote", 0);
    const diff = brokerTotal - total;
    const diffPct = brokerTotal > 0 ? Math.round((diff / total) * 100) : 0;

    return {
      result: {
        school: school.name.ko,
        items,
        total,
        broker_quote: brokerTotal,
        difference: diff,
        difference_percent: diffPct,
        warning: brokerTotal > 0 && diffPct > 30 ? "브로커 견적이 30% 이상 높음 — 항목별 비교 권장" : null,
      },
      summary: `${school.name.ko} 총비용: ${total.toLocaleString()}₩${brokerTotal > 0 ? ` (브로커 ${brokerTotal.toLocaleString()}₩, ${diffPct > 0 ? "+" : ""}${diffPct}%)` : ""}`,
    };
  },
};

// ============ 도구 3: 서류 체크리스트 생성 ============
const getDocumentsTool: Tool = {
  name: "get_documents",
  description: "개인 프로필 기반 필수 서류 체크리스트 생성. 비자 종류, 국적에 따라 맞춤 생성.",
  parameters: {
    type: "object",
    properties: {
      visa_type: {
        type: "string",
        description: "비자 종류",
        enum: ["D-2", "D-4", "D-10", "E-7"],
      },
      nationality: {
        type: "string",
        description: "국적 코드 (vn, mn, cn, uz, other)",
        enum: ["vn", "mn", "cn", "uz", "other"],
      },
    },
    required: ["visa_type"],
  },
  execute: async (args) => {
    const visaType = enumArg(args, "visa_type", ["D-2", "D-4", "D-10", "E-7"] as const, "D-2");
    const nationality = stringArg(args, "nationality");

    // Honesty rule: D-10/E-7 carry no approved executable compliance rule version,
    // so we never run the rule engine or expose a verdict for them. Return the static
    // HiKorea-derived seed checklist (VISA_DOCUMENT_REQUIREMENT_SEEDS) plus the caveat.
    if (visaType === "D-10" || visaType === "E-7") {
      const checklist = VISA_DOCUMENT_REQUIREMENT_SEEDS
        .filter((seed) => seed.visaType === visaType)
        .map((seed) => ({
          id: seed.code,
          doc: seed.labelKo,
          required: seed.required,
          note: seed.notes,
          source_refs: seed.sourceRefs,
        }));
      return {
        result: {
          visa_type: visaType,
          nationality: nationality || undefined,
          documents: checklist,
          coverage: {
            status: "rag_only",
            policy: "no approved executable compliance rule version",
            caveat: NO_EXECUTABLE_RULE_CAVEAT_KO,
          },
        },
        summary: `${visaType} 비자 서류 ${checklist.length}종 (실행형 판정 규칙 없음 · 공식 안내 기준)${nationality ? ` (국적: ${nationality.toUpperCase()})` : ""}`,
      };
    }

    const evaluation = await evaluateVisaRulesWithDbFallback({
      visa_type: visaType,
      nationality: nationality || undefined,
    });
    const docs = evaluation.documents.map((doc) => ({
      id: doc.id,
      doc: doc.label,
      required: doc.required,
      note: doc.note,
      source_refs: doc.source_refs,
    }));

    return {
      result: {
        visa_type: evaluation.visa_type || visaType,
        nationality: nationality || undefined,
        documents: docs,
        rule_meta: {
          required_inputs: evaluation.required_inputs,
          missing_inputs: evaluation.missing_inputs,
          applied_rule_ids: evaluation.applied_rule_ids,
          effective_from: evaluation.effective_from,
          source_refs: evaluation.source_refs,
          review_status: evaluation.review_status,
          fallback_policy: evaluation.fallback_policy,
          warnings: evaluation.warnings,
          partner_escalation_reasons: evaluation.partner_escalation_reasons,
          blocked_reasons: evaluation.blocked_reasons,
        },
      },
      summary: `${evaluation.visa_type || visaType || "D-2/D-4"} 비자 서류 ${docs.length}종${nationality ? ` (국적: ${nationality.toUpperCase()})` : ""}`,
    };
  },
};

// ============ 도구 4: 지식 베이스 검색 (RAG) ============
const searchKnowledgeTool: Tool = {
  name: "search_knowledge",
  description: "공식 문서 기반 RAG 검색. 비자, 서류, 비용, 법령, 절차 등 전문 정보. 답변 전 반드시 관련 문서 검색 권장.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "검색 질의 (한국어/영어/베트남어/몽골어 가능)",
      },
      top_k: {
        type: "number",
        description: "검색 결과 수 (기본 3)",
      },
    },
    required: ["query"],
  },
  execute: async (args, ctx) => {
    const query = stringArg(args, "query");
    const requestedTopK = Math.max(1, Math.min(10, Math.round(numberArg(args, "top_k", 3))));
    const sharedRag = await searchSharedOpenAiRag({
      query,
      locale: ctx.lang,
      maxDocuments: Math.max(requestedTopK, 5),
    });
    const retrieval = sharedRag.retrieval;
    const resultById = new Map(sharedRag.search.documents.map((document) => [document.id, document]));
    const docs = withImmigrationLegalBasisDocs(
      query,
      sharedRag.docs,
      {
        maxDocs: Math.min(10, Math.max(requestedTopK, 5) + 3),
        minRetrievedDocs: Math.min(requestedTopK, sharedRag.docs.length),
      }
    );
    return {
      result: docs.map((doc) => ({
        id: doc.id,
        title: pickLangText(doc.title, ctx.lang),
        content: pickLangText(doc.content, ctx.lang),
        category: doc.category,
        source: doc.source,
        sourceMeta: getEffectiveSourceMetadata(doc, ctx.lang),
        ragMeta: getRagDocumentMetadata(doc, ctx.lang),
        score: Number((resultById.get(doc.id)?.rerankScore || 1).toFixed(3)),
        vectorScore: Number((resultById.get(doc.id)?.vectorScore || 0).toFixed(3)),
        keywordScore: Number((resultById.get(doc.id)?.keywordScore || 0).toFixed(3)),
        retrievalMethod: resultById.has(doc.id) ? "openai-pgvector" : "legal-basis",
        retrieval,
      })),
      summary: `${docs.length}개 관련 문서 검색(${retrieval.backend}): ${docs.map((doc) => doc.id).join(", ")}`,
    };
  },
};

// ============ 도구 5: 진단 추천 ============
const diagnosePathTool: Tool = {
  name: "diagnose_path",
  description: "유학 경로 진단. 사용자 프로필(학력, 한국어 수준, 목표, 예산) 기반으로 추천 경로, 예상비용, 필요서류 생성.",
  parameters: {
    type: "object",
    properties: {
      nationality: { type: "string", description: "국적 코드" },
      age: { type: "number", description: "나이" },
      education: { type: "string", description: "최종 학력", enum: ["highschool", "college", "university", "master"] },
      korean_level: { type: "string", description: "한국어 수준", enum: ["none", "topik1", "topik2", "topik3"] },
      goal: { type: "string", description: "유학 목표", enum: ["language", "degree", "transfer", "career", "unsure", "in_korea_job", "in_korea_employment"] },
      budget: { type: "number", description: "예산 (KRW, 6개월)" },
      using_broker: { type: "boolean", description: "브로커 이용 여부" },
      broker_cost: { type: "number", description: "브로커 요구 금액" },
      has_history: { type: "boolean", description: "과거 비자 거절/체류 이력" },
    },
    required: ["education", "korean_level", "goal"],
  },
  execute: async (args) => {
    const nationality = stringArg(args, "nationality", "vn");
    const education = enumArg(args, "education", ["highschool", "college", "university", "master"] as const, "highschool");
    const koreanLevel = enumArg(args, "korean_level", ["none", "topik1", "topik2", "topik3"] as const, "none");
    const goal = enumArg(args, "goal", ["language", "degree", "transfer", "career", "unsure", "in_korea_job", "in_korea_employment"] as const, "unsure");
    const budget = numberArg(args, "budget", 10_000_000);
    const usingBroker = booleanArg(args, "using_broker", false);
    const brokerCost = numberArg(args, "broker_cost", 0);
    const hasHistory = booleanArg(args, "has_history", false);
    const input: DiagnosisInput = {
      nationality,
      age: String(numberArg(args, "age", 20)),
      education,
      korean: koreanLevel,
      goal,
      budget,
      region: "any",
      usingBroker,
      brokerCost,
      hasHistory,
    };
    const diagnosisVisaType = inferDiagnosisVisaType(input);
    const complianceVisaType = goal === "transfer" ? "D-4" : diagnosisVisaType;
    const complianceProgram =
      goal === "language" ? "language" : goal === "degree" || goal === "transfer" ? "degree" : undefined;
    const complianceEvaluation =
      diagnosisVisaType === "D-2" || diagnosisVisaType === "D-4"
        ? await evaluateVisaRulesWithDbFallback({
            visa_type: complianceVisaType,
            program: complianceProgram,
            nationality,
            has_refusal_history: hasHistory,
          })
        : null;
    const rec = recommendPath(input, { visaRuleEvaluation: complianceEvaluation });

    // Clean user-facing payload. Debug fields (applied_rules, source_refs, full compliance_rule_meta) are omitted here.
    const userResult = {
      path: rec.pathKey,
      visa_type: rec.visaType,
      prep_time: rec.prepTime.ko,
      estimated_cost: rec.estimatedCost,
      required_docs: rec.requiredDocs,
      warnings: rec.warnings.map((w) => w.ko),
      next_actions: rec.nextActions.map((a) => a.ko),
      risk_level: rec.riskLevel,
      confidence: rec.confidence,
      readiness: rec.readiness
        ? {
            score: rec.readiness.score,
            risk_level: rec.readiness.riskLevel,
            confidence: rec.readiness.confidence,
            factors: rec.readiness.factors.slice(0, 6),
          }
        : null,
      compliance_documents:
        rec.compliance?.documents.map((doc) => ({
          id: doc.id,
          label: doc.label,
          required: doc.required,
          note: doc.note,
        })) || [],
      compliance_warnings: rec.compliance?.warnings || [],
      partner_escalation_reasons: rec.compliance?.partnerEscalationReasons || [],
      blocked_reasons: rec.compliance?.blockedReasons || [],
      compliance_coverage: {
        status: rec.complianceCoverage?.status,
        policy: rec.complianceCoverage?.policy,
        unsupportedReason: rec.complianceCoverage?.unsupportedReason,
      },
    };

    return {
      result: userResult,
      summary: `추천 경로: ${rec.pathKey} (${rec.visaType}), 예상 비용: ${rec.estimatedCost.toLocaleString()}₩, 준비 리스크 지수: ${rec.readiness?.score ?? "N/A"}점`,
    };
  },
};

// ============ 도구 6: 파트너 상담 요청 ============
const requestPartnerTool: Tool = {
  name: "request_partner",
  description: "전문가 상담 요청 접수. 사용자가 명시적으로 상담 접수/연결을 요청한 경우에만 호출. 행정사/번역공증/어학원/입학처/정착 파트너 연결. 취업 매칭은 제외.",
  parameters: {
    type: "object",
    properties: {
      partner_type: {
        type: "string",
        description: "파트너 종류",
        enum: ["admin", "translation", "academy", "admission", "settlement"],
      },
      question: { type: "string", description: "상담 내용/질문" },
    },
    required: ["partner_type", "question"],
  },
  execute: async (args, ctx) => {
    const partnerType = enumArg(args, "partner_type", ["admin", "translation", "academy", "admission", "settlement"] as const, "admin");
    const question = stringArg(args, "question").slice(0, 1000);
    const safeQuestion = redactSensitiveText(question).slice(0, 500);

    if (ctx.dryRun) {
      return {
        result: {
          request_id: "draft",
          partner_type: partnerType,
          question: safeQuestion,
          lead_id: ctx.leadId || "anonymous",
          status: "draft",
          persisted: false,
          eta: "상담 접수 확인 후 24시간 내 담당자 연락",
        },
        summary: `${partnerType} 파트너 상담 요청 초안 준비 (사용자 확인 필요)`,
      };
    }

    const request = await createPartnerRequest({
      leadId: ctx.leadId || "anonymous",
      partnerType,
      question,
    });
    const persisted = !("persisted" in request) || request.persisted !== false;

    return {
      result: {
        request_id: request.id,
        partner_type: partnerType,
        question: safeQuestion,
        lead_id: request.leadId,
        status: request.status,
        persisted,
        eta: "24시간 내 담당자 연락",
      },
      summary: persisted
        ? `${partnerType} 파트너 상담 요청 접수 (24시간 내 연락)`
        : `${partnerType} 파트너 상담 요청이 임시 접수됨 (운영 DB 연결 필요)`,
    };
  },
};

// ============ 도구 레지스트리 ============
export const TOOLS: Tool[] = [
  searchSchoolsTool,
  calculateCostTool,
  getDocumentsTool,
  searchKnowledgeTool,
  diagnosePathTool,
  requestPartnerTool,
];

export const TOOL_MAP: Record<string, Tool> = TOOLS.reduce(
  (acc, t) => ({ ...acc, [t.name]: t }),
  {}
);

// LLM용 도구 설명 (시스템 프롬프트에 삽입)
export function getToolsDescription(): string {
  return TOOLS.map((t) => `
### ${t.name}
${t.description}
Parameters:
${Object.entries(t.parameters.properties)
  .map(([k, v]) => `- ${k} (${v.type})${v.enum ? ` [values: ${v.enum.join(", ")}]` : ""}: ${v.description}`)
  .join("\n")}
Required: ${t.parameters.required.length > 0 ? t.parameters.required.join(", ") : "없음"}
`).join("\n");
}

// 도구 호출 파싱 (LLM 응답에서 JSON 추출)
function normalizeToolArgs(value: unknown): ToolArgs {
  return isRecord(value) ? value : {};
}

export function parseToolCall(content: string): { tool: string; args: ToolArgs } | null {
  // 패턴 1: ```json ... ``` 블록
  const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (codeBlockMatch) {
    try {
      const parsed: unknown = JSON.parse(codeBlockMatch[1]);
      if (isRecord(parsed) && typeof parsed.tool === "string" && TOOL_MAP[parsed.tool]) {
        return { tool: parsed.tool, args: normalizeToolArgs(parsed.args || parsed.arguments) };
      }
    } catch {}
  }

  // 패턴 2: 직접 JSON 객체
  const jsonMatch = content.match(/\{\s*"tool"\s*:\s*"([^"]+)"[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      const parsed: unknown = JSON.parse(jsonMatch[0]);
      if (isRecord(parsed) && typeof parsed.tool === "string" && TOOL_MAP[parsed.tool]) {
        return { tool: parsed.tool, args: normalizeToolArgs(parsed.args || parsed.arguments) };
      }
    } catch {}
  }

  return null;
}
