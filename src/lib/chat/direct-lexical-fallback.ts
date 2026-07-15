import type { ChatCategory } from "@/lib/chat/category";
import { createSupabaseChatClient } from "@/lib/chat/persistence";
import type { GuardedChatResponse, GuardrailLocale } from "@/lib/chat/response-guardrail";
import { RETRIEVAL_CONFIDENCE_POLICY_VERSION } from "@/lib/chat/retrieval-confidence";
import {
  createRagQueryEmbeddingWithLocalFallback,
  getRagEmbeddingStrategy,
  isCanonicalQueryEmbedding,
  isOpenAiQueryEmbedding,
  type QueryEmbeddingResult,
} from "@/lib/chat/query-embedding";
import {
  generateGroundedRagAnswer,
  GROUNDED_RAG_PROMPT_VERSION,
  type GroundedAnswerGenerator,
} from "@/lib/chat/grounded-rag-answer";
import {
  questionMediationMetadata,
  type QuestionConversationTurn,
  type QuestionMediation,
} from "@/lib/chat/question-mediator";
import type { RagProvenance } from "@/lib/n8n/provenance";
import type { SessionProfile } from "@/lib/chat/session-profile";
import { pickLangText } from "@/lib/data/knowledge";
import {
  searchPgvectorKnowledgeWithEmbedding,
  type PgvectorSearchResult,
} from "@/lib/embeddings/pgvector-rag";

export const DIRECT_LEXICAL_RUNTIME_PATH = "kaxi-direct-lexical";
export const DIRECT_HYBRID_RUNTIME_PATH = "kaxi-direct-hybrid";
export type DirectRagRuntimePath = typeof DIRECT_LEXICAL_RUNTIME_PATH | typeof DIRECT_HYBRID_RUNTIME_PATH;

export const DIRECT_LEXICAL_PROVENANCE = {
  workflowId: DIRECT_LEXICAL_RUNTIME_PATH,
  workflowVersionId: "kaxi-direct-lexical@2026-07-14.p6-v12",
  modelVersion: "retrieval/lexical-v2+rerank-v11@2026-07-14",
  promptVersion: GROUNDED_RAG_PROMPT_VERSION,
} satisfies RagProvenance;

