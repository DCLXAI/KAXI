import type { ChatCategory } from "@/lib/chat/category";
import { createSupabaseChatClient } from "@/lib/chat/persistence";
import type { GuardedChatResponse, GuardrailLocale } from "@/lib/chat/response-guardrail";
import { RETRIEVAL_CONFIDENCE_POLICY_VERSION } from "@/lib/chat/retrieval-confidence";
import {
  createRagQueryEmbedding,
  type QueryEmbeddingResult,
} from "@/lib/chat/query-embedding";
import type { RagProvenance } from "@/lib/n8n/provenance";

export const DIRECT_LEXICAL_RUNTIME_PATH = "kaxi-direct-lexical";
export const DIRECT_HYBRID_RUNTIME_PATH = "kaxi-direct-hybrid";
export type DirectRagRuntimePath = typeof DIRECT_LEXICAL_RUNTIME_PATH | typeof DIRECT_HYBRID_RUNTIME_PATH;

export const DIRECT_LEXICAL_PROVENANCE = {
  workflowId: DIRECT_LEXICAL_RUNTIME_PATH,
  workflowVersionId: "kaxi-direct-lexical@2026-07-13.p1-v2",
  modelVersion: "retrieval/lexical-v2@2026-07-13",
  promptVersion: "kaxi-grounded-extractive@2026-07-13.p0-v1",
} satisfies RagProvenance;

export const DIRECT_HYBRID_PROVENANCE = {
  workflowId: DIRECT_HYBRID_RUNTIME_PATH,
  workflowVersionId: "kaxi-direct-hybrid@2026-07-14.p2-v2",
  modelVersion: "retrieval/hybrid-rrf-v3@2026-07-14",
  promptVersion: "kaxi-grounded-extractive@2026-07-13.p0-v1",
} satisfies RagProvenance;

export function directRagProvenance(runtimePath: DirectRagRuntimePath) {
  return runtimePath === DIRECT_HYBRID_RUNTIME_PATH
    ? DIRECT_HYBRID_PROVENANCE
    : DIRECT_LEXICAL_PROVENANCE;
}

type DirectLexicalRpcResult = {
  data: unknown;
  error?: unknown;
};

export type DirectLexicalRpc = (input: {
  matchCount: number;
  filter: Record<string, unknown>;
}) => Promise<DirectLexicalRpcResult>;

export type DirectHybridRpc = (input: {
  queryEmbedding: string | null;
  matchCount: number;
  filter: Record<string, unknown>;
}) => Promise<DirectLexicalRpcResult>;

export type DirectLexicalFallbackInput = {
  question: string;
  category: ChatCategory;
  locale: GuardrailLocale;
  tenantId: string;
  requestId: string;
  fallbackReason: string;
  attachmentCount?: number;
  allowStoredVectorExpansion?: boolean;
  runtimePath?: DirectRagRuntimePath;
  embedding?: QueryEmbeddingResult;
};

export type DirectLexicalResponse = GuardedChatResponse & RagProvenance & {
  answer: string;
  nextStep: string;
  runtimePath: DirectRagRuntimePath;
  executionId: string;
};

type CandidateDocument = {
  content: string;
  title: string;
  docId: string | null;
  source: string;
  sourceUrl: string;
  checkedAt: string;
  checkedBy: string;
  category: string;
  language: GuardrailLocale;
  baseScore: number;
  vectorScore: number | null;
  rrfScore: number | null;
  lexicalRank: number | null;
  vectorRank: number | null;
  keywordScore: number | null;
  tokenCoverage: number;
  titleCoverage: number;
  rerankScore: number;
  titleSanitized: boolean;
  originalRank: number;
};

type DirectSource = {
  title: string;
  docId: string | null;
  source: string;
  sourceUrl: string;
  checkedAt: string;
  checkedBy: string;
  citationValid: true;
  category: string;
  language: GuardrailLocale;
  languageMatch: true;
  titleSanitized: boolean;
  rerankScore: number;
  originalRank: number;
  hybridScore: number;
  vectorScore: number | null;
  rrfScore: number | null;
  lexicalRank: number | null;
  vectorRank: number | null;
  keywordScore: number | null;
};

const SUPPORTED_LOCALES = new Set<GuardrailLocale>(["ko", "en", "vi", "mn"]);
const HANGUL_RE = /[\uac00-\ud7a3\u3131-\u318e]/u;
const CYRILLIC_RE = /[\u0400-\u04ff]/u;
const VIETNAMESE_MARK_RE = /[\u0102-\u0103\u0110-\u0111\u0128-\u0129\u0168-\u0169\u01a0-\u01a1\u01af-\u01b0\u1ea0-\u1ef9]/iu;
const LATIN_RE = /[a-z]/iu;

