import type { Lang } from "@/lib/i18n/translations";
import type { ToolResult } from "@/lib/agent/tools";
import { analyzeAgentIntent, type AgentIntentEvidence, type AgentMissingSlot } from "@/lib/agent/planner";
import { buildRagBasisNoticeFromMetadata, type RagDocumentMetadata } from "@/lib/data/knowledge";
import { isOfficialKnowledgeSource } from "@/lib/knowledge/official-source";

export interface AgentSource {
  id: string;
  title: string;
  label: string;
  url: string | null;
  kind: "knowledge" | "school" | "internal";
  owner?: string;
  verifiedAt?: string;
  reviewAfter?: string;
  sourceType?: string;
  reviewStatus?: string;
  checkedBy?: string;
  basis?: string;
  excerpt?: string;
}

export interface AgentSuggestion {
  kind: "school" | "cost" | "documents" | "partner";
  label: string;
  prompt: string;
  href?: string;
}

export interface AgentClarifyingQuestion {
  slot: AgentMissingSlot;
  label: string;
  prompt: string;
}

export interface AgentMeta {
  summary: string;
  plan: string[];
  sources: AgentSource[];
  clarifyingQuestions: AgentClarifyingQuestion[];
  suggestions: AgentSuggestion[];
  safetyFlags: string[];
  sourceNotice?: string;
  intentEvidence: Pick<
    AgentIntentEvidence,
    | "detectedSignals"
    | "resolvedSlots"
    | "structuredSlots"
    | "slotRequirements"
    | "planReasons"
    | "confidenceDrivers"
  >;
  quality: {
    backend: string;
    grounded: boolean;
    toolCount: number;
    officialSourceCount: number;
    retrievalBackends: string[];
    pgvectorResultCount: number;
    intentConfidence: "low" | "medium" | "high";
    missingSlotCount: number;
    durationMs?: number;
  };
}

const TOOL_PLAN_LABELS: Record<string, Record<Lang, string>> = {
  search_schools: {
    ko: "학교 후보 검색",
    vi: "Tìm trường phù hợp",
    mn: "Сургууль хайх",
    en: "Search school matches",
  },
  calculate_cost: {
    ko: "예상 비용 계산",
    vi: "Tính chi phí dự kiến",
    mn: "Зардал тооцох",
    en: "Calculate estimated cost",
  },
  get_documents: {
    ko: "비자 서류 체크",
    vi: "Kiểm tra hồ sơ visa",
    mn: "Визийн баримт шалгах",
    en: "Check visa documents",
  },
  search_knowledge: {
    ko: "공식 정보 검색",
    vi: "Tra cứu nguồn chính thức",
    mn: "Албан эх сурвалж хайх",
    en: "Search official knowledge",
  },
  diagnose_path: {
    ko: "유학 경로 진단",
    vi: "Đánh giá lộ trình",
    mn: "Суралцах зам оношлох",
    en: "Diagnose study path",
  },
  request_partner: {
    ko: "상담 요청 초안",
    vi: "Chuẩn bị yêu cầu tư vấn",
    mn: "Зөвлөгөөний хүсэлт бэлдэх",
    en: "Prepare partner request",
  },
};

const FALLBACK_PLAN: Record<Lang, string[]> = {
  ko: ["질문 분류", "KAXI 지식으로 답변 생성"],
  vi: ["Phân loại câu hỏi", "Trả lời bằng kiến thức KAXI"],
  mn: ["Асуултыг ангилах", "KAXI мэдлэгээр хариулах"],
  en: ["Classify the request", "Answer with KAXI knowledge"],
};

const SUMMARIES: Record<Lang, (toolCount: number, sourceCount: number) => string> = {
  ko: (toolCount, sourceCount) =>
    toolCount > 0
      ? `${toolCount}개 도구 결과와 ${sourceCount}개 출처를 바탕으로 답변했습니다.`
      : "KAXI 에이전트가 직접 답변했습니다.",
  vi: (toolCount, sourceCount) =>
    toolCount > 0
      ? `Đã trả lời dựa trên ${toolCount} kết quả công cụ và ${sourceCount} nguồn.`
      : "KAXI Agent answered directly.",
  mn: (toolCount, sourceCount) =>
    toolCount > 0
      ? `${toolCount} хэрэгслийн үр дүн, ${sourceCount} эх сурвалж дээр тулгуурлав.`
      : "KAXI агент шууд хариуллаа.",
  en: (toolCount, sourceCount) =>
    toolCount > 0
      ? `Answered with ${toolCount} tool result${toolCount === 1 ? "" : "s"} and ${sourceCount} source${sourceCount === 1 ? "" : "s"}.`
      : "KAXI Agent answered directly.",
};

