// KAXI RAG 지식 베이스
// 공식 출처: 한국유학종합시스템(Study in Korea)·교육부·법무부·법제처
// 각 문서는 {ko, vi, mn, en} 다국어 텍스트를 가짐
// 간단한 키워드 기반 retrieval + LLM 답변 생성

import type { Lang } from "../i18n/translations";

export interface KnowledgeDoc {
  id: string;
  category: "visa" | "cost" | "documents" | "school" | "legal" | "process" | "warning";
  title: { ko: string; vi: string; mn: string; en: string };
  // 검색용 키워드 (소문자)
  keywords: string[];
  content: { ko: string; vi: string; mn: string; en: string };
  source: string;
}

export interface SourceMetadata {
  label: string;
  url: string;
  verifiedAt: string;
  reviewAfter: string;
  owner: "official" | "internal";
}

export interface KnowledgeDocWithMetadata extends KnowledgeDoc {
  sourceMeta: SourceMetadata;
}

const DEFAULT_VERIFIED_AT = "2026-06-30";
const DEFAULT_REVIEW_AFTER = "2026-09-30";

export const SOURCE_METADATA: Record<string, SourceMetadata> = {
  "Study in Korea · 한국유학종합시스템": {
    label: "Study in Korea · 한국유학종합시스템",
    url: "https://www.studyinkorea.go.kr",
    verifiedAt: DEFAULT_VERIFIED_AT,
    reviewAfter: DEFAULT_REVIEW_AFTER,
    owner: "official",
  },
  "Study in Korea · 교육부": {
    label: "Study in Korea · 교육부",
    url: "https://www.studyinkorea.go.kr",
    verifiedAt: DEFAULT_VERIFIED_AT,
    reviewAfter: DEFAULT_REVIEW_AFTER,
    owner: "official",
  },
  "Study in Korea (studyinkorea.go.kr)": {
    label: "Study in Korea",
    url: "https://www.studyinkorea.go.kr",
    verifiedAt: DEFAULT_VERIFIED_AT,
    reviewAfter: DEFAULT_REVIEW_AFTER,
    owner: "official",
  },
  "법무부 출입국외국인정책본부": {
    label: "법무부 출입국외국인정책본부",
    url: "https://www.immigration.go.kr",
    verifiedAt: DEFAULT_VERIFIED_AT,
    reviewAfter: DEFAULT_REVIEW_AFTER,
    owner: "official",
  },
  "교육부 보도자료 (2026.02)": {
    label: "교육부 보도자료",
    url: "https://www.moe.go.kr",
    verifiedAt: DEFAULT_VERIFIED_AT,
    reviewAfter: DEFAULT_REVIEW_AFTER,
    owner: "official",
  },
  "NIIED 한국교육과정평가원": {
    label: "국립국제교육원/TOPIK",
    url: "https://www.topik.go.kr",
    verifiedAt: DEFAULT_VERIFIED_AT,
    reviewAfter: DEFAULT_REVIEW_AFTER,
    owner: "official",
  },
  "법무부 비자 발급 안내": {
    label: "법무부 비자 발급 안내",
    url: "https://www.visa.go.kr",
    verifiedAt: DEFAULT_VERIFIED_AT,
    reviewAfter: DEFAULT_REVIEW_AFTER,
    owner: "official",
  },
  "출입국관리법 제89조·형법 제231조": {
    label: "국가법령정보센터",
    url: "https://www.law.go.kr",
    verifiedAt: DEFAULT_VERIFIED_AT,
    reviewAfter: DEFAULT_REVIEW_AFTER,
    owner: "official",
  },
  "직업안정법 제47조·출입국관리법 제18조": {
    label: "국가법령정보센터",
    url: "https://www.law.go.kr",
    verifiedAt: DEFAULT_VERIFIED_AT,
    reviewAfter: DEFAULT_REVIEW_AFTER,
    owner: "official",
  },
  "행정사법 제2조 (법제처 해석례)": {
    label: "국가법령정보센터",
    url: "https://www.law.go.kr",
    verifiedAt: DEFAULT_VERIFIED_AT,
    reviewAfter: DEFAULT_REVIEW_AFTER,
    owner: "official",
  },
  "출입국관리사무소 안내": {
    label: "법무부 출입국외국인정책본부",
    url: "https://www.immigration.go.kr",
    verifiedAt: DEFAULT_VERIFIED_AT,
    reviewAfter: DEFAULT_REVIEW_AFTER,
    owner: "official",
  },
  "출입국관리사무소 체류자격 변경 안내": {
    label: "법무부 출입국외국인정책본부",
    url: "https://www.immigration.go.kr",
    verifiedAt: DEFAULT_VERIFIED_AT,
    reviewAfter: DEFAULT_REVIEW_AFTER,
    owner: "official",
  },
  "KAXI 분석 (공식 학사운영 지침 기반)": {
    label: "KAXI internal analysis",
    url: "internal://kaxi/cost-analysis",
    verifiedAt: DEFAULT_VERIFIED_AT,
    reviewAfter: DEFAULT_REVIEW_AFTER,
    owner: "internal",
  },
  "KAXI 안전 가이드라인": {
    label: "KAXI safety guideline",
    url: "internal://kaxi/safety-guideline",
    verifiedAt: DEFAULT_VERIFIED_AT,
    reviewAfter: DEFAULT_REVIEW_AFTER,
    owner: "internal",
  },
};

