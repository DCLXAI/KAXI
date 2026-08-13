import type { ChatCategory } from "@/lib/chat/category";
import type { GuardrailLocale } from "@/lib/chat/response-guardrail";

// Deterministic retrieval tuning for the direct RAG path: every reranker
// coefficient and every Korea-jurisdiction intent/operational/risk rule
// lives HERE, as data. direct-lexical-fallback.ts owns the mechanism
// (tokenizing, coverage, scoring); this module owns the numbers and the
// domain vocabulary. A second jurisdiction means a second set of THESE
// tables — never a fork of the mechanism.

export const QUERY_HINTS: Record<GuardrailLocale, Record<ChatCategory, string>> = {
  ko: {
    visa: "비자 체류자격 연장 변경 출입국",
    documents: "서류 증명서 재정증빙 여권",
    school: "학교 대학 입학 어학당",
    cost: "한국 유학 비용 예산 학비 등록금 생활비 주거비 식비 교통비 수수료",
    general: "한국 유학 비자",
  },
  en: {
    visa: "visa status stay extension immigration",
    documents: "documents certificate proof funds passport",
    school: "school university admission language program",
    cost: "Korea study cost budget tuition living expenses housing food transport fee",
    general: "study Korea visa",
  },
  vi: {
    visa: "thị thực lưu trú gia hạn xuất nhập cảnh",
    documents: "hồ sơ giấy tờ chứng minh tài chính hộ chiếu",
    school: "trường đại học nhập học viện ngôn ngữ",
    cost: "chi phí du học Hàn Quốc ngân sách học phí sinh hoạt nhà ở ăn uống đi lại lệ phí",
    general: "du học Hàn Quốc thị thực",
  },
  mn: {
    visa: "виз оршин суух сунгалт цагаачлал",
    documents: "бичиг баримт тодорхойлолт санхүү паспорт",
    school: "сургууль их сургууль элсэлт хэлний бэлтгэл",
    cost: "Солонгост сурах зардал төсөв сургалтын төлбөр амьжиргаа байр хоол тээвэр хураамж",
    general: "Солонгост сурах виз",
  },
};

export const RISK_QUERY_HINTS: Record<GuardrailLocale, string> = {
  ko: "fake-documents-warning immigration-act-false-application-documents 허위 위조 서류 거짓 신청 은행 잔고증명 출입국 처벌",
  en: "fake-documents-warning immigration-act-false-application-documents false forged documents fake bank statement false immigration application penalty",
  vi: "fake-documents-warning immigration-act-false-application-documents hồ sơ giả giấy tờ giả sao kê ngân hàng khai báo sai xử phạt xuất nhập cảnh",
  mn: "fake-documents-warning immigration-act-false-application-documents хуурамч бичиг баримт банкны үлдэгдэл худал мэдүүлэг цагаачлалын шийтгэл",
};

export const RISK_QUERY_PATTERN = /위조|가짜|허위\s*서류|fake|forg(?:e|ed|ery|ing)?|false\s+(?:document|application)|giả(?:\s*mạo)?|хуурамч|хуурмаг|system\s*prompt|시스템\s*프롬프트|систем(?:ийн)?\s*(?:prompt|промпт)/iu;

export const LANGUAGE_STUDY_QUERY_HINTS: Record<GuardrailLocale, string> = {
  ko: "D-4 D4 어학연수 한국어 연수 유학비자",
  en: "D-4 D4 Korean language training student visa",
  vi: "D-4 D4 học tiếng Hàn đào tạo ngôn ngữ visa du học",
  mn: "D-4 D4 солонгос хэлний бэлтгэл суралцах виз",
};

export const LANGUAGE_STUDY_PATTERN = /한국어.{0,12}(?:연수|공부|배우)|어학연수|study\s+(?:the\s+)?Korean|Korean\s+language\s+(?:study|program|training)|học\s+tiếng\s+Hàn|tiếng\s+Hàn.{0,16}(?:học|đào\s+tạo)|солонгос\s+хэл.{0,20}(?:сурах|бэлтгэл)|хэлний\s+бэлтгэл/iu;