const SUGGESTION_LIBRARY: Record<Lang, AgentSuggestion[]> = {
  ko: [
    { kind: "school", label: "학교 비교", prompt: "서울과 경기권 인증대학 어학당을 비용 기준으로 비교해줘" },
    { kind: "cost", label: "총비용 계산", prompt: "추천 학교 3곳의 학비, 기숙사, 초기 정착비까지 총비용을 계산해줘" },
    { kind: "documents", label: "서류 체크", prompt: "베트남 학생 기준 D-4 비자 서류 체크리스트를 만들어줘" },
    { kind: "partner", label: "전문가 연결", prompt: "비자 거절 이력이 있는 경우 행정사 상담 연결 절차를 알려줘" },
  ],
  vi: [
    { kind: "school", label: "So sánh trường", prompt: "So sánh trường tiếng Hàn được chứng nhận ở Seoul và Gyeonggi theo chi phí" },
    { kind: "cost", label: "Tính tổng phí", prompt: "Tính tổng chi phí cho 3 trường được đề xuất gồm học phí, ký túc xá và phí ban đầu" },
    { kind: "documents", label: "Hồ sơ visa", prompt: "Tạo checklist hồ sơ visa D-4 cho sinh viên Việt Nam" },
    { kind: "partner", label: "Tư vấn", prompt: "Cho tôi biết quy trình kết nối tư vấn hành chính nếu từng bị từ chối visa" },
  ],
  mn: [
    { kind: "school", label: "Сургууль харьцуулах", prompt: "Сөүл болон Кёнги дахь итгэмжлэгдсэн хэлний сургуулийг зардлаар харьцуул" },
    { kind: "cost", label: "Нийт зардал", prompt: "Санал болгосон 3 сургуулийн сургалтын төлбөр, дотуур байр, эхний зардлыг тооцоол" },
    { kind: "documents", label: "Визийн баримт", prompt: "Монгол оюутанд зориулсан D-4 визийн баримтын жагсаалт гарга" },
    { kind: "partner", label: "Зөвлөгөө", prompt: "Виз татгалзсан түүхтэй бол захиргааны зөвлөгөө холбох алхмыг тайлбарла" },
  ],
  en: [
    { kind: "school", label: "Compare schools", prompt: "Compare accredited language schools in Seoul and Gyeonggi by total cost" },
    { kind: "cost", label: "Estimate cost", prompt: "Calculate tuition, dormitory, and initial settlement cost for the top 3 schools" },
    { kind: "documents", label: "Visa documents", prompt: "Create a D-4 visa document checklist for a Vietnamese student" },
    { kind: "partner", label: "Expert help", prompt: "Explain how to connect to an immigration admin expert after a visa refusal" },
  ],
};

