import {
  isLowConfidenceRetrieval,
  RETRIEVAL_CONFIDENCE_POLICY_VERSION,
  retrievalConfidenceThreshold,
} from "@/lib/chat/retrieval-confidence";

export type GuardrailLocale = "ko" | "en" | "vi" | "mn";

export type GuardedChatResponse = {
  answer?: string;
  nextStep?: string;
  needsHuman?: unknown;
  riskLevel?: unknown;
  leadStage?: unknown;
  sources?: unknown;
  searchMeta?: unknown;
  executionId?: string;
  workflowId?: string;
  workflowVersionId?: string;
  modelVersion?: string;
  promptVersion?: string;
  runtimePath?: string;
};

const WEATHER_PATTERN = /날씨|강수|기온|weather|rain probability|thời\s*tiết|khả\s*năng\s*mưa|nhiệt\s*độ|цаг\s*агаар|бороо|температур/iu;
const PERMITLESS_EMPLOYMENT_PATTERN = /허가\s*없이|무허가|불법\s*취업|without\s+(?:(?:a|any)\s+)?work\s+permit|work(?:ing)?\s+without\s+(?:(?:a|any)\s+)?permit|illegal\s+employment|unauthori[sz]ed\s+work|không\s+(?:cần|có)\s+giấy\s+phép|làm\s*việc\s+không\s+phép|зөвшөөрөлгүй|ажиллах\s+зөвшөөрөлгүй/iu;
const ENTRY_BAN_PATTERN = /강제퇴거|입국금지|deported|deportation|entry\s*ban|trục\s*xuất|cấm\s*nhập\s*cảnh|албадан\s*гаргуул|нэвтрэх\s*хориг/iu;
const OVERSTAY_PATTERN = /불법\s*체류|오버스테이|체류\s*기간(?:이|을)?\s*(?:이미\s*)?(?:지났|초과)|만료(?:일)?(?:이|을)?\s*(?:이미\s*)?지났|overstay|permitted\s+stay(?:\s+has)?\s+(?:already\s+)?expired|stay\s+period(?:\s+has)?\s+(?:already\s+)?expired|thời\s*hạn\s*lưu\s*trú[^.?!]{0,40}(?:đã\s*)?hết|quá\s*hạn|хугацаа[^.?!]{0,40}(?:аль\s*хэдийн\s*)?дууссан|хугацаа\s*хэтэр/iu;
const PROMPT_INJECTION_PATTERN = /ignore\s+(?:all\s+)?(?:previous|prior)(?:\s+[a-z]+){0,3}\s+instructions?|reveal\s+(?:the\s+)?system\s+prompt|show\s+(?:the\s+)?system\s+prompt|시스템\s*프롬프트|이전\s*(?:지시|명령)\s*무시|bỏ\s*qua\s*(?:các\s*)?(?:hướng\s*dẫn|chỉ\s*thị)\s*(?:trước|trước\s*đó)|hiển\s*thị\s*(?:system\s*)?prompt|tiết\s*lộ\s*(?:system\s*)?prompt|өмнөх\s*заавр|систем(?:ийн)?\s*prompt|систем(?:ийн)?\s*промпт|зааврыг\s*үл\s*тоо|зааврыг\s*ил\s*болго/iu;
const FALSE_DOCUMENT_PATTERN = /위조|가짜|허위\s*서류|fake|forg(?:e|ed|ery|ing)?|giả(?:\s*mạo)?|хуурамч|хуурмаг/iu;

