// AI 도우미 — 룰 기반 FAQ (데모). RAG 연동은 추후.
import type { Lang } from "../i18n/translations";

interface FAQ {
  keywords: string[]; // 소문자 매칭
  answer: { ko: string; vi: string; mn: string; en: string };
}

export const FAQ_RULES: FAQ[] = [
  {
    keywords: ["d-2", "d2", "학위", "degree", "đại học", "бакалавр"],
    answer: {
      ko: "D-2는 학위과정(전문대·대학교·대학원) 체류자격입니다. TOPIK 4급 이상(전공별 상이)과 표준입학허가서, 학력·재정증빙이 필요합니다. 인증대학은 비자 심사 혜택이 있습니다.",
      vi: "D-2 là visa chương trình cấp bằng. Cần TOPIK 4+, giấy nhập học, bằng cấp và chứng minh tài chính. Trường认证 được hưởng lợi visa.",
      mn: "D-2 нь зэргийн курсийн виз. TOPIK 4+ хэрэгтэй. Итгэмжлэгдсэн сургууль нь визийн давуу эрхтэй.",
      en: "D-2 is for degree programs. Requires TOPIK 4+, admission letter, diploma & financial proof. Accredited schools have visa benefits.",
    },
  },
  {
    keywords: ["d-4", "d4", "어학", "language", "tiếng hàn", "хэл"],
    answer: {
      ko: "D-4는 비학위 연수과정(어학당) 체류자격입니다. 한국어 기초가 없어도 입학 가능합니다. 결핵진단서가 필요한 국가(베트남·몽골 등)가 있으므로 관할 재외공관을 확인하세요.",
      vi: "D-4 là visa lớp tiếng. Không cần TOPIK. Một số nước cần giấy khám LAO (Việt Nam, Mông Cổ).",
      mn: "D-4 нь хэлний курсийн виз. TOPIK шаардлагагүй. Сүрьеэний үзлэг шаардлагатай орнууд бий.",
      en: "D-4 is for language programs. No TOPIK required. TB test needed for some countries (Vietnam, Mongolia).",
    },
  },
  {
    keywords: ["비용", "cost", "chi phí", "зардал", "tuition", "등록금"],
    answer: {
      ko: "총비용은 등록금·기숙사·서류·번역공증·비자·항공·정착비로 분해됩니다. 브로커 견적이 플랫폼 예상보다 30% 이상 높다면 항목별로 비교하세요.",
      vi: "Tổng chi phí: học phí, KTX, hồ sơ, visa, vé máy bay. Nếu môi giới báo cao hơn 30%, hãy so sánh.",
      mn: "Нийт зардал: төлбөр, дотуур байр, баримт, виз, нисэх. Зуучлагч 30%+ өндөр бол харьцуул.",
      en: "Total cost: tuition, dorm, docs, visa, flight, settlement. If broker is 30%+ higher, compare items.",
    },
  },
  {
    keywords: ["비자", "visa", "visas", "비자 보장", "garant", "баталгаа"],
    answer: {
      ko: "비자 보장을 약속하는 브로커는 위험 신호입니다. 비자 발급은 영사의 재량이며 플랫폼도 보장하지 않습니다. 개별 비자 판단은 행정사 상담으로 연결됩니다.",
      vi: "Môi giới 'bảo đảm visa' = dấu hiệu rủi ro. Visa do lãnh sự quyết định.",
      mn: "Зуучлагчийн 'виз баталгаа' = эрсдэл. Визийг консул шийдвэрлэнэ.",
      en: "Brokers who 'guarantee visa' are red flags. Visa is at consul's discretion.",
    },
  },
  {
    keywords: ["허위", "거짓", "잔고", "fake", "giả", "хуурамч"],
    answer: {
      ko: "허위 잔고증명·허위 서류는 강제퇴거·입국금지 대상입니다. 본 서비스는 이를 요청하는 사용자에게 서비스를 제공하지 않습니다.",
      vi: "Chứng minh tài chính giả = trục xuất + cấm nhập cảnh. Nền tảng từ chối.",
      mn: "Хуурамч санхүүгийн баталгаа = албадан гаргах + орох хориг. Платформ татгалзана.",
      en: "Fake financial proof = deportation + entry ban. Platform refuses.",
    },
  },
  {
    keywords: ["취업", "알바", "공장", "job", "work", "việc làm", "ажил"],
    answer: {
      ko: "취업 매칭은 본 플랫폼에서 제공하지 않습니다. 미등록 유료직업소개사업은 직업안정법상 5년 이하 징역 또는 5천만원 이하 벌금 대상입니다. D-2/D-4 비자 소지 시 아르바이트는 별도 허가(시간제취업허가) 필요.",
      vi: "Không ghép việc làm. D-2/D-4 cần giấy phép làm thêm.",
      mn: "Ажлын байр холбохгүй. D-2/D-4 нь ажлын тусгай зөвшөөрөл хэрэгтэй.",
      en: "No job matching. D-2/D-4 requires part-time work permit.",
    },
  },
  {
    keywords: ["토픽", "topik", "한국어 시험"],
    answer: {
      ko: "TOPIK은 한국어능력시험으로 1~6급이 있습니다. 학위과정은 보통 4급 이상, 어학당은 기초 무관입니다. 매년 4~6회 시행됩니다.",
      vi: "TOPIK 1-6. ĐH cần 4+. Lớp tiếng không cần.",
      mn: "TOPIK 1-6. Их сургууль 4+ хэрэгтэй.",
      en: "TOPIK 1-6. Degree needs 4+. Language program: none.",
    },
  },
  {
    keywords: ["결핵", "tuberculosis", "lao", "сүрьеэ"],
    answer: {
      ko: "베트남·몽골·중국·필리핀 등 일부 국가 출신자는 결핵진단서가 필요합니다. 지정 병원에서 검사받아야 하며, 결과는 6개월 유효합니다.",
      vi: "Việt Nam, Mông Cổ... cần giấy khám LAO từ bệnh viện chỉ định.",
      mn: "Монгол, Вьетнам... сүрьеэний үзлэг шаардлагатай.",
      en: "TB test required for Vietnam, Mongolia, etc. From designated hospitals.",
    },
  },
];

export function findFAQ(query: string, lang: Lang): { ko: string; vi: string; mn: string; en: string } | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;
  for (const rule of FAQ_RULES) {
    if (rule.keywords.some((k) => q.includes(k.toLowerCase()))) {
      return rule.answer;
    }
  }
  return null;
}

export const AI_DEFAULT_REPLY = {
  ko: "공식 정보 기반으로 답변드릴게요. D-2/D-4 비용·서류·일정 질문에 답할 수 있습니다. 구체적으로 물어보세요.",
  vi: "Tôi sẽ trả lời dựa trên thông tin chính thức. Hỏi về D-2/D-4, chi phí, hồ sơ.",
  mn: "Албан ёсны мэдээлэлд үндэслэн хариулъя. D-2/D-4, зардал, баримтаас асуу.",
  en: "I'll answer based on official info. Ask about D-2/D-4, cost, docs.",
};
