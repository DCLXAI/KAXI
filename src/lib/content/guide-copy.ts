import type { Lang } from "@/lib/i18n/translations";
import type { GuideTopic } from "@/lib/content/guide-topics";

// Page furniture for the public guide pages.
//
// Only the frame is written here — headings, the source label, the disclaimer.
// The body of every page is cited corpus text, never prose invented to fill a
// template. That split is the point: if this file ever starts holding claims
// about visas, the page has stopped being evidence and started being copy.

const INTENT_TITLES: Record<string, Record<Lang, string>> = {
  required_documents: {
    ko: "제출 서류", vi: "Hồ sơ cần nộp", mn: "Бүрдүүлэх бичиг баримт", en: "Required documents",
  },
  cost: { ko: "비용", vi: "Chi phí", mn: "Зардал", en: "Costs" },
  deadline_or_timing: {
    ko: "기한과 시기", vi: "Thời hạn và thời điểm", mn: "Хугацаа ба цаг хугацаа", en: "Deadlines and timing",
  },
  eligibility: { ko: "자격 요건", vi: "Điều kiện", mn: "Шаардлага", en: "Eligibility" },
  refusal_or_reapplication: {
    ko: "거절과 재신청", vi: "Từ chối và nộp lại", mn: "Татгалзал ба дахин өргөдөл", en: "Refusal and reapplying",
  },
  work_permission_or_hours: {
    ko: "취업 허가와 근무 시간", vi: "Giấy phép làm việc và giờ làm", mn: "Ажиллах зөвшөөрөл ба цаг", en: "Work permission and hours",
  },
  status_change: {
    ko: "체류자격 변경", vi: "Chuyển đổi tư cách lưu trú", mn: "Оршин суух ангилал солих", en: "Changing status",
  },
};

const COPY: Record<Lang, {
  sourceLabel: string;
  checkedLabel: string;
  sourceCount: (count: number) => string;
  disclaimer: string;
  ctaTitle: string;
  ctaBody: string;
  ctaButton: string;
  relatedTitle: string;
}> = {
  ko: {
    sourceLabel: "출처",
    checkedLabel: "확인일",
    sourceCount: (count) => `공식 출처 ${count}건에 근거한 안내입니다.`,
    disclaimer: "개인의 상황에 따라 적용이 달라질 수 있으며, 최종 판단은 관할 출입국·외국인관서의 권한입니다. 개별 사건의 서류 작성·제출 대행은 자격을 갖춘 행정사의 업무입니다.",
    ctaTitle: "내 상황에는 무엇이 적용되나요?",
    ctaBody: "국적·학력·현재 체류자격을 입력하면 해당하는 경로와 준비 서류를 정리해 드립니다.",
    ctaButton: "무료 진단 시작",
    relatedTitle: "함께 보면 좋은 안내",
  },
  vi: {
    sourceLabel: "Nguồn",
    checkedLabel: "Ngày kiểm tra",
    sourceCount: (count) => `Hướng dẫn dựa trên ${count} nguồn chính thức.`,
    disclaimer: "Việc áp dụng có thể khác nhau tùy hoàn cảnh cá nhân, và quyết định cuối cùng thuộc thẩm quyền của cơ quan xuất nhập cảnh. Việc lập và nộp hồ sơ cho từng trường hợp là công việc của hành chính sĩ có chứng chỉ.",
    ctaTitle: "Trường hợp của tôi thì sao?",
    ctaBody: "Nhập quốc tịch, trình độ học vấn và tư cách lưu trú hiện tại để nhận lộ trình và danh sách hồ sơ phù hợp.",
    ctaButton: "Bắt đầu chẩn đoán miễn phí",
    relatedTitle: "Hướng dẫn liên quan",
  },
  mn: {
    sourceLabel: "Эх сурвалж",
    checkedLabel: "Шалгасан огноо",
    sourceCount: (count) => `${count} албан ёсны эх сурвалжид тулгуурласан заавар.`,
    disclaimer: "Хувь хүний нөхцөл байдлаас хамаарч хэрэглээ өөр байж болох бөгөөд эцсийн шийдвэрийг харьяа цагаачлалын байгууллага гаргана. Тодорхой хэргийн бичиг баримт бүрдүүлэх, өгөх нь эрх бүхий захиргааны хуульчийн ажил юм.",
    ctaTitle: "Миний тохиолдолд юу хамаарах вэ?",
    ctaBody: "Иргэншил, боловсрол, одоогийн оршин суух ангиллаа оруулбал тохирох зам болон бэлтгэх бичиг баримтыг эмхэтгэж өгнө.",
    ctaButton: "Үнэгүй оношилгоо эхлүүлэх",
    relatedTitle: "Холбоотой заавар",
  },
  en: {
    sourceLabel: "Source",
    checkedLabel: "Checked",
    sourceCount: (count) => `Based on ${count} official ${count === 1 ? "source" : "sources"}.`,
    disclaimer: "How these rules apply can differ with your circumstances, and the final decision rests with the immigration office with jurisdiction. Preparing and filing documents for an individual case is the work of a licensed administrative scrivener.",
    ctaTitle: "What applies to my situation?",
    ctaBody: "Enter your nationality, education and current status to get the track that fits and the documents it needs.",
    ctaButton: "Start the free check",
    relatedTitle: "Related guides",
  },
};

export function guideCopy(locale: Lang) {
  return COPY[locale] ?? COPY.ko;
}

/** "D-2 · D-4 제출 서류" — the statuses, then the question. */
export function guideTitle(topic: GuideTopic, locale: Lang): string {
  const intent = INTENT_TITLES[topic.intentId]?.[locale] ?? INTENT_TITLES[topic.intentId]?.ko ?? topic.intentId;
  return `${topic.visaCodes.join(" · ")} ${intent}`;
}

/**
 * The meta description.
 *
 * Says what the page IS — cited official guidance — rather than making a claim
 * about visas that the cited text would have to support.
 */
export function guideDescription(topic: GuideTopic, locale: Lang): string {
  return `${guideTitle(topic, locale)} — ${guideCopy(locale).sourceCount(topic.documents.length)}`;
}