const CATEGORY_SCOPES: Record<ChatCategory, readonly string[]> = {
  cost: ["cost"],
  visa: ["visa", "legal", "process", "warning"],
  documents: ["documents", "legal", "process", "warning"],
  school: ["school", "documents", "process"],
  general: [],
};

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "from", "that", "this", "what", "how", "please",
  "한국", "유학", "관련", "대해", "알려주세요", "문의", "궁금", "주세요",
  "các", "cho", "với", "này", "được", "hãy", "là", "và",
  "ямар", "тухай", "болон", "энэ", "хэрхэн", "уу", "вэ",
]);

const FALLBACK_TITLES: Record<GuardrailLocale, string> = {
  ko: "KAXI 승인 문서",
  en: "KAXI approved source",
  vi: "Nguồn KAXI đã duyệt",
  mn: "KAXI баталгаажсан эх сурвалж",
};

const QUERY_HINTS: Record<GuardrailLocale, Record<ChatCategory, string>> = {
  ko: {
    visa: "비자 체류자격 연장 변경 출입국",
    documents: "서류 증명서 재정증빙 여권",
    school: "학교 대학 입학 어학당",
    cost: "비용 학비 등록금 수수료 생활비",
    general: "한국 유학 비자",
  },
  en: {
    visa: "visa status stay extension immigration",
    documents: "documents certificate proof funds passport",
    school: "school university admission language program",
    cost: "cost tuition fee living expenses",
    general: "study Korea visa",
  },
  vi: {
    visa: "thị thực lưu trú gia hạn xuất nhập cảnh",
    documents: "hồ sơ giấy tờ chứng minh tài chính hộ chiếu",
    school: "trường đại học nhập học viện ngôn ngữ",
    cost: "chi phí học phí lệ phí sinh hoạt",
    general: "du học Hàn Quốc thị thực",
  },
  mn: {
    visa: "виз оршин суух сунгалт цагаачлал",
    documents: "бичиг баримт тодорхойлолт санхүү паспорт",
    school: "сургууль их сургууль элсэлт хэлний бэлтгэл",
    cost: "зардал сургалтын төлбөр хураамж амьжиргаа",
    general: "Солонгост сурах виз",
  },
};

const RISK_QUERY_HINTS: Record<GuardrailLocale, string> = {
  ko: "fake-documents-warning immigration-act-false-application-documents 허위 위조 서류 거짓 신청 은행 잔고증명 출입국 처벌",
  en: "fake-documents-warning immigration-act-false-application-documents false forged documents fake bank statement false immigration application penalty",
  vi: "fake-documents-warning immigration-act-false-application-documents hồ sơ giả giấy tờ giả sao kê ngân hàng khai báo sai xử phạt xuất nhập cảnh",
  mn: "fake-documents-warning immigration-act-false-application-documents хуурамч бичиг баримт банкны үлдэгдэл худал мэдүүлэг цагаачлалын шийтгэл",
};

const RISK_QUERY_PATTERN = /위조|가짜|허위\s*서류|fake|forg(?:e|ed|ery|ing)?|false\s+(?:document|application)|giả(?:\s*mạo)?|хуурамч|хуурмаг|system\s*prompt|시스템\s*프롬프트|систем(?:ийн)?\s*(?:prompt|промпт)/iu;

const LANGUAGE_STUDY_QUERY_HINTS: Record<GuardrailLocale, string> = {
  ko: "D-4 D4 어학연수 한국어 연수 유학비자",
  en: "D-4 D4 Korean language training student visa",
  vi: "D-4 D4 học tiếng Hàn đào tạo ngôn ngữ visa du học",
  mn: "D-4 D4 солонгос хэлний бэлтгэл суралцах виз",
};

const LANGUAGE_STUDY_PATTERN = /한국어.{0,12}(?:연수|공부|배우)|어학연수|study\s+(?:the\s+)?Korean|Korean\s+language\s+(?:study|program|training)|học\s+tiếng\s+Hàn|tiếng\s+Hàn.{0,16}(?:học|đào\s+tạo)|солонгос\s+хэл.{0,20}(?:сурах|бэлтгэл)|хэлний\s+бэлтгэл/iu;