const CLARIFYING_LIBRARY: Record<Lang, Record<AgentMissingSlot, AgentClarifyingQuestion>> = {
  ko: {
    region: { slot: "region", label: "희망 지역", prompt: "희망 지역이 서울, 경기, 부산 중 어디인지 알려주세요." },
    program: { slot: "program", label: "과정", prompt: "어학당, 전문대, 학부, 대학원 중 어떤 과정을 원하나요?" },
    budget: { slot: "budget", label: "예산", prompt: "6개월 기준 예산을 원화로 알려주세요." },
    visa_type: { slot: "visa_type", label: "비자 종류", prompt: "현재 또는 신청하려는 체류자격 코드(예: D-2, D-4, D-10)를 알려주세요." },
    nationality: { slot: "nationality", label: "국적", prompt: "현재 국적을 알려주시면 서류와 결핵검진 여부를 더 정확히 볼 수 있습니다." },
    education: { slot: "education", label: "최종 학력", prompt: "최종 학력이 고졸, 전문대, 대졸, 석사 중 어디에 해당하나요?" },
    korean_level: { slot: "korean_level", label: "한국어 수준", prompt: "현재 TOPIK 급수나 한국어 수준을 알려주세요." },
    goal: { slot: "goal", label: "목표", prompt: "목표가 어학, 학위, 편입, 취업 준비 중 무엇인지 알려주세요." },
  },
  vi: {
    region: { slot: "region", label: "Khu vực", prompt: "Bạn muốn học ở Seoul, Gyeonggi, Busan hay khu vực khác?" },
    program: { slot: "program", label: "Chương trình", prompt: "Bạn muốn học tiếng Hàn, cao đẳng, đại học hay sau đại học?" },
    budget: { slot: "budget", label: "Ngân sách", prompt: "Cho biết ngân sách 6 tháng bằng KRW để tôi lọc chính xác hơn." },
    visa_type: { slot: "visa_type", label: "Loại visa", prompt: "Vui lòng cho biết mã tư cách lưu trú hiện tại hoặc dự định (ví dụ: D-2, D-4, D-10)." },
    nationality: { slot: "nationality", label: "Quốc tịch", prompt: "Cho biết quốc tịch để kiểm tra hồ sơ và khám lao chính xác hơn." },
    education: { slot: "education", label: "Học vấn", prompt: "Trình độ cao nhất của bạn là THPT, cao đẳng, đại học hay thạc sĩ?" },
    korean_level: { slot: "korean_level", label: "Tiếng Hàn", prompt: "Bạn có TOPIK mấy hoặc trình độ tiếng Hàn hiện tại thế nào?" },
    goal: { slot: "goal", label: "Mục tiêu", prompt: "Mục tiêu của bạn là học tiếng, lấy bằng, chuyển tiếp hay chuẩn bị việc làm?" },
  },
  mn: {
    region: { slot: "region", label: "Бүс", prompt: "Сөүл, Кёнги, Пусан эсвэл өөр бүс хүсэж байна уу?" },
    program: { slot: "program", label: "Хөтөлбөр", prompt: "Хэлний курс, коллеж, их сургууль эсвэл магистр аль нь вэ?" },
    budget: { slot: "budget", label: "Төсөв", prompt: "6 сарын төсвөө воноор хэлбэл илүү зөв шүүнэ." },
    visa_type: { slot: "visa_type", label: "Виз", prompt: "Одоогийн эсвэл хүсэж буй оршин суух ангиллын кодоо хэлнэ үү (жишээ: D-2, D-4, D-10)." },
    nationality: { slot: "nationality", label: "Иргэншил", prompt: "Иргэншлээ хэлбэл баримт, сүрьеэгийн шинжилгээг зөв шалгана." },
    education: { slot: "education", label: "Боловсрол", prompt: "Ахлах, коллеж, бакалавр, магистр аль түвшин вэ?" },
    korean_level: { slot: "korean_level", label: "Солонгос хэл", prompt: "TOPIK түвшин эсвэл солонгос хэлний түвшнээ хэлнэ үү." },
    goal: { slot: "goal", label: "Зорилго", prompt: "Зорилго тань хэл, зэрэг, шилжилт эсвэл ажилд бэлтгэх үү?" },
  },
  en: {
    region: { slot: "region", label: "Region", prompt: "Which region do you prefer: Seoul, Gyeonggi, Busan, or another area?" },
    program: { slot: "program", label: "Program", prompt: "Are you looking for language school, college, undergraduate, or graduate study?" },
    budget: { slot: "budget", label: "Budget", prompt: "Share your 6-month budget in KRW so I can filter more accurately." },
    visa_type: { slot: "visa_type", label: "Visa type", prompt: "What is your current or intended status code (for example D-2, D-4, or D-10)?" },
    nationality: { slot: "nationality", label: "Nationality", prompt: "Share your nationality so I can check document and TB-test requirements." },
    education: { slot: "education", label: "Education", prompt: "What is your highest education level: high school, college, university, or master's?" },
    korean_level: { slot: "korean_level", label: "Korean level", prompt: "What is your current Korean or TOPIK level?" },
    goal: { slot: "goal", label: "Goal", prompt: "Is your goal language study, a degree, transfer, or career preparation?" },
  },
};

function normalizeLang(lang: Lang): Lang {
  return lang === "vi" || lang === "mn" || lang === "en" ? lang : "ko";
}

function sourceKey(source: AgentSource): string {
  return [source.kind, source.url || "no-url", source.title, source.label].join("|").toLowerCase();
}

function pushSource(sources: AgentSource[], seen: Set<string>, source: AgentSource) {
  const key = sourceKey(source);
  if (seen.has(key)) return;
  seen.add(key);
  sources.push(source);
}

function compactText(value: unknown, max = 220): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return undefined;
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function basisFromKnowledgeDoc(value: unknown): string | undefined {
  const doc = asRecord(value);
  const ragMeta = asRecord(doc?.ragMeta);
  const excerpt = compactText(doc?.content);
  const checked = typeof ragMeta?.last_checked_at === "string" ? ragMeta.last_checked_at : undefined;
  const status = typeof ragMeta?.review_status === "string" ? ragMeta.review_status : undefined;
  const suffix = [checked ? `확인일 ${checked}` : null, status ? `검수 ${status}` : null].filter(Boolean).join(" · ");
  if (excerpt && suffix) return `${excerpt} (${suffix})`;
  return excerpt || suffix || undefined;
}

