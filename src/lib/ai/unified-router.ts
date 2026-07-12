import type { Lang } from "@/lib/i18n/translations";

export type UnifiedAiCapability = "action" | "expert";
export type UnifiedExpertMode = "general" | "visa" | "documents" | "appeal" | "business";

export interface UnifiedAiRouteDecision {
  capability: UnifiedAiCapability;
  mode: UnifiedExpertMode | null;
  reason: string;
}

export interface UnifiedAiRoutingContext {
  previousCapability?: UnifiedAiCapability | null;
  previousExpertMode?: UnifiedExpertMode | null;
}

const ACTION_SIGNAL = /(?:찾아|검색|비교|계산|만들|생성|작성해|체크리스트|추천|진단|연결|접수|저장|업로드|find|search|compare|calculate|create|generate|make|checklist|recommend|diagnose|connect|request|save|upload|tìm|so sánh|tính|tạo|lập danh sách|đề xuất|chẩn đoán|kết nối|gửi yêu cầu|хадгал|хайж|хайх|харьцуул|тооцоол|үүсгэ|жагсаалт|санал болго|онош|холб)/i;
const HIGH_RISK_SIGNAL = /(?:허위|위조|불법|비자\s*보장|강제퇴거|출국명령|범죄|처벌|벌금|fake|forg(?:e|ed)|illegal|visa\s*guarantee|deport|removal order|criminal|penalt|fine|giả|bất hợp pháp|bảo đảm visa|trục xuất|hình phạt|tiền phạt|хуурамч|хууль бус|визийн баталгаа|албадан гаргах|ял|торгууль)/i;
const APPEAL_SIGNAL = /(?:거절|불허|취소|재신청|이의신청|행정심판|refus|deni|reject|cancel(?:led|ation)?|reapply|appeal|từ chối|bị hủy|xin lại|khiếu nại|татгалз|цуцлаг|дахин хүсэлт|гомдол)/i;
const BUSINESS_SIGNAL = /(?:유학원|행정사법|직업안정법|등록\s*없이|대행업|알선료|consultancy business|agency license|unlicensed agency|administrative scrivener act|dịch vụ du học|giấy phép tư vấn|kinh doanh tư vấn|зуучлалын газар|зөвлөгөөний бизнес|тусгай зөвшөөрөл)/i;
const VISA_SIGNAL = /(?:비자|체류|출입국|체류자격|연장|자격변경|아르바이트|취업허가|d\s*[-–]?\s*[24]|visa|immigration|status of stay|residen|extension|change of status|part[- ]?time work|thị thực|visa|lưu trú|xuất nhập cảnh|gia hạn|đổi tư cách|làm thêm|виз|оршин суух|цагаачлал|сунгалт|статус өөрчлөх|цагийн ажил)/i;
const DOCUMENT_SIGNAL = /(?:서류|재정증명|잔고증명|입학허가서|공증|번역|결핵진단|document|financial proof|bank statement|admission letter|notari|translation|tuberculosis|hồ sơ|chứng minh tài chính|sổ tiết kiệm|công chứng|dịch thuật|lao phổi|баримт|санхүүгийн баталгаа|банкны хуулга|нотариат|орчуулга|сүрьеэ)/i;

function inferExpertMode(text: string): UnifiedExpertMode {
  if (APPEAL_SIGNAL.test(text)) return "appeal";
  if (BUSINESS_SIGNAL.test(text)) return "business";
  if (DOCUMENT_SIGNAL.test(text) || HIGH_RISK_SIGNAL.test(text)) return "documents";
  if (VISA_SIGNAL.test(text)) return "visa";
  return "general";
}

export function decideUnifiedAiRoute(
  question: string,
  context: UnifiedAiRoutingContext = {},
): UnifiedAiRouteDecision {
  const normalized = question.replace(/\s+/g, " ").trim();

  if (HIGH_RISK_SIGNAL.test(normalized)) {
    return { capability: "expert", mode: inferExpertMode(normalized), reason: "safety_high_risk" };
  }
  if (APPEAL_SIGNAL.test(normalized)) {
    return { capability: "expert", mode: "appeal", reason: "visa_appeal" };
  }
  if (BUSINESS_SIGNAL.test(normalized)) {
    return { capability: "expert", mode: "business", reason: "business_compliance" };
  }
  if (ACTION_SIGNAL.test(normalized)) {
    return { capability: "action", mode: null, reason: "explicit_action" };
  }
  if (VISA_SIGNAL.test(normalized) || DOCUMENT_SIGNAL.test(normalized)) {
    return { capability: "expert", mode: inferExpertMode(normalized), reason: "regulated_guidance" };
  }
  if (context.previousCapability === "expert") {
    return {
      capability: "expert",
      mode: context.previousExpertMode || "general",
      reason: "expert_followup",
    };
  }
  return { capability: "action", mode: null, reason: "general_assistance" };
}

export function unifiedRouteLabel(lang: Lang, capability: UnifiedAiCapability): string {
  const labels: Record<Lang, Record<UnifiedAiCapability, string>> = {
    ko: { action: "도구 실행", expert: "공식 문서 상담" },
    vi: { action: "Thực hiện công cụ", expert: "Tư vấn nguồn chính thức" },
    mn: { action: "Хэрэгсэл ажиллуулах", expert: "Албан эх сурвалжийн зөвлөгөө" },
    en: { action: "Tool execution", expert: "Official-source guidance" },
  };
  return labels[lang][capability];
}
