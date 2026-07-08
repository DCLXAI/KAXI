import type { Locale } from "@/i18n/routing";

export const REGION_LABELS: Record<string, Record<Locale, string>> = {
  seoul: { ko: "서울", vi: "Seoul", mn: "Сеул", en: "Seoul" },
  gyeonggi: { ko: "경기", vi: "Gyeonggi", mn: "Кёнги", en: "Gyeonggi" },
  busan: { ko: "부산", vi: "Busan", mn: "Пусан", en: "Busan" },
  daegu: { ko: "대구", vi: "Daegu", mn: "Тэгу", en: "Daegu" },
  gwangju: { ko: "광주", vi: "Gwangju", mn: "Кванчжу", en: "Gwangju" },
  other: { ko: "기타 지방", vi: "Khu vực khác", mn: "Бусад бүс", en: "Other" },
};

export const PROGRAM_LABELS: Record<string, Record<Locale, string>> = {
  language: { ko: "어학당 (D-4)", vi: "Lớp tiếng (D-4)", mn: "Хэлний курс (D-4)", en: "Language (D-4)" },
  college: { ko: "전문대 (D-2)", vi: "Cao đẳng (D-2)", mn: "Коллеж (D-2)", en: "College (D-2)" },
  university: { ko: "4년제 (D-2)", vi: "ĐH (D-2)", mn: "Бакалавр (D-2)", en: "Univ (D-2)" },
  graduate: { ko: "대학원 (D-2)", vi: "Thạc sĩ (D-2)", mn: "Магистр", en: "Grad (D-2)" },
  vocational: { ko: "직업계열 (D-2)", vi: "Nghề (D-2)", mn: "Мэргэжлийн (D-2)", en: "Vocational (D-2)" },
};