function basisFromSchoolResult(value: unknown): string | undefined {
  const school = asRecord(value);
  const parts = [
    typeof school?.region === "string" ? `지역 ${school.region}` : null,
    typeof school?.program === "string" ? `과정 ${school.program}` : null,
    typeof school?.tuition === "number" ? `학기당 ${school.tuition.toLocaleString()} KRW` : null,
    typeof school?.accreditation === "string" ? `인증 ${school.accreditation}` : null,
  ].filter(Boolean);
  const checked = typeof school?.verifiedAt === "string" ? `확인일 ${school.verifiedAt}` : null;
  return [...parts, checked].filter(Boolean).join(" · ") || undefined;
}

function extractSources(toolResults: ToolResult[]): AgentSource[] {
  const sources: AgentSource[] = [];
  const seen = new Set<string>();

  for (const item of toolResults) {
    if (item.tool === "search_knowledge" && Array.isArray(item.result)) {
      for (const doc of item.result) {
        const meta = doc?.sourceMeta;
        pushSource(sources, seen, {
          id: String(doc?.id || doc?.title || meta?.label || "knowledge"),
          title: String(doc?.title || meta?.label || "KAXI knowledge"),
          label: String(meta?.label || doc?.source || "KAXI knowledge"),
          url: typeof meta?.url === "string" ? meta.url : null,
          kind: meta?.owner === "internal" ? "internal" : "knowledge",
          owner: typeof meta?.owner === "string" ? meta.owner : undefined,
          verifiedAt: typeof meta?.verifiedAt === "string" ? meta.verifiedAt : undefined,
          reviewAfter: typeof meta?.reviewAfter === "string" ? meta.reviewAfter : undefined,
          sourceType: typeof meta?.sourceType === "string" ? meta.sourceType : undefined,
          reviewStatus: typeof meta?.reviewStatus === "string" ? meta.reviewStatus : undefined,
          checkedBy: typeof meta?.checkedBy === "string" ? meta.checkedBy : undefined,
          basis: basisFromKnowledgeDoc(doc),
          excerpt: compactText(doc?.content, 260),
        });
      }
    }

    if (item.tool === "search_schools" && Array.isArray(item.result)) {
      for (const school of item.result) {
        pushSource(sources, seen, {
          id: String(school?.id || school?.name || "school"),
          title: String(school?.name || "School"),
          label: String(school?.name || "School"),
          url: typeof school?.sourceUrl === "string" ? school.sourceUrl : typeof school?.officialUrl === "string" ? school.officialUrl : null,
          kind: "school",
          verifiedAt: typeof school?.verifiedAt === "string" ? school.verifiedAt : undefined,
          reviewAfter: typeof school?.reviewAfter === "string" ? school.reviewAfter : undefined,
          basis: basisFromSchoolResult(school),
        });
      }
    }
  }

  return sources.slice(0, 8);
}

function extractRagMetadata(toolResults: ToolResult[]): RagDocumentMetadata[] {
  const seen = new Set<string>();
  const metas: RagDocumentMetadata[] = [];
  for (const item of toolResults) {
    if (item.tool !== "search_knowledge" || !Array.isArray(item.result)) continue;
    for (const doc of item.result) {
      const meta = doc?.ragMeta;
      if (!meta || typeof meta.doc_id !== "string") continue;
      if (seen.has(meta.doc_id)) continue;
      seen.add(meta.doc_id);
      metas.push(meta as RagDocumentMetadata);
    }
  }
  return metas;
}

function extractRetrievalQuality(toolResults: ToolResult[]): { backends: string[]; pgvectorResultCount: number } {
  const backends = new Set<string>();
  let pgvectorResultCount = 0;

  for (const item of toolResults) {
    if (item.tool !== "search_knowledge" || !Array.isArray(item.result)) continue;
    for (const doc of item.result) {
      const method = typeof doc?.retrievalMethod === "string" ? doc.retrievalMethod : undefined;
      if (!method) continue;
      backends.add(method);
      if (method === "pgvector") pgvectorResultCount += 1;
    }
  }

  return { backends: Array.from(backends), pgvectorResultCount };
}

function buildPlan(toolResults: ToolResult[], lang: Lang): string[] {
  const uniqueTools = Array.from(new Set(toolResults.map((item) => item.tool)));
  const plan = uniqueTools
    .map((tool) => TOOL_PLAN_LABELS[tool]?.[lang])
    .filter((label): label is string => Boolean(label));
  return plan.length > 0 ? plan : FALLBACK_PLAN[lang];
}