const OPERATIONAL_QUERY_RULES: Array<{ pattern: RegExp; hint: string }> = [
  {
    pattern: /연장\s*신청|체류.{0,20}(?:만료|연장)|stay.{0,24}(?:expir|extension)|apply\s+for\s+an?\s+extension|sắp\s+hết\s+hạn|xin\s+gia\s+hạn|gia\s+hạn|хугацаа.{0,20}(?:дуус|сунг)|сунгалт/iu,
    hint: "hikorea-stay-extension immigration-act-stay-extension stay extension 체류기간 연장 gia hạn хугацаа сунгах",
  },
  {
    pattern: /이미\s*(?:지났|만료)|불법\s*체류|오버스테이|already\s+expired|overstay|đã\s+hết\s+hạn|quá\s+hạn|аль\s+хэдийн.{0,16}дуус|хугацаа\s*хэтэр/iu,
    hint: "immigration-act-deportation-grounds immigration-act-stay-extension hikorea-stay-extension overstay deportation",
  },
  {
    pattern: /d-?4.{0,40}(?:d-?2|바꾸|변경|전환)|change\s+from\s+d-?4|chuyển\s+từ\s+d-?4|d-?4.{0,30}d-?2|d-?4-өөс.{0,30}d-?2|шилжих/iu,
    hint: "hikorea-status-change immigration-act-status-change d-4-to-d-2-transfer change status 체류자격 변경",
  },
  {
    pattern: /강제퇴거|입국금지|deport(?:ed|ation)|entry\s*ban|trục\s*xuất|cấm\s*nhập\s*cảnh|албадан\s*гаргуул|нэвтрэх\s*хориг/iu,
    hint: "immigration-act-entry-ban entry ban deportation 입국금지",
  },
  {
    pattern: /허가\s*없이|무허가|불법\s*취업|without\s+(?:any\s+)?work\s+permit|illegal\s+employment|không\s+cần\s+giấy\s+phép|không\s+có\s+giấy\s+phép|зөвшөөрөлгүй/iu,
    hint: "illegal-employment-warning immigration-law-violation-risk immigration-act-outside-status-activity work permit",
  },
  {
    pattern: /잔고\s*증명|재정\s*증빙|bank\s+(?:balance|statement)|proof\s+of\s+funds|sổ\s*tiết\s*kiệm|chứng\s*minh\s*tài\s*chính|банкны\s*үлдэгдэл|санхүүгийн\s*нотолгоо/iu,
    hint: "financial-proof visa-documents bank balance certificate account holder issue date 재정증빙",
  },
  {
    pattern: /\bd-?10\b|job\s*seek(?:er|ing)|구직|ажил\s*хайх|tìm\s*việc/iu,
    hint: "d10-overview hikorea-d2-d4-d10-e7-f2-f5-requirements D-10 job seeker",
  },
];

const COPY = {
  ko: {
    topics: { visa: "비자·체류", documents: "준비 서류", school: "학교·입학", cost: "비용·재정", general: "문의하신 내용" },
    intro: (topic: string) => `${topic} 기준으로 공식 문서를 확인했어요. 핵심만 정리하면 다음과 같습니다.`,
    caution: "국적, 학교, 관할 기관과 현재 체류자격에 따라 조건이 달라질 수 있어요.",
    evidence: "근거",
    checked: "확인",
    noContext: "관련된 KAXI 승인 문서를 충분히 찾지 못했어요. 추측해서 답하지 않고 상담원 검토로 넘길게요.",
    noContextNext: "과정, 비자 종류, 현재 체류자격 또는 서류명을 포함해 다시 질문해 주세요.",
    next: {
      visa: "현재 체류자격, 만료일과 신청 예정 시점을 확인해 주세요.",
      documents: "학교 안내와 관할 기관 체크리스트로 최종 서류를 대조해 주세요.",
      school: "희망 과정, 지역과 입학 시기를 알려주시면 학교 조건을 더 좁혀볼 수 있어요.",
      cost: "과정, 학교와 체류 기간을 기준으로 실제 금액을 다시 확인해 주세요.",
      general: "현재 상황을 한 가지 더 알려주시면 문서 기준으로 이어서 확인해드릴게요.",
    },
  },
  en: {
    topics: { visa: "Visa and stay status", documents: "Required documents", school: "School and admission", cost: "Costs and finances", general: "Your question" },
    intro: (topic: string) => `I checked the approved sources for ${topic.toLowerCase()}. Here are the key points.`,
    caution: "Requirements can vary by nationality, school, authority, and current stay status.",
    evidence: "Sources",
    checked: "checked",
    noContext: "I could not find enough approved KAXI evidence to answer reliably. I will avoid guessing and route this for human review.",
    noContextNext: "Ask again with your program, visa type, current stay status, or document name.",
    next: {
      visa: "Confirm your current status, expiry date, and intended application date.",
      documents: "Cross-check the final documents against your school and responsible authority checklists.",
      school: "Share your preferred program, region, and intake so the school conditions can be narrowed down.",
      cost: "Confirm the actual amount for your program, school, and intended period of stay.",
      general: "Share one more detail about your situation and I can check the approved documents again.",
    },
  },
  vi: {
    topics: { visa: "visa và lưu trú", documents: "hồ sơ cần chuẩn bị", school: "trường và nhập học", cost: "chi phí và tài chính", general: "nội dung bạn hỏi" },
    intro: (topic: string) => `Tôi đã kiểm tra nguồn đã duyệt về ${topic}. Các điểm chính như sau.`,
    caution: "Điều kiện có thể khác tùy quốc tịch, trường, cơ quan phụ trách và tư cách lưu trú hiện tại.",
    evidence: "Nguồn",
    checked: "kiểm tra",
    noContext: "Tôi chưa tìm thấy đủ nguồn KAXI đã duyệt để trả lời đáng tin cậy. Tôi sẽ không phỏng đoán và chuyển nhân viên kiểm tra.",
    noContextNext: "Hãy hỏi lại kèm chương trình, loại visa, tình trạng lưu trú hiện tại hoặc tên giấy tờ.",
    next: {
      visa: "Hãy xác nhận tư cách lưu trú hiện tại, ngày hết hạn và thời điểm dự định nộp hồ sơ.",
      documents: "Đối chiếu hồ sơ cuối cùng với danh sách của trường và cơ quan phụ trách.",
      school: "Cho biết chương trình, khu vực và kỳ nhập học mong muốn để thu hẹp điều kiện trường.",
      cost: "Xác nhận số tiền thực tế theo chương trình, trường và thời gian lưu trú.",
      general: "Cho biết thêm một chi tiết về tình huống để tôi kiểm tra lại nguồn đã duyệt.",
    },
  },
  mn: {
    topics: { visa: "виз ба оршин суух", documents: "бүрдүүлэх баримт", school: "сургууль ба элсэлт", cost: "зардал ба санхүү", general: "таны асуулт" },
    intro: (topic: string) => `${topic}-тай холбоотой баталгаажсан эх сурвалжийг шалгалаа. Гол мэдээлэл:`,
    caution: "Нөхцөл нь иргэншил, сургууль, хариуцсан байгууллага болон одоогийн статусаас хамаарч өөр байж болно.",
    evidence: "Эх сурвалж",
    checked: "шалгасан",
    noContext: "Найдвартай хариулах хангалттай баталгаажсан KAXI эх сурвалж олдсонгүй. Таамаглахгүйгээр ажилтны хяналтад шилжүүлнэ.",
    noContextNext: "Хөтөлбөр, визний төрөл, одоогийн статус эсвэл баримтын нэрийг нэмээд дахин асууна уу.",
    next: {
      visa: "Одоогийн статус, дуусах огноо болон өргөдөл гаргах өдрөө шалгана уу.",
      documents: "Эцсийн баримтаа сургууль болон хариуцсан байгууллагын жагсаалттай тулгана уу.",
      school: "Хөтөлбөр, бүс нутаг болон элсэх улирлаа хэлбэл сургуулийн нөхцөлийг нарийсгаж болно.",
      cost: "Хөтөлбөр, сургууль болон оршин суух хугацаандаа тохирох бодит дүнг шалгана уу.",
      general: "Нөхцөл байдлынхаа нэг дэлгэрэнгүйг нэмбэл баталгаажсан баримтаар дахин шалгаж өгнө.",
    },
  },
} satisfies Record<GuardrailLocale, {
  topics: Record<ChatCategory, string>;
  intro: (topic: string) => string;
  caution: string;
  evidence: string;
  checked: string;
  noContext: string;
  noContextNext: string;
  next: Record<ChatCategory, string>;
}>;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function metadataRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const candidate = text(value);
    if (candidate) return candidate;
  }
  return "";
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value: number) {
  return Number(value.toFixed(4));
}

