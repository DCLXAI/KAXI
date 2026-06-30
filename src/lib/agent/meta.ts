import type { Lang } from "@/lib/i18n/translations";
import type { ToolResult } from "@/lib/agent/tools";

export interface AgentSource {
  id: string;
  title: string;
  label: string;
  url: string | null;
  kind: "knowledge" | "school" | "internal";
  owner?: string;
  verifiedAt?: string;
  reviewAfter?: string;
}

export interface AgentSuggestion {
  kind: "school" | "cost" | "documents" | "partner";
  label: string;
  prompt: string;
}

export interface AgentMeta {
  summary: string;
  plan: string[];
  sources: AgentSource[];
  suggestions: AgentSuggestion[];
  safetyFlags: string[];
  quality: {
    backend: string;
    grounded: boolean;
    toolCount: number;
    officialSourceCount: number;
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
        });
      }
    }
  }

  return sources.slice(0, 8);
}

function buildPlan(toolResults: ToolResult[], lang: Lang): string[] {
  const uniqueTools = Array.from(new Set(toolResults.map((item) => item.tool)));
  const plan = uniqueTools
    .map((tool) => TOOL_PLAN_LABELS[tool]?.[lang])
    .filter((label): label is string => Boolean(label));
  return plan.length > 0 ? plan : FALLBACK_PLAN[lang];
}

function buildSuggestions(toolResults: ToolResult[], lang: Lang): AgentSuggestion[] {
  const used = new Set(toolResults.map((item) => item.tool));
  const suggestions = SUGGESTION_LIBRARY[lang].filter((item) => {
    if (item.kind === "school") return !used.has("search_schools");
    if (item.kind === "cost") return !used.has("calculate_cost");
    if (item.kind === "documents") return !used.has("get_documents");
    if (item.kind === "partner") return !used.has("request_partner");
    return true;
  });
  return suggestions.slice(0, 3);
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
  const sources = extractSources(toolResults);
  const officialSourceCount = sources.filter((source) => source.owner === "official" || source.kind === "school").length;

  return {
    summary: SUMMARIES[safeLang](toolResults.length, sources.length),
    plan: buildPlan(toolResults, safeLang),
    sources,
    suggestions: buildSuggestions(toolResults, safeLang),
    safetyFlags: detectSafetyFlags(question, safeLang),
    quality: {
      backend,
      grounded,
      toolCount: toolResults.length,
      officialSourceCount,
      durationMs,
    },
  };
}