export const DOCS_WORKSPACE_CTA_LABELS: Record<Lang, string> = {
  ko: "내 서류 워크스페이스에서 준비 상태 관리하기",
  vi: "Quản lý hồ sơ trong không gian tài liệu của tôi",
  mn: "Миний бичиг баримтын самбарт бэлтгэлээ удирдах",
  en: "Track these documents in my workspace",
};

export function docsWorkspaceHref(track?: string): string {
  return track === "D-2" || track === "D-4" ? `/docs?track=${track}` : "/docs";
}

function buildSuggestions(toolResults: ToolResult[], lang: Lang): AgentSuggestion[] {
  const used = new Set(toolResults.map((item) => item.tool));
  const suggestions: AgentSuggestion[] = SUGGESTION_LIBRARY[lang].filter((item) => {
    if (item.kind === "school") return !used.has("search_schools");
    if (item.kind === "cost") return !used.has("calculate_cost");
    if (item.kind === "documents") return !used.has("get_documents");
    if (item.kind === "partner") return !used.has("request_partner");
    return true;
  });
  if (used.has("get_documents")) {
    const documentsCall = toolResults.find((item) => item.tool === "get_documents");
    const visaType = typeof documentsCall?.args.visa_type === "string"
      ? (documentsCall.args.visa_type as string)
      : undefined;
    suggestions.unshift({
      kind: "documents",
      label: DOCS_WORKSPACE_CTA_LABELS[lang],
      prompt: "",
      href: docsWorkspaceHref(visaType),
    });
  }
  return suggestions.slice(0, 3);
}

function buildClarifyingQuestions(question: string, lang: Lang): AgentClarifyingQuestion[] {
  const analysis = analyzeAgentIntent(question, lang);
  return analysis.missingSlots
    .map((slot) => CLARIFYING_LIBRARY[lang][slot])
    .filter((item): item is AgentClarifyingQuestion => Boolean(item))
    .slice(0, 3);
}

function detectSafetyFlags(question: string, lang: Lang): string[] {
  const text = question.toLowerCase();
  const dangerous = /허위|fake|불법|illegal|비자\s*보장|visa\s*guarantee|취업\s*알선|job\s*placement/.test(text);
  if (!dangerous) return [];
  return [
    lang === "ko"
      ? "위험 요청 신호 감지: 허위서류, 불법취업, 비자 보장은 안내하지 않습니다."
      : "Safety signal detected: fake documents, illegal work, and visa guarantees are not supported.",
  ];
}

export function buildAgentMeta({
  lang,
  question,
  backend,
  grounded,
  toolResults,
  durationMs,
}: {
  lang: Lang;
  question: string;
  backend: string;
  grounded: boolean;
  toolResults: ToolResult[];
  durationMs?: number;
}): AgentMeta {
  const safeLang = normalizeLang(lang);
  const analysis = analyzeAgentIntent(question, safeLang);
  const sources = extractSources(toolResults);
  const sourceNotice = buildRagBasisNoticeFromMetadata(safeLang, extractRagMetadata(toolResults));
  const retrieval = extractRetrievalQuality(toolResults);
  const officialSourceCount = sources.filter((source) =>
    source.kind === "school" ||
    isOfficialKnowledgeSource({
      sourceType: source.sourceType,
      sourceUrl: source.url,
      owner: source.owner,
    })
  ).length;

  return {
    summary: SUMMARIES[safeLang](toolResults.length, sources.length),
    plan: buildPlan(toolResults, safeLang),
    sources,
    clarifyingQuestions: buildClarifyingQuestions(question, safeLang),
    suggestions: buildSuggestions(toolResults, safeLang),
    safetyFlags: detectSafetyFlags(question, safeLang),
    sourceNotice: sourceNotice || undefined,
    intentEvidence: {
      detectedSignals: analysis.evidence.detectedSignals,
      resolvedSlots: analysis.evidence.resolvedSlots,
      structuredSlots: analysis.evidence.structuredSlots,
      slotRequirements: analysis.evidence.slotRequirements,
      planReasons: analysis.evidence.planReasons,
      confidenceDrivers: analysis.evidence.confidenceDrivers,
    },
    quality: {
      backend,
      grounded,
      toolCount: toolResults.length,
      officialSourceCount,
      retrievalBackends: retrieval.backends,
      pgvectorResultCount: retrieval.pgvectorResultCount,
      intentConfidence: analysis.confidence,
      missingSlotCount: analysis.missingSlots.length,
      durationMs,
    },
  };
}