function booleanValue(value: unknown) {
  if (typeof value === "boolean") return value;
  return typeof value === "string" && value.toLowerCase() === "true";
}

function normalizeLocale(value: unknown): GuardrailLocale | null {
  const normalized = text(value).toLowerCase();
  const aliases: Record<string, GuardrailLocale> = {
    kr: "ko", "ko-kr": "ko", vn: "vi", "vi-vn": "vi",
    "en-us": "en", "en-gb": "en", "mn-mn": "mn",
  };
  const resolved = aliases[normalized] || normalized;
  return SUPPORTED_LOCALES.has(resolved as GuardrailLocale) ? resolved as GuardrailLocale : null;
}

function categoryAllowed(requested: ChatCategory, candidate: string) {
  if (requested === "general") return true;
  return CATEGORY_SCOPES[requested].includes(candidate.toLowerCase());
}

function tokenize(value: string) {
  return Array.from(new Set(
    (value.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}-]*/gu) || [])
      .filter((token) => token.length >= 2 && !STOP_WORDS.has(token)),
  ));
}

function tokenCoverage(queryTokens: string[], value: string) {
  if (queryTokens.length === 0) return 0;
  const candidateTokens = tokenize(value);
  if (candidateTokens.length === 0) return 0;
  const matched = queryTokens.filter((queryToken) => candidateTokens.some(
    (candidateToken) => candidateToken === queryToken
      || candidateToken.includes(queryToken)
      || queryToken.includes(candidateToken),
  ));
  return matched.length / queryTokens.length;
}