export const DIRECT_HYBRID_PROVENANCE = {
  workflowId: DIRECT_HYBRID_RUNTIME_PATH,
  workflowVersionId: "kaxi-direct-hybrid@2026-07-14.p8-v12",
  modelVersion: "retrieval/hybrid-rrf-v3+rerank-v11@2026-07-14",
  promptVersion: GROUNDED_RAG_PROMPT_VERSION,
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

export type DirectCanonicalHybridSearch = (input: {
  query: string;
  queryEmbedding: number[];
  matchCount: number;
  locale: GuardrailLocale;
}) => Promise<DirectLexicalRpcResult>;

export type DirectRagSearchDependencies = {
  rpc?: DirectHybridRpc;
  createEmbedding?: (question: string) => Promise<QueryEmbeddingResult>;
  canonicalSearch?: DirectCanonicalHybridSearch;
};

export type DirectRagDependencies = DirectRagSearchDependencies & {
  generateAnswer?: GroundedAnswerGenerator;
};

export type DirectLexicalFallbackInput = {
  question: string;
  retrievalQuery?: string;
  category: ChatCategory;
  locale: GuardrailLocale;
  tenantId: string;
  requestId: string;
  fallbackReason: string;
  attachmentCount?: number;
  allowStoredVectorExpansion?: boolean;
  runtimePath?: DirectRagRuntimePath;
  embedding?: QueryEmbeddingResult;
  mediation?: QuestionMediation;
  conversationHistory?: QuestionConversationTurn[];
  profile?: SessionProfile;
  requireOpenAiEmbedding?: boolean;
  maxDocuments?: number;
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

export type ServingRagDocument = Readonly<{
  id: string;
  content: string;
  title: string;
  source: string;
  sourceUrl: string;
  checkedAt: string;
  checkedBy: string;
  category: string;
  language: GuardrailLocale;
  score: number;
  vectorScore: number | null;
  keywordScore: number | null;
  rerankScore: number;
}>;

export type ServingRagSearchResult = {
  documents: ServingRagDocument[];
  searchMeta: Record<string, unknown>;
  runtimePath: DirectRagRuntimePath;
  provenance: RagProvenance;
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

const HUMAN_REVIEW_REQUEST_PATTERN = /상담(?:원|사|자)?|담당자|사람(?:과|에게)?\s*(?:상담|문의|연결)|행정사|human\s+(?:agent|review|support)|talk\s+to\s+(?:a\s+)?person|nhân\s*viên|tư\s*vấn\s*viên|chuyên\s*viên|хүнтэй\s*(?:ярих|холбох)|мэргэжилтэн/iu;

const NON_USER_FACING_EVIDENCE_PATTERN = /(?:\bKAXI\b|챗봇|AI\s*(?:에이전트|agent)|answering\s+system|chatbot).{0,80}(?:답하지\s*말|답변해야|응답해야|안내해야|분기해야|전환해야|should\s+(?:answer|respond|route|handoff)|must\s+(?:answer|respond|route|handoff)|do\s+not\s+(?:answer|respond))/iu;

const LANGUAGE_STUDY_QUERY_HINTS: Record<GuardrailLocale, string> = {
  ko: "D-4 D4 어학연수 한국어 연수 유학비자",
  en: "D-4 D4 Korean language training student visa",
  vi: "D-4 D4 học tiếng Hàn đào tạo ngôn ngữ visa du học",
  mn: "D-4 D4 солонгос хэлний бэлтгэл суралцах виз",
};

const LANGUAGE_STUDY_PATTERN = /한국어.{0,12}(?:연수|공부|배우)|어학연수|study\s+(?:the\s+)?Korean|Korean\s+language\s+(?:study|program|training)|học\s+tiếng\s+Hàn|tiếng\s+Hàn.{0,16}(?:học|đào\s+tạo)|солонгос\s+хэл.{0,20}(?:сурах|бэлтгэл)|хэлний\s+бэлтгэл/iu;

const OPERATIONAL_QUERY_RULES: Array<{ pattern: RegExp; hint: string }> = [
  {
    pattern: LANGUAGE_STUDY_PATTERN,
    hint: "d4-overview D-4 Korean language training visa 어학연수 học tiếng Hàn солонгос хэлний бэлтгэл",
  },
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
    pattern: /잔고\s*증명|재정\s*증빙|bank\s+(?:balance|statement)|proof\s+of\s+funds|sổ\s*tiết\s*kiệm|chứng\s*minh\s*tài\s*chính|giấy\s*xác\s*nhận\s*số\s*dư|số\s*dư|tên\s*chủ\s*tài\s*khoản|банкны\s*үлдэгдэл|үлдэгдлийн\s*тодорхойлолт|санхүүгийн\s*нотолгоо/iu,
    hint: "financial-proof visa-documents bank balance certificate account holder issue date 재정증빙",
  },
  {
    pattern: /\bd-?10\b|job\s*seek(?:er|ing)|구직|ажил\s*хайх|tìm\s*việc/iu,
    hint: "d10-overview hikorea-d2-d4-d10-e7-f2-f5-requirements D-10 job seeker",
  },
];

type QuestionIntent = {
  id: string;
  questionPattern: RegExp;
  evidencePattern: RegExp;
};

const QUESTION_INTENTS: QuestionIntent[] = [
  {
    id: "required_documents",
    questionPattern: /서류|준비물|제출.{0,8}(?:자료|항목)|documents?|paperwork|requirements?\s+documents?|hồ\s*sơ|giấy\s*tờ|giấy\s*xác\s*nhận|chứng\s*minh\s*tài\s*chính|бичиг\s*баримт|материал|тодорхойлолт|гэрчилгээ|санхүүгийн\s*нотолгоо/iu,
    evidencePattern: /서류|제출|준비|증명서|여권|신청서|documents?|submit|certificate|passport|hồ\s*sơ|giấy\s*tờ|giấy\s*xác\s*nhận|chứng\s*minh|tài\s*chính|nộp|бичиг\s*баримт|материал|бүрдүүл|тодорхойлолт|гэрчилгээ|үлдэгдэл|санхүүгийн\s*(?:нотолгоо|баталгаа)/iu,
  },
  {
    id: "cost",
    questionPattern: /비용|학비(?!자)|등록금|수수료|예산|생활비|costs?|tuition|fees?|budget|chi\s*phí|học\s*phí|lệ\s*phí|зардал|сургалтын\s*төлбөр|хураамж/iu,
    evidencePattern: /비용|금액|원\b|학비|등록금|수수료|costs?|amount|krw|tuition|fees?|chi\s*phí|học\s*phí|won|зардал|дүн|төлбөр|вон/iu,
  },
  {
    id: "deadline_or_timing",
    questionPattern: /언제|시기|기한|며칠|몇\s*(?:일|개월|주)|기간|before|after|when|deadline|how\s+long|bao\s*lâu|khi\s*nào|thời\s*hạn|хэзээ|хугацаа/iu,
    evidencePattern: /전에|이내|이후|부터|까지|일\b|주\b|개월|기간|만료|before|after|within|days?|weeks?|months?|deadline|trước|sau|ngày|tuần|tháng|thời\s*hạn|өмнө|дараа|хоног|долоо\s*хоног|сар|хугацаа/iu,
  },
  {
    id: "eligibility",
    questionPattern: /자격\s*요건|신청\s*요건|조건|대상|가능한가|어떤\s*비자|eligible|eligibility|qualif(?:y|ication)|requirements?|what\s+visa|which\s+visa|visa\s+(?:do|should)\s+i|điều\s*kiện|đối\s*tượng|có\s*thể|visa\s+nào|шаардлага|нөхцөл|боломжтой|ямар\s+виз/iu,
    evidencePattern: /요건|조건|대상|해당|가능|자격|신청해야|필요(?:하|한)|eligible|eligibility|qualif|requirements?|must|\bis\s+for\b|\bcovers?\b|điều\s*kiện|đối\s*tượng|có\s*thể|dành\s+cho|là\s+(?:loại\s+)?visa\s+cho|шаардлага|нөхцөл|эрхтэй|боломжтой|зориулсан|нь.{0,24}виз/iu,
  },
  {
    id: "refusal_or_reapplication",
    questionPattern: /거절|불허|반려|재신청|재심|이의\s*신청|deni(?:al|ed)|refus(?:al|ed)|reapply|appeal|từ\s*chối|bị\s*từ\s*chối|nộp\s*lại|kháng\s*nghị|татгалз|дахин\s*өргөдөл|гомдол/iu,
    evidencePattern: /거절|불허|반려|재신청|재심|이의\s*신청|deni(?:al|ed)|refus(?:al|ed)|reapply|appeal|từ\s*chối|nộp\s*lại|kháng\s*nghị|татгалз|дахин\s*өргөдөл|гомдол/iu,
  },
  {
    id: "work_permission_or_hours",
    questionPattern: /아르바이트|시간제\s*취업|취업\s*허가|근무\s*시간|몇\s*시간|part[- ]?time|work\s*permit|working\s*hours?|làm\s*thêm|giấy\s*phép\s*làm\s*việc|giờ\s*làm|цагийн\s*ажил|ажиллах\s*зөвшөөрөл|ажлын\s*цаг/iu,
    evidencePattern: /시간제\s*취업|자격외활동|취업\s*허가|주당|시간|part[- ]?time|work\s*permit|hours?\s+per\s+week|làm\s*thêm|giấy\s*phép|giờ|цагийн\s*ажил|ажиллах\s*зөвшөөрөл|цаг/iu,
  },
  {
    id: "status_change",
    questionPattern: /체류자격.{0,12}(?:변경|전환)|비자.{0,12}(?:변경|전환)|바꾸|change\s+(?:of\s+)?status|switch\s+(?:a\s+)?visa|chuyển\s*đổi|đổi\s*visa|ангилал\s*солих|виз.{0,12}солих/iu,
    evidencePattern: /체류자격.{0,12}(?:변경|전환)|변경\s*허가|change\s+(?:of\s+)?status|switch\s+(?:a\s+)?visa|chuyển\s*đổi|đổi\s*visa|ангилал\s*солих|виз.{0,12}солих/iu,
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

const INTENT_LABELS: Record<GuardrailLocale, Record<string, string>> = {
  ko: {
    required_documents: "필요 서류",
    cost: "비용",
    deadline_or_timing: "신청 시기",
    eligibility: "신청 자격",
    refusal_or_reapplication: "거절·재신청",
    work_permission_or_hours: "취업 허가·시간",
    status_change: "체류자격 변경",
    school_selection: "학교 선택",
    general_information: "일반 안내",
  },
  en: {
    required_documents: "required documents",
    cost: "costs",
    deadline_or_timing: "timing or deadline",
    eligibility: "eligibility",
    refusal_or_reapplication: "refusal or reapplication",
    work_permission_or_hours: "work permission or hours",
    status_change: "status change",
    school_selection: "school selection",
    general_information: "general guidance",
  },
  vi: {
    required_documents: "hồ sơ cần thiết",
    cost: "chi phí",
    deadline_or_timing: "thời điểm hoặc thời hạn",
    eligibility: "điều kiện",
    refusal_or_reapplication: "từ chối hoặc nộp lại",
    work_permission_or_hours: "giấy phép hoặc giờ làm",
    status_change: "chuyển đổi tư cách lưu trú",
    school_selection: "chọn trường",
    general_information: "hướng dẫn chung",
  },
  mn: {
    required_documents: "шаардлагатай баримт",
    cost: "зардал",
    deadline_or_timing: "хугацаа",
    eligibility: "шаардлага",
    refusal_or_reapplication: "татгалзалт эсвэл дахин өргөдөл",
    work_permission_or_hours: "ажиллах зөвшөөрөл эсвэл цаг",
    status_change: "статус солих",
    school_selection: "сургууль сонгох",
    general_information: "ерөнхий мэдээлэл",
  },
};

function partialCoverageNotice(locale: GuardrailLocale, missingIntentIds: string[]) {
  if (missingIntentIds.length === 0) return null;
  const labels = missingIntentIds.map((intent) => INTENT_LABELS[locale][intent] || intent).join(", ");
  if (locale === "ko") return `다만 승인 문서만으로 ${labels}은(는) 확인하지 못했어요. 이 부분은 별도 확인이 필요합니다.`;
  if (locale === "vi") return `Tuy nhiên, nguồn đã duyệt chưa đủ để xác nhận ${labels}. Phần này cần được kiểm tra riêng.`;
  if (locale === "mn") return `Гэхдээ баталгаажсан эх сурвалжаар ${labels}-ийг тогтоох боломжгүй байна. Үүнийг тусад нь шалгах шаардлагатай.`;
  return `The approved sources do not confirm ${labels}. That part still needs a separate check.`;
}

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

function normalizedVisaCodes(value: string) {
  return Array.from(new Set(
    (value.match(/\b[cdef]-?\d+(?:-\d+)?\b/giu) || [])
      .map((code) => code.toLowerCase().replace(/-/g, "")),
  ));
}

function questionIntents(input: DirectLexicalFallbackInput) {
  // Mediator intents are advisory. Only explicit question text may impose a
  // hard evidence requirement, so a speculative router intent cannot erase a valid result.
  const intents = QUESTION_INTENTS.filter((intent) => intent.questionPattern.test(input.question));
  const requiredByCategory = input.category === "documents"
    ? "required_documents"
    : input.category === "cost" ? "cost" : null;
  if (requiredByCategory && !intents.some((intent) => intent.id === requiredByCategory)) {
    const fallbackIntent = QUESTION_INTENTS.find((intent) => intent.id === requiredByCategory);
    if (fallbackIntent) intents.push(fallbackIntent);
  }
  return intents;
}

const VISA_SUPPORTING_INTENTS = new Set([
  "deadline_or_timing",
  "eligibility",
  "refusal_or_reapplication",
  "status_change",
  "work_permission_or_hours",
]);

function answerableCategoryScopes(input: DirectLexicalFallbackInput) {
  if (input.category === "general") return [];

  const scopes = new Set(CATEGORY_SCOPES[input.category]);
  const intentIds = new Set(questionIntents(input).map((intent) => intent.id));

  // Keep category filtering strict while allowing only the supporting category
  // explicitly required by a multi-intent question (for example D-10 eligibility + documents).
  if (intentIds.has("required_documents")) scopes.add("documents");
  if (intentIds.has("cost")) scopes.add("cost");
  if ([...VISA_SUPPORTING_INTENTS].some((intent) => intentIds.has(intent))) scopes.add("visa");

  return [...scopes];
}

function retrievalCategoryScopes(input: DirectLexicalFallbackInput): ChatCategory[] {
  if (input.category === "general") return ["general"];

  const primaryScope = new Set(CATEGORY_SCOPES[input.category]);
  const categories: ChatCategory[] = [input.category];
  for (const scope of answerableCategoryScopes(input)) {
    if (primaryScope.has(scope) || !Object.hasOwn(CATEGORY_SCOPES, scope)) continue;
    categories.push(scope as ChatCategory);
  }
  return Array.from(new Set(categories));
}

function candidateSearchText(document: CandidateDocument) {
  return `${document.docId || ""}\n${document.title}\n${document.content}`;
}

function hasExactOperationalIdentity(
  input: DirectLexicalFallbackInput,
  document: Pick<CandidateDocument, "docId" | "title">,
) {
  const identity = `${document.docId || ""} ${document.title}`.toLowerCase();
  return OPERATIONAL_QUERY_RULES
    .filter((rule) => rule.pattern.test(input.question))
    .some((rule) => tokenize(rule.hint).some(
      (token) => token.includes("-") && identity.includes(token),
    ));
}

function selectAnswerableDocuments(
  documents: CandidateDocument[],
  input: DirectLexicalFallbackInput,
) {
  const maxDocuments = Math.min(6, Math.max(1, Math.trunc(input.maxDocuments || 4)));
  const requestedVisaCodes = normalizedVisaCodes([
    input.question,
    ...(input.mediation?.visaCodes || []),
  ].join(" "));
  const intents = questionIntents(input);
  let scoped = documents;

  if (requestedVisaCodes.length > 0) {
    const statusChange = intents.some((intent) => intent.id === "status_change");
    scoped = documents.filter((document) => {
      const candidateText = candidateSearchText(document);
      const candidateCodes = normalizedVisaCodes(candidateText);
      const identityCodes = normalizedVisaCodes(`${document.docId || ""} ${document.title}`);
      const codeMatch = statusChange && requestedVisaCodes.length > 1
        ? requestedVisaCodes.every((code) => candidateCodes.includes(code))
        : requestedVisaCodes.some((code) => candidateCodes.includes(code));
      const genericSupportingEvidence = identityCodes.length === 0
        && candidateCodes.length === 0
        && intents.some((intent) => intent.evidencePattern.test(candidateText));
      return codeMatch || genericSupportingEvidence;
    });
    if (scoped.length === 0) {
      return {
        documents: [],
        reason: "visa_code_mismatch",
        requestedVisaCodes,
        intents,
        coveredIntentIds: [] as string[],
        missingIntentIds: intents.map((intent) => intent.id),
      };
    }
  }

  if (intents.length > 0) {
    const matching = scoped.filter((document) => intents.some(
      (intent) => intent.evidencePattern.test(candidateSearchText(document)),
    ));
    const coveredIntentIds = intents
      .filter((intent) => matching.some(
        (document) => intent.evidencePattern.test(candidateSearchText(document)),
      ))
      .map((intent) => intent.id);
    const coveredIntentSet = new Set(coveredIntentIds);
    const missingIntentIds = intents
      .map((intent) => intent.id)
      .filter((intentId) => !coveredIntentSet.has(intentId));
    if (coveredIntentIds.length === 0) {
      return {
        documents: [],
        reason: "question_intent_mismatch",
        requestedVisaCodes,
        intents,
        coveredIntentIds,
        missingIntentIds,
      };
    }
    return {
      documents: matching.slice(0, maxDocuments),
      reason: null,
      requestedVisaCodes,
      intents,
      coveredIntentIds,
      missingIntentIds,
    };
  }

  return {
    documents: scoped.slice(0, maxDocuments),
    reason: null,
    requestedVisaCodes,
    intents,
    coveredIntentIds: [] as string[],
    missingIntentIds: [] as string[],
  };
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
  const visaCodes = [
    ...(input.question.match(/\b[cdef]-?\d+(?:-\d+)?\b/giu) || []),
    ...(input.mediation?.visaCodes || []),
  ];
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
    input.retrievalQuery,
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

function canonicalSearchRows(results: PgvectorSearchResult[], locale: GuardrailLocale) {
  return results.map((result) => {
    const metadata = result.doc.ragMeta;
    return {
      id: result.chunkId,
      content: pickLangText(result.doc.content, locale),
      metadata: {
        doc_id: metadata?.doc_id || result.doc.id,
        title: pickLangText(result.doc.title, locale),
        source: metadata?.source_label || result.doc.source,
        source_label: metadata?.source_label || result.doc.source,
        source_url: metadata?.source_url || result.doc.source,
        source_type: metadata?.source_type || "internal_analysis",
        last_checked_at: metadata?.last_checked_at,
        checked_by: metadata?.checked_by,
        category: result.doc.category,
        language: metadata?.language || locale,
        retrieval_type: "hybrid-canonical-e5",
        retrieval_mode: "hybrid-canonical",
        score_version: "canonical-score-fusion-v1",
        embedding_source: "canonical-query",
        vector_search_available: true,
        stored_vector_search: true,
        vector_seed_count: 0,
        hybrid_score: result.score,
        vector_score: result.vectorScore,
        keyword_score: result.keywordScore,
        rrf_score: result.rrf,
        lexical_rank: result.keywordRank,
        vector_rank: result.vectorRank,
        lexical_candidate_count: results.length,
        vector_candidate_count: results.length,
      },
    };
  });
}

async function defaultCanonicalHybridSearch(input: {
  query: string;
  queryEmbedding: number[];
  matchCount: number;
  locale: GuardrailLocale;
}) {
  try {
    const results = await searchPgvectorKnowledgeWithEmbedding(
      input.query,
      input.queryEmbedding,
      { topK: input.matchCount, languages: [input.locale] },
    );
    return { data: canonicalSearchRows(results, input.locale) };
  } catch (error) {
    return { data: null, error };
  }
}

function rpcErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String(error.message);
  return String(error || "unknown Supabase RPC error");
}

async function runIntentScopedRpc(
  input: DirectLexicalFallbackInput,
  invoke: (category: ChatCategory) => Promise<DirectLexicalRpcResult>,
) {
  const results = await Promise.all(retrievalCategoryScopes(input).map(invoke));
  const failed = results.find((result) => result.error);
  if (failed) return { data: null, error: failed.error };
  return {
    data: results.flatMap((result) => Array.isArray(result.data) ? result.data : []),
  };
}

function parseCandidates(rows: unknown, input: DirectLexicalFallbackInput) {
  const rawRows = Array.isArray(rows) ? rows : [];
  const queryTokens = tokenize(input.retrievalQuery || input.question);
  const allowedCategories = answerableCategoryScopes(input);
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
    if (input.category !== "general" && !allowedCategories.includes(candidateCategory)) {
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
    const operationalRules = OPERATIONAL_QUERY_RULES.filter((rule) => rule.pattern.test(input.question));
    const exactOperationalHint = hasExactOperationalIdentity(input, { docId, title });
    const operationalHintTokens = tokenize(operationalRules.map((rule) => rule.hint).join(" "));
    const operationalCoverage = operationalHintTokens.length > 0
      ? tokenCoverage(operationalHintTokens, `${docId || ""} ${title} ${firstText(metadata.keywords)}`)
      : 0;
    const operationalBoost = exactOperationalHint ? 0.56 : Math.min(0.3, operationalCoverage * 0.6);
    const categoryBoost = input.category === "general"
      ? 0
      : candidateCategory === input.category ? 0.18 : 0.08;
    const riskBoost = RISK_QUERY_PATTERN.test(input.question)
      && /fake|false|forg|violation|warning|위조|허위|가짜|giả|хуурамч|хуурмаг/iu.test(`${docId || ""} ${title}`)
      ? 0.58
      : 0;
    const questionVisaCodes = normalizedVisaCodes([
      input.question,
      ...(input.mediation?.visaCodes || []),
    ].join(" "));
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
        + operationalBoost
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
    .filter((sentence) => !/^\s*#{1,6}\s+/.test(sentence))
    .map(cleanSentence)
    .filter((sentence) => sentence.length >= 22
      && sentence.length <= 420
      && !/^https?:\/\//i.test(sentence)
      && !NON_USER_FACING_EVIDENCE_PATTERN.test(sentence));
}

function compact(value: string, maxLength = 170) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3).trim()}...`;
}

function sourcesFromDocuments(documents: CandidateDocument[]): DirectSource[] {
  return documents.slice(0, 3).map((document) => ({
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
}

function answerWithSources(
  answer: string,
  sources: DirectSource[],
  locale: GuardrailLocale,
) {
  const copy = COPY[locale];
  const sourceLines = sources.map((source, index) => {
    const checkedDate = source.checkedAt.slice(0, 10);
    return `${index + 1}. ${source.title} - ${source.sourceUrl} (${checkedDate} ${copy.checked})`;
  });
  return [answer.trim(), "", `${copy.evidence}:`, ...sourceLines].join("\n");
}

function remapCitations(answer: string, sourceIndexes: number[]) {
  const citationMap = new Map(sourceIndexes.map((sourceIndex, index) => [sourceIndex, index + 1]));
  return answer.replace(/\[(\d+)]/g, (citation, rawIndex: string) => {
    const mapped = citationMap.get(Number(rawIndex));
    return mapped ? `[${mapped}]` : citation;
  });
}

function answerFromDocuments(
  documents: CandidateDocument[],
  input: DirectLexicalFallbackInput,
  missingIntentIds: string[] = [],
) {
  const copy = COPY[input.locale];
  const queryTokens = tokenize(input.question);
  const intents = questionIntents(input);
  const picked: Array<{ sentence: string; document: CandidateDocument }> = [];
  for (const document of documents.slice(0, 4)) {
    const ranked = sentences(document.content)
      .map((sentence, index) => {
        const coverage = tokenCoverage(queryTokens, sentence);
        const intentMatches = intents.filter((intent) => intent.evidencePattern.test(sentence)).length;
        return {
          sentence,
          index,
          coverage,
          intentMatches,
          score: coverage + intentMatches * 0.2,
        };
      })
      .filter((candidate) => candidate.coverage >= 0.08 || candidate.intentMatches > 0)
      .sort((left, right) => right.score - left.score || left.index - right.index);
    const candidate = ranked[0]?.sentence;
    if (!candidate) continue;
    const fingerprint = candidate.slice(0, 40).toLowerCase();
    if (!picked.some((existing) => existing.sentence.toLowerCase().includes(fingerprint))) {
      picked.push({ sentence: compact(candidate), document });
    }
    if (picked.length >= 3) break;
  }

  if (picked.length === 0) return null;
  const usedDocuments = picked.map((item) => item.document).filter(
    (document, index, all) => all.findIndex((candidate) => candidate.docId === document.docId
      && candidate.sourceUrl === document.sourceUrl) === index,
  );
  const sources = sourcesFromDocuments(usedDocuments);
  const topic = copy.topics[input.category];
  const bullets = picked.map((item) => `- ${item.sentence}`);
  const missingNotice = partialCoverageNotice(input.locale, missingIntentIds);
  return {
    answer: answerWithSources([
      copy.intro(topic),
      "",
      ...bullets,
      ...(missingNotice ? ["", missingNotice] : []),
      "",
      copy.caution,
    ].join("\n"), sources, input.locale),
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
  const selection = selectAnswerableDocuments(parsed.documents, input);
  const extractive = selection.documents.length > 0
    ? answerFromDocuments(selection.documents, input, selection.missingIntentIds)
    : null;
  const hasContext = Boolean(extractive);
  const runtimePath = input.runtimePath || DIRECT_LEXICAL_RUNTIME_PATH;
  const provenance = directRagProvenance(runtimePath);
  const hybrid = runtimePath === DIRECT_HYBRID_RUNTIME_PATH;
  const firstRow = Array.isArray(rows) ? metadataRecord(rows[0]) : {};
  const firstMetadata = metadataRecord(firstRow.metadata);
  const topScore = selection.documents[0]?.rerankScore ?? 0;
  const secondScore = selection.documents[1]?.rerankScore ?? 0;
  const reason = parsed.documents.length === 0
    ? noContextReason(parsed)
    : selection.reason || (!extractive ? "insufficient_sentence_overlap" : null);
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
    embeddingDimensions: input.embedding?.dimensions ?? null,
    embeddingFailureReason: input.embedding?.failureReason || null,
    embeddingLatencyMs: input.embedding?.latencyMs ?? null,
    embeddingStrategy: input.embedding?.strategy || getRagEmbeddingStrategy(),
    embeddingFallbackFrom: input.embedding?.fallbackFrom || null,
    embeddingPrimaryFailureReason: input.embedding?.primaryFailureReason || null,
    vectorStrategy: firstText(firstMetadata.embedding_source) || "none",
    vectorSearchAvailable: booleanValue(firstMetadata.vector_search_available),
    storedVectorSearch: booleanValue(firstMetadata.stored_vector_search),
    vectorSeedCount: numberOrNull(firstMetadata.vector_seed_count) ?? 0,
    category: input.category,
    categoryMode: "strict",
    categoryScopeMode: "intent-aware-strict",
    allowedCategories: answerableCategoryScopes(input),
    tenant_id: input.tenantId,
    locale: input.locale,
    similarityThreshold: "category-default",
    reranker: "deterministic-locale-intent-v11",
    reranked: true,
    retrievalCategoryScopes: retrievalCategoryScopes(input),
    retrievedCount: hasContext ? selection.documents.length : 0,
    validatedCandidateCount: parsed.documents.length,
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
    tokenCoverage: selection.documents[0]?.tokenCoverage ?? 0,
    titleCoverage: selection.documents[0]?.titleCoverage ?? 0,
    requestedVisaCodes: selection.requestedVisaCodes,
    questionIntents: selection.intents.map((intent) => intent.id),
    coveredIntents: selection.coveredIntentIds,
    missingIntents: selection.missingIntentIds,
    intentCoverage: selection.intents.length > 0
      ? round(selection.coveredIntentIds.length / selection.intents.length)
      : 1,
    partialContext: hasContext && selection.missingIntentIds.length > 0,
    answerMode: hasContext
      ? selection.missingIntentIds.length > 0 ? "extractive-partial-fallback" : "extractive-fallback"
      : "no-context",
    noContext: !hasContext,
    noContextReason: reason,
    attachmentCount: input.attachmentCount || 0,
    ...(input.mediation ? questionMediationMetadata(input.mediation) : {}),
  };
  const executionId = `direct-${input.requestId}`;

  if (!extractive) {
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

  const requiresReview = input.mediation?.needsHumanReview === true
    || HUMAN_REVIEW_REQUEST_PATTERN.test(input.question);
  return {
    ...extractive,
    needsHuman: requiresReview,
    riskLevel: requiresReview ? "medium" : "low",
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
  const queryText = buildDirectLexicalQuery(input);
  const result = await runIntentScopedRpc(input, (category) => rpc({
    matchCount: 12,
    filter: {
      tenant_id: input.tenantId,
      category,
      category_mode: "strict",
      locale: input.locale,
      query_text: queryText,
    },
  }));
  if (result.error) {
    throw new Error(`DIRECT_LEXICAL_RPC_FAILED: ${rpcErrorMessage(result.error)}`);
  }
  return buildDirectLexicalResponseFromRows(result.data, input);
}

async function retrieveDirectRagCandidates(
  input: DirectLexicalFallbackInput,
  dependencies: DirectRagSearchDependencies = {},
) {
  let embedding: QueryEmbeddingResult;
  const embeddingQuestion = input.retrievalQuery || input.question;
  try {
    embedding = await (dependencies.createEmbedding || createRagQueryEmbeddingWithLocalFallback)(embeddingQuestion);
  } catch {
    embedding = {
      vector: null,
      status: "failed",
      provider: "none",
      model: "text-embedding-3-small",
      dimensions: null,
      failureReason: "embedding_provider_unavailable",
      latencyMs: 0,
    };
  }
  const canonicalEmbedding = isCanonicalQueryEmbedding(embedding);
  const openAiEmbedding = isOpenAiQueryEmbedding(embedding);
  if ((input.requireOpenAiEmbedding || getRagEmbeddingStrategy() === "openai-only") && !openAiEmbedding) {
    throw new Error(`OPENAI_QUERY_EMBEDDING_REQUIRED: ${embedding.failureReason || embedding.status}`);
  }
  const queryEmbedding = embedding.vector && !canonicalEmbedding
    ? `[${embedding.vector.map((value) => Number(value).toFixed(8)).join(",")}]`
    : null;
  const exactVisaScope = normalizedVisaCodes([
    input.question,
    ...(input.mediation?.visaCodes || []),
  ].join(" ")).length > 0;
  const allowSeededVector = !queryEmbedding
    && embedding.status === "not_configured"
    && input.allowStoredVectorExpansion === true
    && !exactVisaScope
    && process.env.KAXI_STORED_VECTOR_EXPANSION_ENABLED !== "false";
  const queryText = buildDirectLexicalQuery(input);
  const result = canonicalEmbedding
    ? await (dependencies.canonicalSearch || defaultCanonicalHybridSearch)({
        query: queryText,
        queryEmbedding: embedding.vector as number[],
        matchCount: 24,
        locale: input.locale,
      })
    : await runIntentScopedRpc(input, (category) => (dependencies.rpc || defaultHybridRpc)({
      queryEmbedding,
      matchCount: 12,
      filter: {
        tenant_id: input.tenantId,
        category,
        category_mode: "strict",
        locale: input.locale,
        query_text: queryText,
        embedding_failure_reason: embedding.failureReason || undefined,
        allow_seeded_vector: allowSeededVector,
        vector_seed_count: 3,
      },
    }));
  if (result.error) {
    throw new Error(`DIRECT_RAG_RPC_FAILED: ${rpcErrorMessage(result.error)}`);
  }
  const firstRow = Array.isArray(result.data) ? metadataRecord(result.data[0]) : {};
  const firstMetadata = metadataRecord(firstRow.metadata);
  const retrievalMode = firstText(firstMetadata.retrieval_mode);
  const runtimePath: DirectRagRuntimePath = canonicalEmbedding
    || queryEmbedding
    || retrievalMode === "hybrid-provider"
    || retrievalMode === "hybrid-seeded"
    || retrievalMode === "vector-only"
    ? DIRECT_HYBRID_RUNTIME_PATH
    : DIRECT_LEXICAL_RUNTIME_PATH;
  const resolvedInput = {
    ...input,
    runtimePath,
    embedding,
  };
  const parsed = parseCandidates(result.data, resolvedInput);
  const selection = selectAnswerableDocuments(parsed.documents, resolvedInput);
  return {
    data: result.data,
    resolvedInput,
    selection,
    runtimePath,
  };
}

export async function searchServingRagDocuments(
  input: DirectLexicalFallbackInput,
  dependencies: DirectRagSearchDependencies = {},
): Promise<ServingRagSearchResult> {
  const retrieval = await retrieveDirectRagCandidates(input, dependencies);
  const fallbackResponse = buildDirectLexicalResponseFromRows(retrieval.data, retrieval.resolvedInput);
  const searchMeta = metadataRecord(fallbackResponse.searchMeta);
  return {
    documents: retrieval.selection.documents.map((document) => ({
      id: document.docId || `chunk-${document.originalRank}`,
      content: document.content,
      title: document.title,
      source: document.source,
      sourceUrl: document.sourceUrl,
      checkedAt: document.checkedAt,
      checkedBy: document.checkedBy,
      category: document.category,
      language: document.language,
      score: document.baseScore,
      vectorScore: document.vectorScore,
      keywordScore: document.keywordScore,
      rerankScore: document.rerankScore,
    })),
    searchMeta,
    runtimePath: retrieval.runtimePath,
    provenance: directRagProvenance(retrieval.runtimePath),
  };
}

export async function runDirectRagFallback(
  input: DirectLexicalFallbackInput,
  dependencies: DirectRagDependencies = {},
) {
  const retrieval = await retrieveDirectRagCandidates(input, dependencies);
  const { resolvedInput, selection } = retrieval;
  const fallbackResponse = buildDirectLexicalResponseFromRows(retrieval.data, resolvedInput);
  if (selection.documents.length === 0) return fallbackResponse;
  const currentSearchMeta = metadataRecord(fallbackResponse.searchMeta);

  const generation = await (dependencies.generateAnswer || generateGroundedRagAnswer)({
    question: input.question,
    category: input.category,
    locale: input.locale,
    answerFocus: input.mediation?.answerFocus,
    responseMode: input.mediation?.responseMode,
    coveredIntents: selection.coveredIntentIds,
    missingIntents: selection.missingIntentIds,
    conversationHistory: input.conversationHistory,
    profile: input.profile,
    documents: selection.documents.map((document) => ({
      title: document.title,
      content: document.content,
      source: document.source,
      sourceUrl: document.sourceUrl,
      checkedAt: document.checkedAt,
      checkedBy: document.checkedBy,
    })),
  });
  if (generation.status === "unavailable") {
    return {
      ...fallbackResponse,
      searchMeta: {
        ...currentSearchMeta,
        answerGenerationStatus: "unavailable",
        answerGenerationFailureReason: generation.reason,
        answerPromptVersion: GROUNDED_RAG_PROMPT_VERSION,
      },
    };
  }

  const generatedMetadata = {
    answerGenerationStatus: generation.status,
    answerBackend: generation.backend,
    answerModel: generation.model,
    answerLatencyMs: generation.durationMs,
    answerPromptVersion: GROUNDED_RAG_PROMPT_VERSION,
  };
  if (generation.status === "no_context") {
    const exactOperationalEvidence = selection.documents.some((document) =>
      hasExactOperationalIdentity(resolvedInput, document)
    );
    const fallbackSourcesAvailable = Array.isArray(fallbackResponse.sources)
      && fallbackResponse.sources.length > 0;
    const partialEvidenceAvailable = selection.coveredIntentIds.length > 0
      && selection.missingIntentIds.length > 0;
    if (
      (exactOperationalEvidence || partialEvidenceAvailable)
      && currentSearchMeta.noContext !== true
      && fallbackSourcesAvailable
    ) {
      return {
        ...fallbackResponse,
        searchMeta: {
          ...currentSearchMeta,
          ...generatedMetadata,
          answerMode: "extractive-model-no-context-fallback",
          noContext: false,
          noContextReason: null,
          modelNoContextOverridden: true,
          modelNoContextOverrideReason: exactOperationalEvidence
            ? "exact_operational_evidence"
            : "partial_intent_evidence",
        },
      };
    }
    const copy = COPY[input.locale];
    return {
      ...fallbackResponse,
      answer: copy.noContext,
      nextStep: generation.nextStep || copy.noContextNext,
      needsHuman: true,
      riskLevel: "medium",
      leadStage: "review",
      sources: [],
      searchMeta: {
        ...currentSearchMeta,
        ...generatedMetadata,
        answerMode: "no-context",
        retrievedCount: 0,
        noContext: true,
        noContextReason: "grounded_generation_no_context",
      },
      modelVersion: generation.model,
      promptVersion: GROUNDED_RAG_PROMPT_VERSION,
    };
  }

  const usedSourceIndexes = Array.from(new Set(generation.usedSourceIndexes)).sort((left, right) => left - right);
  const usedDocuments = usedSourceIndexes.flatMap((sourceIndex) => {
    const document = selection.documents[sourceIndex - 1];
    return document ? [document] : [];
  });
  if (usedDocuments.length === 0) {
    return {
      ...fallbackResponse,
      searchMeta: {
        ...currentSearchMeta,
        answerGenerationStatus: "unavailable",
        answerGenerationFailureReason: "invalid_generation",
        answerPromptVersion: GROUNDED_RAG_PROMPT_VERSION,
      },
    };
  }
  const sources = sourcesFromDocuments(usedDocuments);
  const answer = remapCitations(generation.answer, usedSourceIndexes);
  return {
    ...fallbackResponse,
    answer: answerWithSources(answer, sources, input.locale),
    nextStep: generation.nextStep,
    sources,
    searchMeta: {
      ...currentSearchMeta,
      ...generatedMetadata,
      answerMode: selection.missingIntentIds.length > 0 ? "grounded-llm-partial" : "grounded-llm",
      retrievedCount: selection.documents.length,
      noContext: false,
      noContextReason: null,
    },
    modelVersion: generation.model,
    promptVersion: GROUNDED_RAG_PROMPT_VERSION,
  };
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
