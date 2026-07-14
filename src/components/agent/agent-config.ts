import {
  BookOpen,
  Calculator,
  Compass,
  FileCheck,
  Search,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { AgentLocale, AgentStatus, ClarifyDraft, OptionKey } from "./types";

export const TOOL_ICONS: Record<string, LucideIcon> = {
  search_schools: Search,
  calculate_cost: Calculator,
  get_documents: FileCheck,
  search_knowledge: BookOpen,
  diagnose_path: Compass,
  request_partner: Users,
};

export const FALLBACK_TOOL_ICON = Wrench;

export const TOOL_LABELS: Record<string, Record<AgentLocale, string>> = {
  search_schools: { ko: "학교 검색", vi: "Tìm trường", mn: "Сургууль хайх", en: "Search Schools" },
  calculate_cost: { ko: "비용 계산", vi: "Tính chi phí", mn: "Зардал", en: "Calculate Cost" },
  get_documents: { ko: "서류 안내", vi: "Hồ sơ", mn: "Баримт", en: "Documents" },
  search_knowledge: { ko: "공식 문서", vi: "Nguồn chính thức", mn: "Албан эх сурвалж", en: "Official Sources" },
  diagnose_path: { ko: "경로 진단", vi: "Đánh giá", mn: "Маршрут", en: "Diagnose" },
  request_partner: { ko: "전문가 연결", vi: "Chuyên gia", mn: "Мэргэжилтэн", en: "Expert" },
};

export const EXAMPLE_PROMPTS: Record<AgentLocale, string[]> = {
  ko: [
    "서울에 있는 인증대학 어학당 3곳 찾아주고 비용도 계산해줘",
    "베트남 학생인데 D-4 비자로 가려면 필요한 서류 뭐야?",
    "D-2 비자 거절당했는데 어떻게 해야 해? 전문가 상담도 연결해줘",
    "예산 500만원으로 갈 수 있는 학교 찾아줘",
  ],
  vi: [
    "Tìm 3 trường tiếng Hàn ở Seoul có认证 và tính chi phí",
    "Tôi là người Việt, hồ sơ visa D-4 cần gì?",
    "Bị từ chối D-2, phải làm sao? Kết nối chuyên gia",
    "Tìm trường với ngân sách 5 triệu won",
  ],
  mn: [
    "Сеул дахь итгэмжлэгдсэн 3 хэлний курс олж зардал тооцоол",
    "Би монгол, D-4 визанд ямар баримт хэрэгтэй вэ?",
    "D-2 татгалзсан, яах вэ? Мэргэжилтэнтэй холбох",
    "5 сая вон төсөвтэй сургууль хай",
  ],
  en: [
    "Find 3 accredited language schools in Seoul and calculate costs",
    "I'm Vietnamese, what documents do I need for D-4 visa?",
    "My D-2 was refused, what should I do? Connect me to an expert",
    "Find schools within 5M KRW budget",
  ],
};

export const EMPTY_CLARIFY_DRAFT: ClarifyDraft = {
  budget: "",
  schoolName: "",
  region: "",
  program: "",
  visaType: "",
  nationality: "",
  education: "",
  koreanLevel: "",
  goal: "",
};

export const SLOT_TO_DRAFT_KEY: Record<string, OptionKey | null> = {
  region: "region",
  program: "program",
  visa_type: "visaType",
  nationality: "nationality",
  education: "education",
  korean_level: "koreanLevel",
  goal: "goal",
  budget: null,
};

export function statusText(locale: AgentLocale, status: AgentStatus | null): string {
  if (!status) {
    return locale === "ko" ? "상태 확인 중" : locale === "vi" ? "Đang kiểm tra" : locale === "mn" ? "Шалгаж байна" : "Checking";
  }
  if (!status.llm?.apiKeyConfigured) {
    return locale === "ko" ? "기본 도구 모드" : locale === "vi" ? "Chế độ công cụ cơ bản" : locale === "mn" ? "Үндсэн хэрэгслийн горим" : "Core tools mode";
  }
  return locale === "ko" ? "온라인" : locale === "vi" ? "Trực tuyến" : locale === "mn" ? "Онлайн" : "Online";
}

export function statusDotClass(status: AgentStatus | null): string {
  if (!status) return "bg-muted-foreground";
  return status.ok ? "bg-green-500" : "bg-amber-500";
}

export function cloneEmptyClarifyDraft(): ClarifyDraft {
  return { ...EMPTY_CLARIFY_DRAFT };
}

export function budgetForPrompt(value: string): string {
  const trimmed = value.trim();
  const digits = trimmed.replace(/[,\s]/g, "");
  if (/^\d+$/.test(digits)) {
    const amount = Number(digits);
    if (amount > 0 && amount < 10000) return `${amount}만원`;
    return `${amount.toLocaleString()}원`;
  }
  return trimmed;
}

export function clarifyFieldText(locale: AgentLocale) {
  return {
    budget: locale === "ko" ? "예산" : "Budget",
    budgetPlaceholder: locale === "ko" ? "예: 500만원" : "e.g. 5M KRW",
    schoolName: locale === "ko" ? "학교명" : "School name",
    schoolPlaceholder: locale === "ko" ? "예: 연세대학교" : "e.g. Yonsei",
    apply: locale === "ko" ? "조건 적용" : "Apply details",
    quickAsk: locale === "ko" ? "질문만 보내기" : "Ask only",
  };
}

export function hasClarifyDraftValue(draft: ClarifyDraft): boolean {
  return Object.values(draft).some((value) => value.trim().length > 0);
}

export function buildClarifyPrompt(locale: AgentLocale, originalRequest: string, draft: ClarifyDraft): string {
  const lines: string[] = [];
  if (draft.budget.trim()) lines.push(`${locale === "ko" ? "예산" : "Budget"}: ${budgetForPrompt(draft.budget)}`);
  if (draft.schoolName.trim()) lines.push(`${locale === "ko" ? "학교명" : "School name"}: ${draft.schoolName.trim()}`);
  if (draft.region.trim()) lines.push(`${locale === "ko" ? "희망 지역" : "Preferred region"}: ${draft.region}`);
  if (draft.program.trim()) lines.push(`${locale === "ko" ? "과정" : "Program"}: ${draft.program}`);
  if (draft.visaType.trim()) lines.push(`${locale === "ko" ? "비자 종류" : "Visa type"}: ${draft.visaType}`);
  if (draft.nationality.trim()) lines.push(`${locale === "ko" ? "국적" : "Nationality"}: ${draft.nationality}`);
  if (draft.education.trim()) lines.push(`${locale === "ko" ? "최종 학력" : "Education"}: ${draft.education}`);
  if (draft.koreanLevel.trim()) lines.push(`${locale === "ko" ? "한국어 수준" : "Korean level"}: ${draft.koreanLevel}`);
  if (draft.goal.trim()) lines.push(`${locale === "ko" ? "목표" : "Goal"}: ${draft.goal}`);

  if (lines.length === 0) return "";

  const base = originalRequest.trim();
  if (locale === "ko") {
    return `다음 조건을 반영해서 다시 추천/계산해줘.\n- ${lines.join("\n- ")}${base ? `\n\n원래 요청: ${base}` : ""}`;
  }
  return `Use these details and answer again.\n- ${lines.join("\n- ")}${base ? `\n\nOriginal request: ${base}` : ""}`;
}