function contentMatchesLocale(content: string, metadata: Record<string, unknown>, locale: GuardrailLocale) {
  const reported = [metadata.language, metadata.locale_filter, metadata.locale]
    .map(normalizeLocale)
    .filter((value): value is GuardrailLocale => Boolean(value));
  if (reported.some((value) => value !== locale)) return false;

  const hasHangul = HANGUL_RE.test(content);
  const hasCyrillic = CYRILLIC_RE.test(content);
  const hasVietnameseMarks = VIETNAMESE_MARK_RE.test(content);
  const hasLatin = LATIN_RE.test(content);
  if (locale === "ko") return hasHangul && !hasCyrillic;
  if (locale === "en") return hasLatin && !hasHangul && !hasCyrillic && !hasVietnameseMarks;
  if (locale === "vi") return hasLatin && !hasHangul && !hasCyrillic;
  return hasCyrillic && !hasHangul;
}

function titleMatchesLocale(value: string, locale: GuardrailLocale) {
  const candidate = value
    .replace(/^#{1,6}\s+/, "")
    .replace(/\b(?:[cdef]-?\d+(?:-\d+)?|topik|kaxi|hikorea|kiip|arc|k-eta|krw|usd|pdf)\b/giu, " ")
    .replace(/[\d\s.,:;()[\]{}\/_+&-]+/g, " ")
    .trim();
  if (!candidate) return false;
  const hasHangul = HANGUL_RE.test(candidate);
  const hasCyrillic = CYRILLIC_RE.test(candidate);
  const hasVietnameseMarks = VIETNAMESE_MARK_RE.test(candidate);
  const hasLatin = LATIN_RE.test(candidate);
  if (locale === "ko") return hasHangul && !hasCyrillic && !hasLatin;
  if (locale === "en") return hasLatin && !hasHangul && !hasCyrillic && !hasVietnameseMarks;
  if (locale === "vi") return hasLatin && !hasHangul && !hasCyrillic;
  return hasCyrillic && !hasHangul;
}

function localizedTitle(content: string, metadataTitle: string, locale: GuardrailLocale) {
  const headings = content
    .split(/\r?\n/)
    .filter((line) => /^#{1,6}\s+/.test(line))
    .map((line) => line.replace(/^#{1,6}\s+/, "").trim());
  return [...headings, metadataTitle].find((value) => titleMatchesLocale(value, locale))
    || FALLBACK_TITLES[locale];
}

export function buildDirectLexicalQuery(input: DirectLexicalFallbackInput) {
  const visaCodes = input.question.match(/\b[cdef]-?\d+(?:-\d+)?\b/giu) || [];
  const codeAliases = visaCodes.flatMap((code) => {
    const compact = code.toUpperCase().replace(/-/g, "");
    return [compact, compact.replace(/^([CDEF])(\d)/, "$1-$2")];
  });
  const riskHint = RISK_QUERY_PATTERN.test(input.question) ? RISK_QUERY_HINTS[input.locale] : "";
  const languageStudyHint = LANGUAGE_STUDY_PATTERN.test(input.question)
    ? LANGUAGE_STUDY_QUERY_HINTS[input.locale]
    : "";
  const operationalHints = OPERATIONAL_QUERY_RULES
    .filter((rule) => rule.pattern.test(input.question))
    .map((rule) => rule.hint);
  return [
    input.question,
    QUERY_HINTS[input.locale][input.category],
    riskHint,
    languageStudyHint,
    ...operationalHints,
    ...codeAliases,
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 2_000);
}

function fallbackTimeoutMs() {
  const configured = Number(process.env.KAXI_DIRECT_RAG_TIMEOUT_MS);
  if (!Number.isFinite(configured)) return 8_000;
  return Math.min(Math.max(Math.trunc(configured), 1_000), 20_000);
}

async function defaultRpc(input: { matchCount: number; filter: Record<string, unknown> }) {
  const result = await createSupabaseChatClient()
    .rpc("match_rag_documents_lexical", {
      match_count: input.matchCount,
      filter: input.filter,
    })
    .abortSignal(AbortSignal.timeout(fallbackTimeoutMs()));
  return { data: result.data, error: result.error };
}

async function defaultHybridRpc(input: {
  queryEmbedding: string | null;
  matchCount: number;
  filter: Record<string, unknown>;
}) {
  const result = await createSupabaseChatClient()
    .rpc("match_rag_documents_hybrid_v3", {
      query_embedding: input.queryEmbedding,
      match_count: input.matchCount,
      filter: input.filter,
    })
    .abortSignal(AbortSignal.timeout(fallbackTimeoutMs()));
  return { data: result.data, error: result.error };
}

function rpcErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String(error.message);
  return String(error || "unknown Supabase RPC error");
}

function parseCandidates(rows: unknown, input: DirectLexicalFallbackInput) {
  const rawRows = Array.isArray(rows) ? rows : [];
  const queryTokens = tokenize(input.question);
  let citationRejectedCount = 0;
  let languageRejectedCount = 0;
  let categoryRejectedCount = 0;
  const parsed: CandidateDocument[] = [];

  rawRows.forEach((value, originalIndex) => {
    const row = metadataRecord(value);
    const metadata = metadataRecord(row.metadata);
    const content = firstText(row.content, row.pageContent, row.text);
    const sourceUrl = firstText(metadata.source_url, metadata.sourceUrl, metadata.url);
    const checkedAt = firstText(metadata.last_checked_at, metadata.lastCheckedAt, metadata.checkedAt);
    const checkedBy = firstText(metadata.checked_by, metadata.checkedBy);
    if (!content || !sourceUrl.startsWith("https://") || !checkedAt || !checkedBy) {
      citationRejectedCount += 1;
      return;
    }
    if (!contentMatchesLocale(content, metadata, input.locale)) {
      languageRejectedCount += 1;
      return;
    }
    const candidateCategory = firstText(metadata.category, "general").toLowerCase();
    if (!categoryAllowed(input.category, candidateCategory)) {
      categoryRejectedCount += 1;
      return;
    }

    const metadataTitle = firstText(metadata.title);
    const title = localizedTitle(content, metadataTitle, input.locale);
    const docId = firstText(metadata.doc_id, metadata.docId) || null;
    const bodyCoverage = tokenCoverage(queryTokens, `${title}\n${content}\n${firstText(metadata.keywords)}`);
    const headingCoverage = tokenCoverage(queryTokens, title);
    const baseScore = numberOrNull(metadata.lexical_score)
      ?? numberOrNull(metadata.hybrid_score)
      ?? numberOrNull(metadata.vector_score)
      ?? numberOrNull(metadata.keyword_score)
      ?? 0;
    const keywordScore = numberOrNull(metadata.keyword_score);
    const vectorScore = numberOrNull(metadata.vector_score);
    const categoryBoost = input.category === "general"
      ? 0
      : candidateCategory === input.category ? 0.18 : 0.08;
    const riskBoost = RISK_QUERY_PATTERN.test(input.question)
      && /fake|false|forg|violation|warning|위조|허위|가짜|giả|хуурамч|хуурмаг/iu.test(`${docId || ""} ${title}`)
      ? 0.58
      : 0;
    const questionVisaCodes = (input.question.match(/\b[cdef]-?\d+(?:-\d+)?\b/giu) || [])
      .map((value) => value.toLowerCase().replace(/-/g, ""));
    const candidateCodeText = `${docId || ""} ${title} ${content.slice(0, 1200)}`
      .toLowerCase()
      .replace(/-/g, "");
    const visaCodeBoost = questionVisaCodes.some((code) => candidateCodeText.includes(code)) ? 0.34 : 0;
    const rerankScore = round(
      baseScore
        + bodyCoverage * 0.45
        + headingCoverage * 0.25
        + categoryBoost
        + riskBoost
        + visaCodeBoost
        + 0.02,
    );

    parsed.push({
      content,
      title,
      docId,
      source: firstText(metadata.source, metadata.source_label, metadata.source_type, "rag_serving_chunks"),
      sourceUrl,
      checkedAt,
      checkedBy,
      category: candidateCategory,
      language: input.locale,
      baseScore: round(baseScore),
      vectorScore: vectorScore === null ? null : round(vectorScore),
      rrfScore: numberOrNull(metadata.rrf_score),
      lexicalRank: numberOrNull(metadata.lexical_rank),
      vectorRank: numberOrNull(metadata.vector_rank),
      keywordScore: keywordScore === null ? null : round(keywordScore),
      tokenCoverage: round(bodyCoverage),
      titleCoverage: round(headingCoverage),
      rerankScore,
      titleSanitized: !metadataTitle || metadataTitle.replace(/^#{1,6}\s+/, "").trim() !== title,
      originalRank: originalIndex + 1,
    });
  });

  const seen = new Set<string>();
  const documents = parsed
    .sort((left, right) => right.rerankScore - left.rerankScore || left.originalRank - right.originalRank)
    .filter((document) => {
      const key = document.docId || document.sourceUrl || `${document.title}|${document.content.slice(0, 120)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6);

  return {
    documents,
    rawCount: rawRows.length,
    citationRejectedCount,
    languageRejectedCount,
    categoryRejectedCount,
  };
}

function cleanSentence(value: string) {
  return value
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[-*•]\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sentences(value: string) {
  return value
    .split(/(?<=[.!?。！？\uB2E4\uC694\uC74C\uD568\uB428\uC784])\s+|\n+/u)
    .map(cleanSentence)
    .filter((sentence) => sentence.length >= 22 && sentence.length <= 420 && !/^https?:\/\//i.test(sentence));
}

function compact(value: string, maxLength = 170) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3).trim()}...`;
}

function answerFromDocuments(documents: CandidateDocument[], input: DirectLexicalFallbackInput) {
  const copy = COPY[input.locale];
  const queryTokens = tokenize(input.question);
  const picked: string[] = [];
  for (const document of documents.slice(0, 4)) {
    const ranked = sentences(document.content)
      .map((sentence, index) => ({
        sentence,
        index,
        score: tokenCoverage(queryTokens, sentence),
      }))
      .sort((left, right) => right.score - left.score || left.index - right.index);
    const candidate = ranked[0]?.sentence;
    if (!candidate) continue;
    const fingerprint = candidate.slice(0, 40).toLowerCase();
    if (!picked.some((existing) => existing.toLowerCase().includes(fingerprint))) {
      picked.push(compact(candidate));
    }
    if (picked.length >= 3) break;
  }

  const sources: DirectSource[] = documents.slice(0, 3).map((document) => ({
    title: document.title,
    docId: document.docId,
    source: document.source,
    sourceUrl: document.sourceUrl,
    checkedAt: document.checkedAt,
    checkedBy: document.checkedBy,
    citationValid: true,
    category: document.category,
    language: document.language,
    languageMatch: true,
    titleSanitized: document.titleSanitized,
    rerankScore: document.rerankScore,
    originalRank: document.originalRank,
    hybridScore: document.baseScore,
    vectorScore: document.vectorScore,
    rrfScore: document.rrfScore,
    lexicalRank: document.lexicalRank,
    vectorRank: document.vectorRank,
    keywordScore: document.keywordScore,
  }));
  const sourceLines = sources.map((source, index) => {
    const checkedDate = source.checkedAt.slice(0, 10);
    return `${index + 1}. ${source.title} - ${source.sourceUrl} (${checkedDate} ${copy.checked})`;
  });
  const topic = copy.topics[input.category];
  const bullets = picked.length > 0
    ? picked.map((sentence) => `- ${sentence}`)
    : [`- ${documents[0]?.title || FALLBACK_TITLES[input.locale]}`];
  return {
    answer: [
      copy.intro(topic),
      "",
      ...bullets,
      "",
      copy.caution,
      "",
      `${copy.evidence}:`,
      ...sourceLines,
    ].join("\n"),
    nextStep: copy.next[input.category],
    sources,
  };
}

function noContextReason(input: ReturnType<typeof parseCandidates>) {
  if (input.rawCount === 0) return "no_retrieval_match";
  if (input.languageRejectedCount > 0) return "locale_validation_failed";
  if (input.categoryRejectedCount > 0) return "category_validation_failed";
  if (input.citationRejectedCount > 0) return "citation_validation_failed";
  return "no_retrieval_match";
}

export function buildDirectLexicalResponseFromRows(
  rows: unknown,
  input: DirectLexicalFallbackInput,
): DirectLexicalResponse {
  const parsed = parseCandidates(rows, input);
  const runtimePath = input.runtimePath || DIRECT_LEXICAL_RUNTIME_PATH;
  const provenance = directRagProvenance(runtimePath);
  const hybrid = runtimePath === DIRECT_HYBRID_RUNTIME_PATH;
  const firstRow = Array.isArray(rows) ? metadataRecord(rows[0]) : {};
  const firstMetadata = metadataRecord(firstRow.metadata);
  const topScore = parsed.documents[0]?.rerankScore ?? 0;
  const secondScore = parsed.documents[1]?.rerankScore ?? 0;
  const reason = parsed.documents.length === 0 ? noContextReason(parsed) : null;
  const retrievalMode = firstText(firstMetadata.retrieval_mode)
    || (hybrid ? "hybrid-provider" : "lexical-only");
  const retrievalType = firstText(firstMetadata.retrieval_type)
    || (hybrid ? "hybrid-rrf-v3" : "lexical-v2");
  const scoreVersion = firstText(firstMetadata.score_version)
    || (hybrid ? "rrf-k60-provider-v3" : "absolute-weighted-v2");
  const searchMeta = {
    type: retrievalType,
    retrievalMode,
    scoreVersion,
    confidencePolicy: RETRIEVAL_CONFIDENCE_POLICY_VERSION,
    runtimePath,
    retrievalRuntimePath: runtimePath,
    fallbackReason: input.fallbackReason,
    embeddingStatus: input.embedding?.status || "not_attempted",
    embeddingProvider: input.embedding?.provider || "none",
    embeddingModel: input.embedding?.model || null,
    embeddingFailureReason: input.embedding?.failureReason || null,
    embeddingLatencyMs: input.embedding?.latencyMs ?? null,
    vectorStrategy: firstText(firstMetadata.embedding_source) || "none",
    vectorSearchAvailable: booleanValue(firstMetadata.vector_search_available),
    storedVectorSearch: booleanValue(firstMetadata.stored_vector_search),
    vectorSeedCount: numberOrNull(firstMetadata.vector_seed_count) ?? 0,
    category: input.category,
    categoryMode: "strict",
    tenant_id: input.tenantId,
    locale: input.locale,
    similarityThreshold: "category-default",
    reranker: "deterministic-locale-v2",
    reranked: true,
    retrievedCount: parsed.documents.length,
    rawRetrievedCount: parsed.rawCount,
    lexicalCandidateCount: numberOrNull(firstMetadata.lexical_candidate_count),
    vectorCandidateCount: numberOrNull(firstMetadata.vector_candidate_count),
    rejectedCitationCount: parsed.citationRejectedCount,
    languageRejectedCount: parsed.languageRejectedCount,
    categoryRejectedCount: parsed.categoryRejectedCount,
    titleSanitizedCount: parsed.documents.filter((document) => document.titleSanitized).length,
    topScore,
    secondScore,
    top1Top2Margin: round(Math.max(0, topScore - secondScore)),
    tokenCoverage: parsed.documents[0]?.tokenCoverage ?? 0,
    titleCoverage: parsed.documents[0]?.titleCoverage ?? 0,
    noContext: parsed.documents.length === 0,
    noContextReason: reason,
    attachmentCount: input.attachmentCount || 0,
  };
  const executionId = `direct-${input.requestId}`;

  if (parsed.documents.length === 0) {
    const copy = COPY[input.locale];
    return {
      answer: copy.noContext,
      nextStep: copy.noContextNext,
      needsHuman: true,
      riskLevel: "medium",
      leadStage: "review",
      sources: [],
      searchMeta,
      executionId,
      runtimePath,
      ...provenance,
    };
  }

  const grounded = answerFromDocuments(parsed.documents, input);
  const requiresReview = input.category === "visa" || input.category === "documents";
  return {
    ...grounded,
    needsHuman: requiresReview,
    riskLevel: input.category === "visa" || input.category === "documents" ? "medium" : "low",
    leadStage: requiresReview ? "review" : "none",
    searchMeta,
    executionId,
    runtimePath,
    ...provenance,
  };
}

export async function runDirectLexicalFallback(
  input: DirectLexicalFallbackInput,
  dependencies: { rpc?: DirectLexicalRpc } = {},
) {
  const rpc = dependencies.rpc || defaultRpc;
  const result = await rpc({
    matchCount: 12,
    filter: {
      tenant_id: input.tenantId,
      category: input.category,
      category_mode: "strict",
      locale: input.locale,
      query_text: buildDirectLexicalQuery(input),
    },
  });
  if (result.error) {
    throw new Error(`DIRECT_LEXICAL_RPC_FAILED: ${rpcErrorMessage(result.error)}`);
  }
  return buildDirectLexicalResponseFromRows(result.data, input);
}

export async function runDirectRagFallback(
  input: DirectLexicalFallbackInput,
  dependencies: {
    rpc?: DirectHybridRpc;
    createEmbedding?: (question: string) => Promise<QueryEmbeddingResult>;
  } = {},
) {
  let embedding: QueryEmbeddingResult;
  try {
    embedding = await (dependencies.createEmbedding || createRagQueryEmbedding)(input.question);
  } catch {
    embedding = {
      vector: null,
      status: "failed",
      provider: "none",
      model: "text-embedding-3-small",
      failureReason: "embedding_provider_unavailable",
      latencyMs: 0,
    };
  }
  const queryEmbedding = embedding.vector
    ? `[${embedding.vector.map((value) => Number(value).toFixed(8)).join(",")}]`
    : null;
  const allowSeededVector = !queryEmbedding
    && embedding.status === "not_configured"
    && input.allowStoredVectorExpansion === true
    && process.env.KAXI_STORED_VECTOR_EXPANSION_ENABLED !== "false";
  const rpc = dependencies.rpc || defaultHybridRpc;
  const result = await rpc({
    queryEmbedding,
    matchCount: 6,
    filter: {
      tenant_id: input.tenantId,
      category: input.category,
      category_mode: "strict",
      locale: input.locale,
      query_text: buildDirectLexicalQuery(input),
      embedding_failure_reason: embedding.failureReason || undefined,
      allow_seeded_vector: allowSeededVector,
      vector_seed_count: 3,
    },
  });
  if (result.error) {
    throw new Error(`DIRECT_RAG_RPC_FAILED: ${rpcErrorMessage(result.error)}`);
  }
  const firstRow = Array.isArray(result.data) ? metadataRecord(result.data[0]) : {};
  const firstMetadata = metadataRecord(firstRow.metadata);
  const retrievalMode = firstText(firstMetadata.retrieval_mode);
  const runtimePath = queryEmbedding
    || retrievalMode === "hybrid-provider"
    || retrievalMode === "hybrid-seeded"
    || retrievalMode === "vector-only"
    ? DIRECT_HYBRID_RUNTIME_PATH
    : DIRECT_LEXICAL_RUNTIME_PATH;
  return buildDirectLexicalResponseFromRows(result.data, {
    ...input,
    runtimePath,
    embedding,
  });
}

export function shouldUseDirectLexicalFallback(input: {
  status?: number;
  transportError?: unknown;
  emptyResponse?: boolean;
  invalidResponse?: boolean;
  configurationError?: boolean;
}) {
  if (input.transportError || input.emptyResponse || input.invalidResponse || input.configurationError) return true;
  if (typeof input.status !== "number") return false;
  return input.status >= 400;
}