export const OPERATIONAL_QUERY_RULES: Array<{ pattern: RegExp; hint: string }> = [
  {
    pattern: /(?:한국\s*유학|유학\s*(?:준비|예산)).{0,32}(?:총\s*)?(?:비용|예산|얼마)|(?:cost\s+items?|budget|total\s+cost).{0,40}(?:stud(?:y|ying)|Korea)|(?:stud(?:y|ying)|Korea).{0,40}(?:cost\s+items?|budget|total\s+cost)|chi\s*phí\s*du\s*học\s*Hàn\s*Quốc|du\s*học\s*Hàn\s*Quốc.{0,32}chi\s*phí|Солонгост\s*сурах.{0,32}зард|сурах.{0,24}(?:нийт\s*)?зард/iu,
    hint: "cost-breakdown living-cost-breakdown tuition registration housing food transport 한국 유학 등록금 생활비 주거비 식비 교통비 học phí sinh hoạt nhà ở сургалтын төлбөр амьжиргаа",
  },
  {
    pattern: /(?:비자|체류|연장|자격\s*변경|민원).{0,24}수수료|수수료.{0,24}(?:비자|체류|연장|자격\s*변경|민원)|(?:visa|stay|extension|status\s*change|petition).{0,24}fees?|fees?.{0,24}(?:visa|stay|extension|status\s*change|petition)|lệ\s*phí.{0,24}(?:visa|lưu\s*trú|gia\s*hạn)|(?:виз|оршин\s*суух|сунгалт).{0,24}хураамж/iu,
    hint: "immigration-rule-fees hikorea-fees-processing-authentication visa stay petition fee 체류 민원 수수료 lệ phí lưu trú визний хураамж",
  },
  {
    pattern: LANGUAGE_STUDY_PATTERN,
    hint: "d4-overview D-4 Korean language training visa 어학연수 học tiếng Hàn солонгос хэлний бэлтгэл",
  },
  {
    pattern: /연장\s*신청|체류.{0,20}(?:만료|연장)|stay.{0,24}(?:expir|extension)|apply\s+for\s+an?\s+extension|sắp\s+hết\s+hạn|xin\s+gia\s+hạn|gia\s+hạn|хугацаа.{0,20}(?:дуус|сунг)|сунгалт/iu,
    hint: "hikorea-stay-extension immigration-act-stay-extension stay extension 체류기간 연장 gia hạn хугацаа сунгах",
  },
  {
    pattern: /이미\s*(?:지났|만료)|불법\s*체류|오버스테이|already\s+expired|overstay|đã\s+hết\s+hạn|thời\s*hạn\s*lưu\s*trú.{0,32}đã\s*hết|quá\s+hạn|аль\s+хэдийн.{0,16}дуус|хугацаа\s*хэтэр/iu,
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

export type QuestionIntent = {
  id: string;
  questionPattern: RegExp;
  evidencePattern: RegExp;
};

export const QUESTION_INTENTS: QuestionIntent[] = [
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

export const RISK_EVIDENCE_IDENTITY_PATTERN = /fake|false|forg|violation|warning|위조|허위|가짜|giả|хуурамч|хуурмаг/iu;

// Hand-tuned on the Korea corpus (2026-07). Change only alongside a
// test-retrieval-tuning update — each field is pinned there by a
// coefficient-isolating pair.
export const RERANK_WEIGHTS = {
  exactOperational: 0.56,
  operationalCoverageCap: 0.3,
  operationalCoverageWeight: 0.6,
  categoryExact: 0.18,
  categoryScope: 0.08,
  risk: 0.58,
  visaCode: 0.34,
  bodyCoverage: 0.45,
  headingCoverage: 0.25,
  bias: 0.02,
} as const;