export function getSourceMetadata(source: string): SourceMetadata {
  return SOURCE_METADATA[source] ?? {
    label: source,
    url: "internal://kaxi/unregistered-source",
    verifiedAt: DEFAULT_VERIFIED_AT,
    reviewAfter: DEFAULT_REVIEW_AFTER,
    owner: "internal",
  };
}

function dateAtStartOfDay(value: Date | string): number {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function isSourceReviewCurrent(
  source: string,
  referenceDate: Date = new Date()
): boolean {
  const meta = getSourceMetadata(source);
  return dateAtStartOfDay(meta.reviewAfter) >= dateAtStartOfDay(referenceDate);
}

export function getKnowledgeDocsWithMetadata(
  options: { includeExpired?: boolean; referenceDate?: Date } = {}
): KnowledgeDocWithMetadata[] {
  const referenceDate = options.referenceDate || new Date();
  return KNOWLEDGE_DOCS.map((doc) => ({
    ...doc,
    sourceMeta: getSourceMetadata(doc.source),
  })).filter((doc) => options.includeExpired || isSourceReviewCurrent(doc.source, referenceDate));
}

export function getKnowledgeSourceAudit(referenceDate: Date = new Date()) {
  const registeredSources = new Set(Object.keys(SOURCE_METADATA));
  const usedSources = new Set(KNOWLEDGE_DOCS.map((doc) => doc.source));
  const missingMetadata = Array.from(usedSources).filter((source) => !registeredSources.has(source));
  const unusedMetadata = Array.from(registeredSources).filter((source) => !usedSources.has(source));
  const expiredDocs = KNOWLEDGE_DOCS
    .map((doc) => ({ doc, sourceMeta: getSourceMetadata(doc.source) }))
    .filter(({ doc }) => !isSourceReviewCurrent(doc.source, referenceDate))
    .map(({ doc, sourceMeta }) => ({
      id: doc.id,
      source: doc.source,
      reviewAfter: sourceMeta.reviewAfter,
    }));

  return {
    totalDocs: KNOWLEDGE_DOCS.length,
    activeDocs: getKnowledgeDocsWithMetadata({ referenceDate }).length,
    expiredDocs,
    missingMetadata,
    unusedMetadata,
  };
}

export const KNOWLEDGE_DOCS: KnowledgeDoc[] = [
  {
    id: "d2-overview",
    category: "visa",
    title: {
      ko: "D-2 비자 개요",
      vi: "Tổng quan visa D-2",
      mn: "D-2 визийн тойм",
      en: "D-2 Visa Overview",
    },
    keywords: ["d-2", "d2", "학위", "degree", "전문대", "대학교", "대학원", "đại học", "thạc sĩ", "бакалавр", "магистр"],
    content: {
      ko: "D-2는 학위과정 유학생 체류자격입니다. 전문대·대학교·대학원·전문대학원 학위과정에 등록된 외국인 유학생이 신청합니다. 교육부 인증대학(교육국제화역량 인증)은 사증 심사 혜택을 받을 수 있으며, 비인증대학은 기준 미충족 시 비자심사 강화대학으로 지정될 수 있습니다. 2025년 기준 학위과정 비자정밀 심사대학은 16개교입니다.",
      vi: "D-2 là visa cho sinh viên quốc tế theo học chương trình cấp bằng (cao đẳng, đại học, thạc sĩ, tiến sĩ). Trường được认证 (giáo dục quốc tế hóa) được hưởng lợi khi xét visa. Các trường không đạt chuẩn có thể bị đưa vào danh sách kiểm tra gắt. Năm 2025 có 16 trường bị xét visa kỹ.",
      mn: "D-2 нь зэргийн курсийн оюутны виз. Коллеж, их сургууль, магистр, докторын курс. Боловсролын олон улсын чадавхын итгэмжлэлтэй сургууль нь визний давуу эрхтэй. 2025 онд 16 сургууль нарийвчилсан шалгалтад орсон.",
      en: "D-2 is for degree-program international students (college, university, graduate school). Accredited universities (education internationalization capacity认证) get visa screening benefits. Non-accredited schools may be designated as strict visa review schools. In 2025, 16 degree programs are under strict visa review.",
    },
    source: "Study in Korea · 한국유학종합시스템",
  },
  {
    id: "d4-overview",
    category: "visa",
    title: {
      ko: "D-4 비자 개요",
      vi: "Tổng quan visa D-4",
      mn: "D-4 визийн тойм",
      en: "D-4 Visa Overview",
    },
    keywords: ["d-4", "d4", "어학당", "연수", "language", "tiếng hàn", "хэл", "korean language", "du học tiếng"],
    content: {
      ko: "D-4는 비학위 연수과정 유학생 체류자격입니다. 어학당·교환학생·연구원 등이 해당합니다. 한국어 기초가 없어도 입학 가능합니다. 2025년 기준 어학연수과정 비자정밀 심사대학은 4개교이며, 2026년 2학기부터 1년간 해당 대학은 비자 발급이 제한됩니다.",
      vi: "D-4 là visa cho chương trình không cấp bằng (lớp tiếng Hàn, trao đổi, nghiên cứu). Không cần TOPIK. Năm 2025 có 4 trường bị xét visa kỹ, từ kỳ 2/2026 bị hạn chế visa 1 năm.",
      mn: "D-4 нь зэргийн бус курсийн виз. Солонгос хэлний курс, солилцооны оюутан, судлаач. TOPIK шаардлагагүй. 2025 онд 4 сургууль, 2026/II-ээс 1 жил виз хязгаарлагдана.",
      en: "D-4 is for non-degree programs (Korean language institutes, exchange students, researchers). No TOPIK required. In 2025, 4 language programs are under strict review, with 1-year visa restriction from 2026 semester 2.",
    },
    source: "Study in Korea · 교육부",
  },
  {
    id: "visa-documents",
    category: "documents",
    title: {
      ko: "비자 신청 필수 서류",
      vi: "Hồ sơ visa bắt buộc",
      mn: "Визийн шаардлагатай баримт",
      en: "Required visa documents",
    },
    keywords: ["서류", "documents", "hồ sơ", "barimt", "여권", "사진", "입학허가서", "사업자등록증", "학력", "재정", "표준입학허가서"],
    content: {
      ko: "한국유학종합시스템에 따르면 D-2/D-4 비자 신청에는 여권 사본, 증명사진, 교육기관 사업자등록증, 표준입학허가서, 학력 증빙, 재정능력 증빙 등이 필요합니다. 국가·프로그램에 따라 추가 서류가 요구될 수 있으며, 관할 재외공관 확인이 필수입니다. 결핵진단서는 베트남·몽골·중국·필리핀·미얀마·우즈베키스탄·태국·인도네시아·네팔 등 일부 국가 출신자에게 필요합니다.",
      vi: "Theo hệ thống Study in Korea, visa D-2/D-4 cần: hộ chiếu, ảnh, giấy ĐKKD cơ sở giáo dục, giấy nhập học chuẩn, bằng cấp, chứng minh tài chính. Có thể cần thêm giấy khám LAO cho công dân Việt Nam, Mông Cổ, Trung Quốc, Philippines...",
      mn: "Study in Korea системд D-2/D-4 визанд: паспорт, зураг, боловсролын байгууллагын гэрчилгээ, стандарт элсэлтийн зөвшөөрөл, боловсролын баталгаа, санхүүгийн баталгаа хэрэгтэй. Монгол, Вьетнам, Хятад, Филиппин зэрэг орны иргэдэд сүрьеэний үзлэг шаардлагатай.",
      en: "Per Study in Korea, D-2/D-4 visa requires: passport copy, ID photo, school business registration, standard admission letter, education proof, financial proof. TB test required for citizens of Vietnam, Mongolia, China, Philippines, Myanmar, Uzbekistan, Thailand, Indonesia, Nepal.",
    },
    source: "Study in Korea (studyinkorea.go.kr)",
  },
  {
    id: "tuberculosis-test",
    category: "documents",
    title: {
      ko: "결핵진단서 안내",
      vi: "Giấy khám LAO",
      mn: "Сүрьеэний үзлэг",
      en: "Tuberculosis test",
    },
    keywords: ["결핵", "lao", "tuberculosis", "сүрьеэ", "tb", "진단서"],
    content: {
      ko: "결핵진단서는 한국법무부 지정 병원에서 검사받아야 하며, 결과는 6개월 유효합니다. 베트남 (하노이 가톨릭대학교 강북성모병원, 호치민 빈머 의과대학병원), 몽골 (국립제3병원, 가축위생병원) 등에 지정 병원이 있습니다. 검사 비용은 국가별로 약 30~80달러입니다. 검사 결과 이상 발견시 비자 발급이 제한될 수 있습니다.",
      vi: "Giấy khám LAO phải khám tại bệnh viện chỉ định của Bộ Tư pháp Hàn Quốc. Kết quả có hiệu lực 6 tháng. Tại Việt Nam: bệnh viện Đức (Hà Nội), Chợ Rẫy (HCMC). Chi phí khoảng 30-80 USD.",
      mn: "Сүрьеэний үзлэгийг Солонгосын Хууль зүй яамны заасан эмнэлэгт хийлгэх. Үр дүн 6 сар хүчинтэй. Монголд Үндэсний 3-р эмнэлэг, мал амьтны эрүүл мэндийн эмнэлэгт. Үнэ 30-80 ам.доллар.",
      en: "TB test must be at Korean Ministry of Justice designated hospitals. Result valid 6 months. In Vietnam: Duc Hospital (Hanoi), Chợ Rẫy (HCMC). Mongolia: National 3rd Hospital. Cost ~30-80 USD. Abnormal results may restrict visa.",
    },
    source: "법무부 출입국외국인정책본부",
  },
  {
    id: "accredited-university",
    category: "school",
    title: {
      ko: "교육국제화역량 인증대학 제도",
      vi: "Trường认证 năng lực quốc tế hóa",
      mn: "Олон улсын чадавхын итгэмжлэлтэй сургууль",
      en: "Accredited universities (Internationalization Capacity)",
    },
    keywords: ["인증대학", "accredited", "인증", "국제화역량", "công nhận", "итгэмжлэл", "비자혜택", "visa benefit"],
    content: {
      ko: "교육부는 매년 대학의 교육국제화역량을 평가하여 인증대학을 선정합니다. 인증대학은 사증 심사 간소화, 유학생 체류기간 단축 등의 혜택이 있습니다. 비인증대학은 유학생 유치가 제한되거나 비자심사 강화대학으로 지정될 수 있습니다. 2025년 기준 학위과정 16개교, 어학연수과정 4개교가 비자정밀 심사대학으로 지정되었으며, 2026년 2학기부터 1년간 비자 발급이 제한됩니다.",
      vi: "MOE hàng năm đánh giá và认证 các trường đạt chuẩn quốc tế hóa. Trường认证 được hưởng lợi: visa gọn, thời gian lưu trú ngắn hơn. Trường không认证 có thể bị hạn chế hoặc đưa vào danh sách visa gắt. 2025: 16 trường ĐH, 4 trường tiếng bị xét kỹ, hạn chế visa từ 2026/2.",
      mn: "Боловсролын яам жил бүр олон улсын чадавхын итгэмжлэл олгоно. Итгэмжлэгдсэн сургууль визний хөнгөлөлттэй. Итгэмжлэгдээгүй сургууль визний нарийн шалгалтад орж болно. 2025: 16 их сургууль, 4 хэлний курс нарийн шалгалтад, 2026/II-ээс 1 жил виз хязгаарлагдана.",
      en: "MOE annually certifies universities with internationalization capacity. Accredited schools get simplified visa screening, shorter stay periods. Non-accredited may face restrictions or strict visa review. In 2025: 16 degree + 4 language programs under strict review, visa restricted 1 year from 2026/2.",
    },
    source: "교육부 보도자료 (2026.02)",
  },
  {
    id: "cost-breakdown",
    category: "cost",
    title: {
      ko: "유학 총비용 항목 분해",
      vi: "Phân tích tổng chi phí du học",
      mn: "Нийт зардлын задаргаа",
      en: "Total cost itemized breakdown",
    },
    keywords: ["비용", "cost", "chi phí", "зардал", "tuition", "등록금", "기숙사", "서류", "번역", "공증", "비자수수료", "항공", "정착비"],
    content: {
      ko: "한국 유학 총비용은 등록금·기숙사비·서류비·번역공증비·비자수수료·항공권·입국 초기 정착비로 분해됩니다. 어학당 1학기 등록금은 130~190만원, 4년제는 350~520만원 정도입니다. 기숙사비는 6개월 150~300만원. 번역공증은 문서당 15,000~50,000원. 비자 신청 수수료는 60,000원(단수). 항공권은 편도 30~60만원. 정착비는 통신·교통·생활비 포함 1~2백만원이 적정합니다. 브로커가 총액만 말하면 30% 이상 부풀려져 있을 수 있으므로 항목별 비교가 필수입니다.",
      vi: "Tổng chi phí du học Hàn Quốc: học phí, KTX, hồ sơ, dịch+công chứng, phí visa, vé máy bay, chi phí ban đầu. Lớp tiếng: 1.3-1.9 triệu KRW/kỳ. Đại học: 3.5-5.2 triệu/kỳ. KTX: 1.5-3 triệu/6 tháng. Dịch+công chứng: 15,000-50,000 KRW/tài liệu. Visa: 60,000 KRW. Vé: 300-600k KRW. Nếu môi giới báo tổng cao hơn 30% → so sánh kỹ.",
      mn: "Солонгос улсад сурах нийт зардал: төлбөр, дотуур байр, баримт, орчуулга гэрчилгээ, виз хураамж, нисэх тийз, анхны зардал. Хэлний курс 1.3-1.9 сая/семестр. Их сургууль 3.5-5.2 сая. Дотуур байр 1.5-3 сая/6 сар. Орчуулга 15-50 мянга/баримт. Виз 60,000. Зуучлагч 30%+ өндөр бол харьцуул.",
      en: "Korea study total cost: tuition, dorm, docs, translation, visa, flight, settlement. Language: 1.3-1.9M KRW/semester. University: 3.5-5.2M/semester. Dorm: 1.5-3M/6mo. Translation: 15-50K/doc. Visa: 60K. Flight: 300-600K. Settlement: 1-2M. If broker total is 30%+ higher, compare items.",
    },
    source: "KAXI 분석 (공식 학사운영 지침 기반)",
  },
  {
    id: "topik-requirement",
    category: "documents",
    title: {
      ko: "TOPIK 요구 등급",
      vi: "Yêu cầu TOPIK",
      mn: "TOPIK шаардлага",
      en: "TOPIK requirement",
    },
    keywords: ["topik", "토픽", "한국어능력시험", "korean exam", "tiếng hàn", "level", "등급"],
    content: {
      ko: "TOPIK(Test of Proficiency in Korean)은 1~6급으로 구성됩니다. 학위과정 입학은 보통 TOPIK 4급 이상이 필요하며, 전공·대학에 따라 3급 또는 5급이 요구될 수 있습니다. 어학당은 TOPIK 점수가 필요 없습니다. 일부 대학은 자체 한국어 시험으로 대체 가능합니다. TOPIK은 매년 4~6회 시행되며 응시료는 약 40,000~60,000원입니다.",
      vi: "TOPIK có 6 cấp. ĐH cần TOPIK 4+ (có nơi 3 hoặc 5). Lớp tiếng không cần. Một số trường cho phép thi riêng. TOPIK 4-6 lần/năm, phí 40-60k KRW.",
      mn: "TOPIK 6 түвшинтэй. Их сургууль 4+ шаардлагатай (зарим 3 эсвэл 5). Хэлний курс шаардлагагүй. Зарим сургууль өөрийн шалгалттай. Жилд 4-6 удаа, хураамж 40-60k KRW.",
      en: "TOPIK levels 1-6. Universities typically require 4+ (some 3 or 5). Language programs: none. Some schools have own tests. Held 4-6 times/year, fee 40-60K KRW.",
    },
    source: "NIIED 한국교육과정평가원",
  },
  {
    id: "standard-admission",
    category: "documents",
    title: {
      ko: "표준입학허가서 제도",
      vi: "Giấy nhập học chuẩn",
      mn: "Стандарт элсэлтийн зөвшөөрөл",
      en: "Standard Admission Letter",
    },
    keywords: ["표준입학허가서", "standard admission", "입학허가", "사업자등록증", "giấy nhập học", "элсэлтийн зөвшөөрөл"],
    content: {
      ko: "표준입학허가서는 법무부 지정 양식으로 학교가 발급하는 공식 입학 허가 문서입니다. 일반 입학허가서와 달리 비자 신청시 필수이며, 학교의 사업자등록증 사본과 함께 제출해야 합니다. 학교 합격 후 학교 유학담당자에게 요청하여 발급받아야 합니다. 발급에는 보통 1~2주가 소요됩니다.",
      vi: "Giấy nhập học chuẩn là mẫu của Bộ Tư pháp, do trường cấp. Bắt buộc khi xin visa, kèm ĐKKD của trường. Sau khi đậu, yêu cầu trường cấp. Mất 1-2 tuần.",
      mn: "Стандарт элсэлтийн зөвшөөрөл нь Хууль зүй яамны загвараар сургууль олгоно. Визанд заавал хэрэгтэй, сургуулийн гэрчилгээтэй хамт. 1-2 долоо хоног болно.",
      en: "Standard Admission Letter is a Ministry of Justice-designated form issued by the school. Required for visa, with school business registration. Request from school after admission. Takes 1-2 weeks.",
    },
    source: "법무부 출입국외국인정책본부",
  },
  {
    id: "financial-proof",
    category: "documents",
    title: {
      ko: "재정능력 증빙",
      vi: "Chứng minh tài chính",
      mn: "Санхүүгийн баталгаа",
      en: "Financial proof",
    },
    keywords: ["재정", "financial", "tài chính", "санхүү", "잔고증명서", "balance", "은행잔고", "sổ tiết kiệm", "danisch"],
    content: {
      ko: "재정능력 증빙은 본인 또는 부모 명의 은행 잔고증명서로 제출합니다. D-2는 보통 20,000달러 이상, D-4는 13,000달러 이상의 잔고를 1개월 이상 유지해야 합니다. 국가에 따라 6개월 이상 유지를 요구할 수 있습니다. 허위 잔고증명서 제출은 강제퇴거·입국금지 대상이며, 플랫폼은 허위서류 요청을 거부합니다.",
      vi: "Chứng minh tài chính bằng sổ tiết kiệm bản thân hoặc bố mẹ. D-2 cần 20,000+ USD, D-4 cần 13,000+ USD, duy trì 1+ tháng. Một số nước cần 6 tháng. Sổ giả = trục xuất + cấm nhập cảnh.",
      mn: "Санхүүгийн баталгаа нь өөрийн эсвэл эцэг эхийн нэр дээрх банкны үлдэгдлийн гэрчилгээ. D-2 20,000+ ам.доллар, D-4 13,000+ ам.доллар, 1+ сар хадгалах. Хуурамч баримт = албадан гаргах + хориг.",
      en: "Financial proof via bank balance certificate (self or parents). D-2: 20,000+ USD, D-4: 13,000+ USD, held 1+ month. Some countries need 6 months. Fake certificates = deportation + entry ban. Platform refuses fake document requests.",
    },
    source: "법무부 비자 발급 안내",
  },
  {
    id: "visa-guarantee-warning",
    category: "warning",
    title: {
      ko: "비자 보장 거짓 광고 경고",
      vi: "Cảnh báo quảng cáo xảo trá 'bảo đảm visa'",
      mn: "'Виз баталгаа' хуурамч зар сурталчилгаа",
      en: "Visa guarantee false advertising warning",
    },
    keywords: ["비자 보장", "visa guarantee", "bảo đảm", "баталгаа", "100% 비자", "guaranteed", "보장"],
    content: {
      ko: "비자 발급 여부는 영사의 재량이며, 어떤 브로커나 유학원도 '비자 100% 보장'을 약속할 수 없습니다. 비자 보장을 약속하는 것은 허위 광고에 해당하며, 계약 후 비자 거절시 책임을 회피하는 경우가 많습니다. KAXI는 비자 발급을 보장하지 않으며, 비자 가능성을 판단하지 않습니다. 개별 비자 판단은 행정사 상담으로 연결됩니다.",
      vi: "Visa do lãnh sự quyết định. Không ai bảo đảm 100% visa. Hứa 'bảo đảm visa' là quảng cáo giả. Nền tảng không bảo đảm visa, chuyển sang luật sư cho từng trường hợp.",
      mn: "Визийг консул шийдвэрлэнэ. 'Виз 100% баталгаа' гэдэг хуурамч зар. Платформ виз баталгаажуулдаггүй, тусгай зөвлөгөөнд шилжүүлнэ.",
      en: "Visa is at consul's discretion. No one can guarantee 100% visa. 'Visa guarantee' is false advertising. Platform does not guarantee visa, refers to admin lawyer for individual cases.",
    },
    source: "KAXI 안전 가이드라인",
  },
  {
    id: "fake-documents-warning",
    category: "warning",
    title: {
      ko: "허위서류 불법 위험",
      vi: "Rủi ro hồ sơ giả",
      mn: "Хуурамч баримтын хууль бус эрсдэл",
      en: "Fake documents illegal risk",
    },
    keywords: ["허위", "fake", "giả", "хуурамч", "거짓", "잔고증명", "거짓 서류", "false document", "위조"],
    content: {
      ko: "허위 잔고증명·허위 학력증명서·허위 재직증명서 제출은 출입국관리법 위반으로 강제퇴거·입국금지(최장 10년) 대상입니다. 또한 사문서위조죄(형법 제231조)로 형사처벌 대상입니다. KAXI는 허위서류 작성·제공을 요청하는 사용자에게 서비스를 제공하지 않으며, 합법적 준비 경로를 안내합니다.",
      vi: "Sổ tiết kiệm giả, bằng giả, giấy chứng nhận giả = trục xuất + cấm nhập cảnh tới 10 năm. Hình phạt hình sự theo luật. Nền tảng từ chối hồ sơ giả, hướng dẫn chuẩn bị hợp pháp.",
      mn: "Хуурамч банкны баримт, боловсролын гэрчилгээ = албадан гаргах + 10 жил хүртэл хориг. Эрүүгийн хариуцлага. Платформ татгалзаж, хууль ёсны замаар зааварлана.",
      en: "Fake bank statements, fake diplomas = deportation + entry ban up to 10 years. Criminal liability under criminal code. Platform refuses, guides to legal preparation.",
    },
    source: "출입국관리법 제89조·형법 제231조",
  },
  {
    id: "illegal-employment-warning",
    category: "warning",
    title: {
      ko: "불법취업·취업 매칭 위험",
      vi: "Rủi ro việc làm bất hợp pháp",
      mn: "Хууль бус ажлын эрсдэл",
      en: "Illegal employment risk",
    },
    keywords: ["취업", "알바", "공장", "job", "work", "việc làm", "ажил", "직업소개", "employment", "취업 매칭"],
    content: {
      ko: "미등록 유료직업소개사업은 직업안정법 제47조 위반으로 5년 이하 징역 또는 5천만원 이하 벌금 대상입니다. D-2/D-4 비자 소지자의 아르바이트는 별도 시간제취업허가(S-3)를 받아야 하며, 허가 없는 취업은 불법취업으로 강제퇴거 대상입니다. KAXI는 취업 매칭을 제공하지 않으며, 합법 취업은 고용노동부 고용허가제를 통해야 함을 안내합니다.",
      vi: "Giới thiệu việc làm không đăng ký = phạt 5 năm tù hoặc 50 triệu KRW. D-2/D-4 muốn làm thêm cần giấy phép (S-3). Không phép = trục xuất. Nền tảng không ghép việc làm.",
      mn: "Бүртгэлгүй ажлын байрны зуучлал = 5 жил хүртэл хорих эсвэл 50 сая KRW торгууль. D-2/D-4 ажиллахын тулд тусгай зөвшөөрөл (S-3) хэрэгтэй. Платформ ажил холбохгүй.",
      en: "Unregistered job matching = up to 5yr prison or 50M KRW fine. D-2/D-4 part-time work needs S-3 permit. Without = illegal work → deportation. Platform provides no job matching.",
    },
    source: "직업안정법 제47조·출입국관리법 제18조",
  },
  {
    id: "administrative-scrivener",
    category: "legal",
    title: {
      ko: "행정사 업무 영역",
      vi: "Lĩnh vực luật sư hành chính",
      mn: "Зөвлөгөөний талбар",
      en: "Administrative scrivener scope",
    },
    keywords: ["행정사", "administrative", "luật sư hành chính", "зөвлөгөө", "비자대행", "visa agent", "출입국", "immigration"],
    content: {
      ko: "행정사법 제2조에 따라 행정사는 행정기관 제출 서류 작성, 권리·의무나 사실증명 서류 작성, 작성된 서류의 제출 대행 등을 업무로 합니다. 비자 신청서 작성, 출입국 제출서류 작성, 체류자격 변경 신청 대행은 행정사 영역입니다. KAXI는 일반 안내만 제공하며, 개별 비자 판단·서류 작성·제출 대행은 행정사 파트너에게 위탁합니다.",
      vi: "Theo luật hành chính, luật sư hành chính được phép soạn hồ sơ nộp cơ quan, đại diện nộp. Visa, thay đổi tư cách lưu trú → cần luật sư. Nền tảng chỉ hướng dẫn chung.",
      mn: "Зөвлөгөөний хуулиар албан баримт бэлтгэх, төлөөлөн гаргах эрхтэй. Виз, байршил өөрчлөх → зөвлөгөө шаардлагатай. Платформ ерөнхий заавар өгнө.",
      en: "Per Admin Scrivener Act Art. 2, admin lawyers prepare administrative documents and submit on behalf. Visa applications, stay status changes need admin lawyer. Platform provides general guidance only.",
    },
    source: "행정사법 제2조 (법제처 해석례)",
  },
  {
    id: "after-arrival",
    category: "process",
    title: {
      ko: "입국 후 의무 절차",
      vi: "Thủ tục bắt buộc sau nhập cảnh",
      mn: "Орсны дараах заавал хийх ажил",
      en: "Mandatory procedures after arrival",
    },
    keywords: ["입국", "arrival", "nhập cảnh", "орох", "외국인등록", "arc", "alien registration", "정착", "settlement"],
    content: {
      ko: "외국인 유학생은 입국 후 90일 이내 외국인등록을 해야 합니다. 등록시 여권·표준입학허가서·증명사진·수수료 30,000원이 필요합니다. 건강보험 가입은 의무이며 월 35,000~70,000원입니다. 은행 계좌 개설시 외국인등록증·여권·주소 증빙이 필요합니다. 통신 가입은 외국인등록증 또는 여권+입국사실증명으로 가능합니다.",
      vi: "Sau nhập cảnh, đăng ký người nước ngoài trong 90 ngày. Cần: hộ chiếu, giấy nhập học, ảnh, phí 30,000 KRW. Bắt buộc bảo hiểm y tế 35-70k/tháng. Mở tài khoản cần ARC, hộ chiếu, địa chỉ.",
      mn: "Орсны дараа 90 хоногийн дотор гадаадын иргэний бүртгэл хийх. Пасспорт, элсэлтийн зөвшөөрөл, зураг, 30,000 KRW. Эрүүл мэндийн даатгал заавал. Банкны данс нээхэд ARC шаардлагатай.",
      en: "Within 90 days of arrival, register for ARC. Requires: passport, admission letter, photo, 30,000 KRW fee. Health insurance mandatory (35-70K/month). Bank account needs ARC, passport, address proof.",
    },
    source: "출입국관리사무소 안내",
  },
  {
    id: "d-4-to-d-2-transfer",
    category: "process",
    title: {
      ko: "D-4 → D-2 전환 절차",
      vi: "Chuyển visa D-4 → D-2",
      mn: "D-4 → D-2 шилжих",
      en: "D-4 to D-2 transfer",
    },
    keywords: ["전환", "transfer", "chuyển", "шилжих", "d-4에서 d-2", "change visa", "체류자격 변경", "status change"],
    content: {
      ko: "어학당 수료 후 학위과정 진학시 체류자격 변경(D-4→D-2) 신청이 필요합니다. 학교 합격통지서, 표준입학허가서, TOPIK 4급 이상 증빙, 재학증명서, 재적증명서를 출입국관리사무소에 제출합니다. 심사는 2~4주 소요됩니다. 국외여행허가를 받지 않고 출국시 변경 신청이 취소될 수 있으므로 주의가 필요합니다.",
      vi: "Học xong tiếng → ĐH cần đổi visa D-4 sang D-2. Nộp: giấy báo đậu, TOPIK 4+, giấy nhập học. 2-4 tuần. Không đi nước ngoài không phép.",
      mn: "Хэл төгсөөд их сургуульд орох D-4 → D-2 шилжих. Элсэлтийн зөвшөөрөл, TOPIK 4+ шаардлагатай. 2-4 долоо хоног. Зөвшөөрөлгүй гадагшаа явахыг хоригдоно.",
      en: "After language program → degree program: change D-4 to D-2. Submit: admission letter, TOPIK 4+, school cert. Takes 2-4 weeks. Don't leave without travel permit.",
    },
    source: "출입국관리사무소 체류자격 변경 안내",
  },
  {
    id: "broker-redflags",
    category: "warning",
    title: {
      ko: "브로커 위험 신호 체크리스트",
      vi: "Dấu hiệu môi giới rủi ro",
      mn: "Зуучлагчийн эрсдэлийн дохио",
      en: "Broker red flag checklist",
    },
    keywords: ["브로커", "broker", "môi giới", "зуучлагч", "위험", "red flag", "신호", "warning", "체크리스트", "checklist"],
    content: {
      ko: "브로커 위험 신호: 1) 비용을 항목별로 설명하지 않고 총액만 말함. 2) 비자 100% 보장 약속. 3) 허위 잔고증명·허위 서류 제공 제안. 4) 불법취업 알선. 5) 계약서 없이 현금만 요구. 6) 학교 직원인 척 하며 특정 학교 강요. 7) 비용이 공식 예상보다 30% 이상 높음. 8) SNS·지인 통한 사적 연락만. 이런 신호가 있으면 KAXI 비용 계산기로 항목별 비교 후 행정사 상담을 권장합니다.",
      vi: "Dấu hiệu môi giới rủi ro: 1) Chỉ báo tổng, không rõ từng mục. 2) Bảo đảm 100% visa. 3) Đề nghị sổ giả. 4) Giới thiệu việc bất hợp pháp. 5) Tiền mặt, không hợp đồng. 6) Ép chọn trường. 7) Cao hơn 30% thực tế. 8) Liên lạc qua SNS. Nếu thấy → so sánh phí + gặp luật sư.",
      mn: "Зуучлагчийн эрсдэлийн дохио: 1) Зөвхөн нийт дүн, задлахгүй. 2) Виз 100% баталгаа. 3) Хуурамч баримт санал. 4) Хууль бус ажил. 5) Бэлэн мөнгө, гэрээгүй. 6) Сургуулийн ажилтан дүр эсвэл албадах. 7) Бодит зардал 30%+ өндөр. 8) Зөвхөн SNS-ээр холбоо. → Харьцуулж, зөвлөгөө авна.",
      en: "Broker red flags: 1) Total only, no itemization. 2) 100% visa guarantee. 3) Offers fake docs. 4) Illegal job matching. 5) Cash only, no contract. 6) Forces specific school, pretends school staff. 7) 30%+ over official estimate. 8) Private SNS contact only. → Compare items, consult lawyer.",
    },
    source: "KAXI 안전 가이드라인",
  },
];

// 간단한 키워드 매칭 기반 retrieval (레거시 — vector-store.ts의 hybridSearch 사용 권장)
// (운영시 Vector DB로 교체, 현재는 키워드 점수로 충분)
// @deprecated Use hybridSearch from ../embeddings/vector-store instead
export function retrieveDocs(query: string, topK = 3): KnowledgeDoc[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const searchableDocs = getKnowledgeDocsWithMetadata();
  const scored = searchableDocs.map((doc) => {
    let score = 0;
    const words = q.split(/\s+/);
    for (const keyword of doc.keywords) {
      if (q.includes(keyword.toLowerCase())) {
        score += 3;
      }
      for (const w of words) {
        if (w.length > 2 && keyword.toLowerCase().includes(w)) {
          score += 1;
        }
      }
    }
    // 제목 매칭 가중치
    for (const lang of ["ko", "vi", "mn", "en"] as Lang[]) {
      const title = doc.title[lang].toLowerCase();
      for (const w of words) {
        if (w.length > 2 && title.includes(w)) {
          score += 2;
        }
      }
    }
    return { doc, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.doc);
}

export function pickLangText(
  obj: { ko: string; vi: string; mn: string; en: string },
  lang: Lang
): string {
  return obj[lang] ?? obj.en;
}
