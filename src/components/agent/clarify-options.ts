import type { AgentLocale, OptionKey } from "./types";

export const CLARIFY_OPTIONS: Record<OptionKey, Record<AgentLocale, { value: string; label: string }[]>> = {
  region: {
    ko: [
      { value: "서울", label: "서울" },
      { value: "경기", label: "경기" },
      { value: "부산", label: "부산" },
      { value: "대구", label: "대구" },
      { value: "광주", label: "광주" },
      { value: "지역 무관", label: "지역 무관" },
    ],
    vi: [
      { value: "Seoul", label: "Seoul" },
      { value: "Gyeonggi", label: "Gyeonggi" },
      { value: "Busan", label: "Busan" },
      { value: "Daegu", label: "Daegu" },
      { value: "Gwangju", label: "Gwangju" },
      { value: "Any region", label: "Bất kỳ" },
    ],
    mn: [
      { value: "Seoul", label: "Сөүл" },
      { value: "Gyeonggi", label: "Кёнги" },
      { value: "Busan", label: "Пусан" },
      { value: "Daegu", label: "Дэгү" },
      { value: "Gwangju", label: "Гванжу" },
      { value: "Any region", label: "Аль ч бүс" },
    ],
    en: [
      { value: "Seoul", label: "Seoul" },
      { value: "Gyeonggi", label: "Gyeonggi" },
      { value: "Busan", label: "Busan" },
      { value: "Daegu", label: "Daegu" },
      { value: "Gwangju", label: "Gwangju" },
      { value: "Any region", label: "Any region" },
    ],
  },
  program: {
    ko: [
      { value: "어학당", label: "어학당" },
      { value: "전문대", label: "전문대" },
      { value: "학부", label: "학부" },
      { value: "대학원", label: "대학원" },
      { value: "직업 과정", label: "직업 과정" },
    ],
    vi: [
      { value: "language school", label: "Tiếng Hàn" },
      { value: "college", label: "Cao đẳng" },
      { value: "undergraduate", label: "Đại học" },
      { value: "graduate", label: "Sau đại học" },
      { value: "vocational", label: "Nghề" },
    ],
    mn: [
      { value: "language school", label: "Хэлний курс" },
      { value: "college", label: "Коллеж" },
      { value: "undergraduate", label: "Бакалавр" },
      { value: "graduate", label: "Магистр" },
      { value: "vocational", label: "Мэргэжил" },
    ],
    en: [
      { value: "language school", label: "Language" },
      { value: "college", label: "College" },
      { value: "undergraduate", label: "Undergraduate" },
      { value: "graduate", label: "Graduate" },
      { value: "vocational", label: "Vocational" },
    ],
  },
  visaType: {
    ko: [
      { value: "D-4 어학연수", label: "D-4" },
      { value: "D-2 학위과정", label: "D-2" },
    ],
    vi: [
      { value: "D-4 language study", label: "D-4" },
      { value: "D-2 degree study", label: "D-2" },
    ],
    mn: [
      { value: "D-4 language study", label: "D-4" },
      { value: "D-2 degree study", label: "D-2" },
    ],
    en: [
      { value: "D-4 language study", label: "D-4" },
      { value: "D-2 degree study", label: "D-2" },
    ],
  },
  nationality: {
    ko: [
      { value: "베트남", label: "베트남" },
      { value: "몽골", label: "몽골" },
      { value: "중국", label: "중국" },
      { value: "우즈베키스탄", label: "우즈벡" },
      { value: "기타", label: "기타" },
    ],
    vi: [
      { value: "Vietnam", label: "Việt Nam" },
      { value: "Mongolia", label: "Mông Cổ" },
      { value: "China", label: "Trung Quốc" },
      { value: "Uzbekistan", label: "Uzbekistan" },
      { value: "Other", label: "Khác" },
    ],
    mn: [
      { value: "Vietnam", label: "Вьетнам" },
      { value: "Mongolia", label: "Монгол" },
      { value: "China", label: "Хятад" },
      { value: "Uzbekistan", label: "Узбекистан" },
      { value: "Other", label: "Бусад" },
    ],
    en: [
      { value: "Vietnam", label: "Vietnam" },
      { value: "Mongolia", label: "Mongolia" },
      { value: "China", label: "China" },
      { value: "Uzbekistan", label: "Uzbekistan" },
      { value: "Other", label: "Other" },
    ],
  },
  education: {
    ko: [
      { value: "고졸", label: "고졸" },
      { value: "전문대", label: "전문대" },
      { value: "대졸", label: "대졸" },
      { value: "석사", label: "석사" },
    ],
    vi: [
      { value: "high school", label: "THPT" },
      { value: "college", label: "Cao đẳng" },
      { value: "university", label: "Đại học" },
      { value: "master", label: "Thạc sĩ" },
    ],
    mn: [
      { value: "high school", label: "Ахлах" },
      { value: "college", label: "Коллеж" },
      { value: "university", label: "Бакалавр" },
      { value: "master", label: "Магистр" },
    ],
    en: [
      { value: "high school", label: "High school" },
      { value: "college", label: "College" },
      { value: "university", label: "University" },
      { value: "master", label: "Master" },
    ],
  },
  koreanLevel: {
    ko: [
      { value: "한국어 없음", label: "없음" },
      { value: "TOPIK 1급", label: "TOPIK 1" },
      { value: "TOPIK 2급", label: "TOPIK 2" },
      { value: "TOPIK 3급 이상", label: "TOPIK 3+" },
    ],
    vi: [
      { value: "no Korean", label: "Chưa biết" },
      { value: "TOPIK 1", label: "TOPIK 1" },
      { value: "TOPIK 2", label: "TOPIK 2" },
      { value: "TOPIK 3 or higher", label: "TOPIK 3+" },
    ],
    mn: [
      { value: "no Korean", label: "Байхгүй" },
      { value: "TOPIK 1", label: "TOPIK 1" },
      { value: "TOPIK 2", label: "TOPIK 2" },
      { value: "TOPIK 3 or higher", label: "TOPIK 3+" },
    ],
    en: [
      { value: "no Korean", label: "None" },
      { value: "TOPIK 1", label: "TOPIK 1" },
      { value: "TOPIK 2", label: "TOPIK 2" },
      { value: "TOPIK 3 or higher", label: "TOPIK 3+" },
    ],
  },
  goal: {
    ko: [
      { value: "어학", label: "어학" },
      { value: "학위", label: "학위" },
      { value: "편입", label: "편입" },
      { value: "취업 준비", label: "취업 준비" },
    ],
    vi: [
      { value: "language study", label: "Học tiếng" },
      { value: "degree", label: "Lấy bằng" },
      { value: "transfer", label: "Chuyển tiếp" },
      { value: "career preparation", label: "Việc làm" },
    ],
    mn: [
      { value: "language study", label: "Хэл" },
      { value: "degree", label: "Зэрэг" },
      { value: "transfer", label: "Шилжилт" },
      { value: "career preparation", label: "Ажил" },
    ],
    en: [
      { value: "language study", label: "Language" },
      { value: "degree", label: "Degree" },
      { value: "transfer", label: "Transfer" },
      { value: "career preparation", label: "Career" },
    ],
  },
};
