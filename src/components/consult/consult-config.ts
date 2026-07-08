import type { ConsultLocale, ConsultMode } from "./types";

export const MODE_LABELS: Record<ConsultMode, Record<ConsultLocale, string>> = {
  general: { ko: "종합 상담", vi: "Tổng hợp", mn: "Ерөнхий", en: "General" },
  visa: { ko: "비자·체류", vi: "Visa/Lưu trú", mn: "Виз/Байршил", en: "Visa/Stay" },
  documents: { ko: "서류·증빙", vi: "Hồ sơ", mn: "Баримт", en: "Documents" },
  appeal: { ko: "거절 대응", vi: "Kháng từ chối", mn: "Татгалзлын эсрэг", en: "Appeal" },
  business: { ko: "유학원 운영", vi: "Vận hành", mn: "Үйл ажиллагаа", en: "Business" },
};

export const QUICK_QUESTIONS: Record<ConsultLocale, { q: string; mode: ConsultMode }[]> = {
  ko: [
    { q: "D-2 비자 거절당했는데 어떻게 해야 하나요?", mode: "appeal" },
    { q: "D-4에서 D-2로 체류자격 변경하는 절차는?", mode: "visa" },
    { q: "재정증빙 얼마 필요하고 어떤 서류인가요?", mode: "documents" },
    { q: "허위 잔고증명 쓰면 어떤 처벌 받나요?", mode: "documents" },
    { q: "결핵진단서 지정 병원 어디서 어떻게 받나요?", mode: "documents" },
    { q: "유학원 등록 없이 유학 컨설팅 해도 되나요?", mode: "business" },
  ],
  vi: [
    { q: "Bị từ chối visa D-2 thì phải làm sao?", mode: "appeal" },
    { q: "Thủ tục chuyển D-4 sang D-2?", mode: "visa" },
    { q: "Chứng minh tài chính bao nhiêu, giấy gì?", mode: "documents" },
    { q: "Dùng sổ tiết kiệm giả bị phạt gì?", mode: "documents" },
    { q: "Giấy khám LAO ở đâu, làm sao?", mode: "documents" },
    { q: "Tư vấn du học có cần đăng ký không?", mode: "business" },
  ],
  mn: [
    { q: "D-2 виз татгалзсан бол яах вэ?", mode: "appeal" },
    { q: "D-4-өөс D-2 болох шатлал?", mode: "visa" },
    { q: "Санхүүгийн баталгаа хэд, ямар баримт?", mode: "documents" },
    { q: "Хуурамч банкны баримт ашигласан шийтгэл?", mode: "documents" },
    { q: "Сүрьеэний үзлэг хаана, яаж?", mode: "documents" },
    { q: "Зөвлөгөө өгөхөд бүртгэл хэрэгтэй юу?", mode: "business" },
  ],
  en: [
    { q: "I was refused D-2 visa, what should I do?", mode: "appeal" },
    { q: "How to change D-4 to D-2 status?", mode: "visa" },
    { q: "How much financial proof, what documents?", mode: "documents" },
    { q: "What's the penalty for fake bank statements?", mode: "documents" },
    { q: "Where and how to get TB test?", mode: "documents" },
    { q: "Do I need registration to consult students?", mode: "business" },
  ],
};
