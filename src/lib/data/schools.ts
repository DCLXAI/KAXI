// 학교 DB — 20개 검증 가능한 학교/어학당 (데모용)
// 실제 운영시 공식 출처(Study in Korea, 대학 홈페이지) 기반 업데이트 필요

export type Accreditation = "accredited" | "standard" | "caution";
export type Program = "language" | "college" | "university" | "graduate" | "vocational";

export interface School {
  id: string;
  name: { ko: string; vi: string; mn: string; en: string };
  region: "seoul" | "gyeonggi" | "busan" | "daegu" | "gwangju" | "other";
  program: Program;
  tuitionPerSemester: number; // KRW
  dormitoryAvailable: boolean;
  dormitoryCost: number | null; // KRW / 6 months
  koreanRequirement: string;
  accreditation: Accreditation;
  topikLevel: number | null; // 학위과정 필요 TOPIK
  intake: string[]; // 봄/가을/수시
  officialUrl: string;
  notes: { ko: string; vi: string; mn: string; en: string };
}

export const SCHOOLS: School[] = [
  // 어학당 (D-4) — 8곳
  {
    id: "snu-klc",
    name: { ko: "서울대학교 한국어교육센터", vi: "Trung tâm tiếng Hàn ĐHQH Seoul", mn: "Сёулын их сургуулийн Солонгос хэлний төв", en: "SNU Korean Language Education Center" },
    region: "seoul",
    program: "language",
    tuitionPerSemester: 1700000,
    dormitoryAvailable: true,
    dormitoryCost: 2400000,
    koreanRequirement: "없음 (입문 가능)",
    accreditation: "accredited",
    topikLevel: null,
    intake: ["봄", "가을", "여름", "겨울"],
    officialUrl: "https://lei.snu.ac.kr",
    notes: { ko: "인증대학. 비자 심사 혜택.", vi: "Trường认证. Hưởng lợi visa.", mn: "Итгэмжлэгдсэн. Визийн давуу.", en: "Accredited. Visa benefits." },
  },
  {
    id: "yonsei-kli",
    name: { ko: "연세대학교 한국어학당", vi: "Lớp tiếng Hàn Yonsei", mn: "Ёнсэигийн Солонгос хэлний курс", en: "Yonsei KLI" },
    region: "seoul",
    program: "language",
    tuitionPerSemester: 1880000,
    dormitoryAvailable: true,
    dormitoryCost: 3000000,
    koreanRequirement: "없음",
    accreditation: "accredited",
    topikLevel: null,
    intake: ["봄", "여름", "가을", "겨울"],
    officialUrl: "https://www.yskli.com",
    notes: { ko: "인증대학. 학위과정 진학 시 우대.", vi: "Trường认证.", mn: "Итгэмжлэгдсэн.", en: "Accredited." },
  },
  {
    id: "korea-kli",
    name: { ko: "고려대학교 국제어학원", vi: "Viện ngôn ngữ KU", mn: "Корын олон улсын хэлний дээд сургууль", en: "Korea Univ ILA" },
    region: "seoul",
    program: "language",
    tuitionPerSemester: 1750000,
    dormitoryAvailable: true,
    dormitoryCost: 2700000,
    koreanRequirement: "없음",
    accreditation: "accredited",
    topikLevel: null,
    intake: ["봄", "여름", "가을", "겨울"],
    officialUrl: "https://www.illa.korea.edu",
    notes: { ko: "인증대학. 기숙사 경쟁 높음.", vi: "Trường认证.", mn: "Итгэмжлэгдсэн.", en: "Accredited. High dorm competition." },
  },
  {
    id: "sogang-klec",
    name: { ko: "서강대학교 한국어교육센터", vi: "Trung tâm tiếng Sogang", mn: "Согангийн Солонгос хэл", en: "Sogang KLEC" },
    region: "seoul",
    program: "language",
    tuitionPerSemester: 1650000,
    dormitoryAvailable: true,
    dormitoryCost: 2800000,
    koreanRequirement: "없음",
    accreditation: "accredited",
    topikLevel: null,
    intake: ["봄", "여름", "가을", "겨울"],
    officialUrl: "https://klec.sogang.ac.kr",
    notes: { ko: "말하기 중심 커리큘럼. 인증대학.", vi: "Tập nói. Trường认证.", mn: "Ярианд төвлөрсөн.", en: "Speaking-focused. Accredited." },
  },
  {
    id: "hanyang-eli",
    name: { ko: "한양대학교 국제어학원", vi: "Viện ngôn ngữ Hanyang", mn: "Ханянын хэлний төв", en: "Hanyang ELI" },
    region: "seoul",
    program: "language",
    tuitionPerSemester: 1700000,
    dormitoryAvailable: true,
    dormitoryCost: 2600000,
    koreanRequirement: "없음",
    accreditation: "accredited",
    topikLevel: null,
    intake: ["봄", "가을"],
    officialUrl: "https://www.hanyang.ac.kr/ieli",
    notes: { ko: "인증대학. ERICA 캠퍼스도 운영.", vi: "Trường认证.", mn: "Итгэмжлэгдсэн.", en: "Accredited." },
  },
  {
    id: "busan-kli",
    name: { ko: "부산대학교 언어교육원", vi: "Viện ngôn ngữ Busan", mn: "Пусангийн хэлний төв", en: "PNU Language Institute" },
    region: "busan",
    program: "language",
    tuitionPerSemester: 1400000,
    dormitoryAvailable: true,
    dormitoryCost: 1800000,
    koreanRequirement: "없음",
    accreditation: "accredited",
    topikLevel: null,
    intake: ["봄", "가을"],
    officialUrl: "https://www.pusan.ac.kr/kor",
    notes: { ko: "지방 비용 저렴. 인증대학.", vi: "Chi phí thấp. Trường认证.", mn: "Хямд өртөтэй.", en: "Lower cost. Accredited." },
  },
  {
    id: "kyunghee-kli",
    name: { ko: "경희대학교 국제교육원", vi: "Viện GDQT Kyung Hee", mn: "Кёнхицийн олон улсын төв", en: "Kyung Hee IEI" },
    region: "seoul",
    program: "language",
    tuitionPerSemester: 1720000,
    dormitoryAvailable: true,
    dormitoryCost: 2900000,
    koreanRequirement: "없음",
    accreditation: "accredited",
    topikLevel: null,
    intake: ["봄", "여름", "가을", "겨울"],
    officialUrl: "https://www.khu.ac.kr",
    notes: { ko: "인증대학. 수원 캠퍼스도 운영.", vi: "Trường认证.", mn: "Итгэмжлэгдсэн.", en: "Accredited." },
  },
  {
    id: "jeju-kli",
    name: { ko: "제주대학교 언어교육원", vi: "Viện ngôn ngữ Jeju", mn: "Чжүжүгийн хэлний төв", en: "Jeju Language Institute" },
    region: "other",
    program: "language",
    tuitionPerSemester: 1300000,
    dormitoryAvailable: true,
    dormitoryCost: 1500000,
    koreanRequirement: "없음",
    accreditation: "standard",
    topikLevel: null,
    intake: ["봄", "가을"],
    officialUrl: "https://www.jejunu.ac.kr",
    notes: { ko: "제주 특별자치도. 비용 저렴.", vi: "Đảo Jeju. Rẻ.", mn: "Чжүжү арал. Хямд.", en: "Jeju Island. Low cost." },
  },

  // 전문대 (D-2) — 3곳
  {
    id: "yju",
    name: { ko: "영진전문대학교", vi: "Cao đẳng Yeungjin", mn: "Ёнжин коллеж", en: "Yeungjin Univ" },
    region: "daegu",
    program: "college",
    tuitionPerSemester: 2500000,
    dormitoryAvailable: true,
    dormitoryCost: 2200000,
    koreanRequirement: "TOPIK 3급 이상 또는 자체시험",
    accreditation: "accredited",
    topikLevel: 3,
    intake: ["봄", "가을"],
    officialUrl: "https://www.yjc.ac.kr",
    notes: { ko: "인증대학. 베트남 유학생 많음. 비자혜택.", vi: "Trường认证. SV Việt nhiều.", mn: "Итгэмжлэгдсэн.", en: "Accredited. Many Vietnamese students." },
  },
  {
    id: "kbc",
    name: { ko: "경북전문대학교", vi: "Cao đẳng Kyungbuk", mn: "Кёнбүк коллеж", en: "Kyungbuk College" },
    region: "daegu",
    program: "college",
    tuitionPerSemester: 2400000,
    dormitoryAvailable: true,
    dormitoryCost: 2000000,
    koreanRequirement: "TOPIK 3급",
    accreditation: "accredited",
    topikLevel: 3,
    intake: ["봄", "가을"],
    officialUrl: "https://www.kbc.ac.kr",
    notes: { ko: "요양보호사과정 운영. 인증대학.", vi: "Có khóa điều dưỡng. Trường认证.", mn: "Эмчилгээний курс.", en: "Caregiver program. Accredited." },
  },
  {
    id: "cju",
    name: { ko: "청암대학교", vi: "Cao đẳng Cheongam", mn: "Чёнам коллеж", en: "Cheongam Univ" },
    region: "other",
    program: "vocational",
    tuitionPerSemester: 2300000,
    dormitoryAvailable: true,
    dormitoryCost: 1700000,
    koreanRequirement: "TOPIK 3급 또는 자체시험",
    accreditation: "accredited",
    topikLevel: 3,
    intake: ["봄", "가을"],
    officialUrl: "https://www.cju.ac.kr",
    notes: { ko: "미용·호텔조리 강점. 인증대학.", vi: "Mỹ phẩm, nhà hàng. Trường认证.", mn: "Үзэмж, зоогийн газар.", en: "Beauty, culinary. Accredited." },
  },

  // 4년제 (D-2) — 6곳
  {
    id: "khu",
    name: { ko: "경희대학교", vi: "ĐH Kyung Hee", mn: "Кёнхийн их сургууль", en: "Kyung Hee Univ" },
    region: "seoul",
    program: "university",
    tuitionPerSemester: 3900000,
    dormitoryAvailable: true,
    dormitoryCost: 2900000,
    koreanRequirement: "TOPIK 4급 (전공별 상이)",
    accreditation: "accredited",
    topikLevel: 4,
    intake: ["봄", "가을"],
    officialUrl: "https://www.khu.ac.kr",
    notes: { ko: "인증대학. 호텔관광·한의예 강점.", vi: "Trường认证.", mn: "Итгэмжлэгдсэн.", en: "Accredited. Hospitality & TCM." },
  },
  {
    id: "hufs",
    name: { ko: "한국외국어대학교", vi: "ĐH Ngoại ngữ Hankuk", mn: "Солонгосын гадаад хэлний их сургууль", en: "Hankuk Univ of Foreign Studies" },
    region: "seoul",
    program: "university",
    tuitionPerSemester: 4100000,
    dormitoryAvailable: true,
    dormitoryCost: 2700000,
    koreanRequirement: "TOPIK 4급",
    accreditation: "accredited",
    topikLevel: 4,
    intake: ["봄", "가을"],
    officialUrl: "https://www.hufs.ac.kr",
    notes: { ko: "인증대학. 통번역 강점.", vi: "Trường认证.", mn: "Итгэмжлэгдсэн.", en: "Accredited. Translation major." },
  },
  {
    id: "cau",
    name: { ko: "중앙대학교", vi: "ĐH Chung-Ang", mn: "Төвийн их сургууль", en: "Chung-Ang Univ" },
    region: "seoul",
    program: "university",
    tuitionPerSemester: 4200000,
    dormitoryAvailable: true,
    dormitoryCost: 3000000,
    koreanRequirement: "TOPIK 4급",
    accreditation: "accredited",
    topikLevel: 4,
    intake: ["봄", "가을"],
    officialUrl: "https://www.cau.ac.kr",
    notes: { ko: "인증대학. 미디어·연극 강점.", vi: "Trường认证.", mn: "Итгэмжлэгдсэн.", en: "Accredited. Media & theatre." },
  },
  {
    id: "dgu",
    name: { ko: "동국대학교", vi: "ĐH Dongguk", mn: "Донггөгийн их сургууль", en: "Dongguk Univ" },
    region: "seoul",
    program: "university",
    tuitionPerSemester: 4000000,
    dormitoryAvailable: true,
    dormitoryCost: 2600000,
    koreanRequirement: "TOPIK 4급",
    accreditation: "accredited",
    topikLevel: 4,
    intake: ["봄", "가을"],
    officialUrl: "https://www.dongguk.edu",
    notes: { ko: "인증대학. 불교·관광 강점.", vi: "Trường认证.", mn: "Итгэмжлэгдсэн.", en: "Accredited. Buddhism & tourism." },
  },
  {
    id: "pusan-ac",
    name: { ko: "부산외국어대학교", vi: "ĐH Ngoại ngữ Busan", mn: "Пусангийн гадаад хэлний их сургууль", en: "Busan Univ of Foreign Studies" },
    region: "busan",
    program: "university",
    tuitionPerSemester: 3500000,
    dormitoryAvailable: true,
    dormitoryCost: 2200000,
    koreanRequirement: "TOPIK 4급",
    accreditation: "accredited",
    topikLevel: 4,
    intake: ["봄", "가을"],
    officialUrl: "https://www.bufs.ac.kr",
    notes: { ko: "지방 비교적 저렴. 인증대학.", vi: "Rẻ hơn. Trường认证.", mn: "Хямд.", en: "Lower cost. Accredited." },
  },
  {
    id: "cau-non",
    name: { ko: "가천대학교", vi: "ĐH Gachon", mn: "Гачонын их сургууль", en: "Gachon Univ" },
    region: "gyeonggi",
    program: "university",
    tuitionPerSemester: 3800000,
    dormitoryAvailable: true,
    dormitoryCost: 2400000,
    koreanRequirement: "TOPIK 4급",
    accreditation: "accredited",
    topikLevel: 4,
    intake: ["봄", "가을"],
    officialUrl: "https://www.gachon.ac.kr",
    notes: { ko: "경기도. 인증대학. 의약·바이오 강점.", vi: "Trường认证.", mn: "Итгэмжлэгдсэн.", en: "Accredited. Medical/bio focus." },
  },

  // 비자심사 강화 (주의) — 2곳 (예시)
  {
    id: "warn-1",
    name: { ko: "(가명) 서울 소재 A 대학", vi: "ĐH A (Seoul)", mn: "А их сургууль (Сеул)", en: "Univ A (Seoul)" },
    region: "seoul",
    program: "language",
    tuitionPerSemester: 1500000,
    dormitoryAvailable: false,
    dormitoryCost: null,
    koreanRequirement: "없음",
    accreditation: "caution",
    topikLevel: null,
    intake: ["봄", "가을"],
    officialUrl: "#",
    notes: { ko: "⚠️ 2026년 2학기부터 1년간 비자발급 제한 대상.", vi: "⚠️ Visa bị hạn chế từ 2026/2.", mn: "⚠️ 2026/2-өөс виз хязгаарлагдана.", en: "⚠️ Visa restricted from 2026/2." },
  },
  {
    id: "warn-2",
    name: { ko: "(가명) 지방 B 대학", vi: "ĐH B (khu vực khác)", mn: "Б их сургууль", en: "Univ B" },
    region: "other",
    program: "language",
    tuitionPerSemester: 1400000,
    dormitoryAvailable: true,
    dormitoryCost: 1600000,
    koreanRequirement: "없음",
    accreditation: "caution",
    topikLevel: null,
    intake: ["봄", "가을"],
    officialUrl: "#",
    notes: { ko: "⚠️ 비자 정밀심사 대학. 신중 검토 필요.", vi: "⚠️ Visa kiểm tra kỹ.", mn: "⚠️ Виз нарийн шалгалт.", en: "⚠️ Strict visa review." },
  },

  // 대학원 (D-2) — 1곳
  {
    id: "snu-grad",
    name: { ko: "서울대학교 대학원", vi: "ĐH sau đại học SNU", mn: "Сёулын магистр", en: "SNU Graduate School" },
    region: "seoul",
    program: "graduate",
    tuitionPerSemester: 5200000,
    dormitoryAvailable: true,
    dormitoryCost: 2400000,
    koreanRequirement: "TOPIK 5급 (전공 상이)",
    accreditation: "accredited",
    topikLevel: 5,
    intake: ["봄", "가을"],
    officialUrl: "https://grad.snu.ac.kr",
    notes: { ko: "인증대학. 경쟁 매우 높음.", vi: "Trường认证.", mn: "Итгэмжлэгдсэн.", en: "Accredited. Highly competitive." },
  },
];

// 필터 헬퍼
export function filterSchools(opts: {
  region?: string;
  program?: string;
  accreditation?: string;
  maxTuition?: number;
}): School[] {
  return SCHOOLS.filter((s) => {
    if (opts.region && opts.region !== "all" && s.region !== opts.region) return false;
    if (opts.program && opts.program !== "all" && s.program !== opts.program) return false;
    if (opts.accreditation && opts.accreditation !== "all" && s.accreditation !== opts.accreditation) return false;
    if (opts.maxTuition && s.tuitionPerSemester > opts.maxTuition) return false;
    return true;
  });
}