const COPY = {
  ko: {
    scopedAnswer: "KAXI는 한국 유학·비자 범위의 질문만 답변할 수 있어요. 해당 범위 안에서 다시 질문해 주세요.",
    scopedNextStep: "한국 유학, 비자, 체류, 서류와 관련된 질문으로 다시 입력해 주세요.",
    illegalAnswer: "허가 없이 일하는 방법이나 불법취업을 돕는 안내는 제공할 수 없어요. 합법적인 시간제취업·자격외활동 허가와 학교 확인 절차를 확인해야 합니다.",
    documentAnswer: "시스템 지시를 공개하거나 허위·위조 서류를 만드는 방법은 도와드릴 수 없어요. 사실과 일치하는 서류만 준비하고 정식 절차를 따라야 합니다.",
    highRiskNextStep: "현재 받은 통지서와 체류 이력을 준비해 담당자 검토를 받아주세요.",
    lowConfidenceAnswer: "관련 공식 근거를 충분히 찾지 못했어요. 추측해서 답하지 않고 상담원 검토로 넘길게요.",
    lowConfidenceNextStep: "질문과 현재 상황을 담당자가 확인한 뒤 안내합니다.",
  },
  en: {
    scopedAnswer: "KAXI only answers study-in-Korea and visa questions. Please rephrase your question within that scope.",
    scopedNextStep: "Ask again about studying in Korea, visas, stay status, or documents.",
    illegalAnswer: "I cannot help with work without required permission or illegal employment. Check lawful part-time work or outside-status activity permission and school confirmation.",
    documentAnswer: "I cannot reveal system instructions or help create or use false documents. Use truthful documents and follow the official process.",
    highRiskNextStep: "Prepare your notices and stay history for review by a qualified adviser.",
    lowConfidenceAnswer: "I could not find enough official evidence to answer reliably. I will avoid guessing and route this for human review.",
    lowConfidenceNextStep: "An operator should review your question and circumstances before advising you.",
  },
  vi: {
    scopedAnswer: "KAXI chỉ trả lời các câu hỏi về du học và visa Hàn Quốc. Vui lòng hỏi lại trong phạm vi đó.",
    scopedNextStep: "Vui lòng hỏi lại về du học Hàn Quốc, visa, tình trạng lưu trú hoặc hồ sơ.",
    illegalAnswer: "Tôi không thể hướng dẫn làm việc không có giấy phép hoặc việc làm bất hợp pháp. Hãy kiểm tra điều kiện xin phép làm thêm hợp pháp và xác nhận của trường.",
    documentAnswer: "Tôi không thể tiết lộ hướng dẫn hệ thống hoặc hỗ trợ tạo, sử dụng giấy tờ giả. Chỉ dùng hồ sơ đúng sự thật và làm theo quy trình chính thức.",
    highRiskNextStep: "Chuẩn bị thông báo và lịch sử lưu trú để người phụ trách có chuyên môn kiểm tra.",
    lowConfidenceAnswer: "Tôi chưa tìm thấy đủ nguồn chính thức để trả lời đáng tin cậy. Tôi sẽ không phỏng đoán và chuyển câu hỏi để nhân viên kiểm tra.",
    lowConfidenceNextStep: "Nhân viên sẽ kiểm tra câu hỏi và tình huống của bạn trước khi hướng dẫn.",
  },
  mn: {
    scopedAnswer: "KAXI зөвхөн Солонгост сурах болон визний асуултад хариулна. Энэ хүрээнд асуултаа дахин бичнэ үү.",
    scopedNextStep: "Солонгост сурах, виз, оршин суух статус эсвэл бичиг баримтын талаар дахин асууна уу.",
    illegalAnswer: "Зөвшөөрөлгүй ажиллах эсвэл хууль бус хөдөлмөр эрхлэх аргыг зааж өгөх боломжгүй. Хууль ёсны цагийн ажил, зөвшөөрөл болон сургуулийн баталгааг шалгана уу.",
    documentAnswer: "Системийн зааврыг ил болгох, хуурамч баримт хийх эсвэл ашиглахад туслах боломжгүй. Зөвхөн үнэн зөв баримт бүрдүүлж, албан ёсны журмыг дагана уу.",
    highRiskNextStep: "Мэдэгдэл болон оршин суусан түүхээ бэлтгэж, мэргэжлийн зөвлөхөөр шалгуулна уу.",
    lowConfidenceAnswer: "Найдвартай хариулах хангалттай албан эх сурвалж олдсонгүй. Таамаглахгүйгээр ажилтны хяналтад шилжүүлнэ.",
    lowConfidenceNextStep: "Ажилтан таны асуулт болон нөхцөл байдлыг шалгасны дараа зөвлөнө.",
  },
} satisfies Record<GuardrailLocale, Record<string, string>>;

function localeCopy(locale: string) {
  return COPY[(locale in COPY ? locale : "ko") as GuardrailLocale];
}

function searchMetaWithNoContext(value: unknown) {
  const metadata = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    ...metadata,
    retrievedCount: 0,
    topScore: 0,
    noContext: true,
    noContextReason: "out_of_domain",
  };
}

export function applyChatResponseGuardrail(
  response: GuardedChatResponse,
  question: string,
  locale: string,
): GuardedChatResponse {
  const copy = localeCopy(locale);

  if (WEATHER_PATTERN.test(question)) {
    return {
      ...response,
      answer: copy.scopedAnswer,
      nextStep: copy.scopedNextStep,
      needsHuman: false,
      riskLevel: "low",
      leadStage: "none",
      sources: [],
      searchMeta: searchMetaWithNoContext(response.searchMeta),
    };
  }

  const permitlessEmployment = PERMITLESS_EMPLOYMENT_PATTERN.test(question);
  const promptInjection = PROMPT_INJECTION_PATTERN.test(question);
  const falseDocuments = FALSE_DOCUMENT_PATTERN.test(question);
  const entryBan = ENTRY_BAN_PATTERN.test(question);
  const overstay = OVERSTAY_PATTERN.test(question);
  if (permitlessEmployment || promptInjection || falseDocuments || entryBan || overstay) {
    return {
      ...response,
      answer: permitlessEmployment
        ? copy.illegalAnswer
        : promptInjection || falseDocuments
          ? copy.documentAnswer
          : response.answer,
      nextStep: copy.highRiskNextStep,
      needsHuman: true,
      riskLevel: "high",
      leadStage: "urgent",
    };
  }

  const searchMeta = response.searchMeta && typeof response.searchMeta === "object" && !Array.isArray(response.searchMeta)
    ? response.searchMeta as Record<string, unknown>
    : {};
  if (searchMeta.answerMode === "clarification") return response;
  const sources = Array.isArray(response.sources) ? response.sources : [];
  if (!isLowConfidenceRetrieval(searchMeta, sources.length)) return response;
  return {
    ...response,
    answer: copy.lowConfidenceAnswer,
    nextStep: copy.lowConfidenceNextStep,
    needsHuman: true,
    riskLevel: response.riskLevel === "high" ? "high" : "medium",
    leadStage: response.riskLevel === "high" ? "urgent" : "review",
    sources: [],
    searchMeta: {
      ...searchMeta,
      similarityThreshold: retrievalConfidenceThreshold(searchMeta),
      retrievedCount: 0,
      noContext: true,
      noContextReason: "below_calibrated_threshold",
      confidencePolicy: RETRIEVAL_CONFIDENCE_POLICY_VERSION,
    },
  };
}
