import type { Locale } from "@/i18n/routing";

// 로케일과 헤드라인 서체의 연결.
//
// 별도 모듈인 이유는 이 사실을 검증할 수 있게 하기 위해서다. src/app/fonts.ts는
// next/font를 호출하므로 Next 빌드 밖에서 import할 수 없고, 그래서 서체 선택이
// 테스트되지 않은 채로 남아 있었다. 그 결과 베트남어 히어로의 성조 부호가 깨진
// 채로, 몽골어가 브랜드 서체를 잃은 채로 프로덕션에 나가 있었다.
//
// 여기 있는 값은 fonts.ts와 [locale]/layout.tsx가 모두 소비한다. 한 곳에만
// 고치고 다른 곳을 잊는 일이 생기지 않게 하려는 것이다.

/**
 * 각 로케일의 헤드라인이 실제로 렌더해야 하는 문자 체계.
 *
 * 코드에서 도출되지 않는 언어 사실이라 여기 적는다. 대신 이 값이 틀리면
 * scripts/test-locale-display-font.ts가 구글 카탈로그와 대조해서 잡는다.
 */
export const REQUIRED_DISPLAY_SUBSET: Record<Locale, string> = {
  // 한글 글리프는 Jua(--font-rounded-ko)가 맡고, 이 서체는 라틴과 숫자만 그린다.
  ko: "latin",
  en: "latin",
  // ế ộ ữ 같은 precomposed 글리프. 서체에 없으면 브라우저가 결합 부호로
  // 합성하는데, 그 부호가 글자에서 떨어져 뜬다.
  vi: "vietnamese",
  mn: "cyrillic",
};

/**
 * 디스플레이 서체와 fonts.ts가 구글에 요청하는 서브셋.
 *
 * fonts.ts가 이 배열을 그대로 쓰므로, 여기 적힌 것과 실제로 다운로드되는 것이
 * 어긋날 수 없다.
 */
export const DISPLAY_FONT_SUBSETS = {
  Fredoka: ["latin", "latin-ext"],
  Nunito: ["latin", "latin-ext", "vietnamese", "cyrillic"],
} as const;

export type DisplayFontFamily = keyof typeof DISPLAY_FONT_SUBSETS;

/**
 * Fredoka는 구글이 hebrew·latin·latin-ext로만 제공한다. 베트남어도 키릴도 없다.
 * 그래서 그 두 로케일만 Nunito로 간다 — 둥근 종단을 유지하면서 두 문자 체계를
 * 모두 갖는 유일하게 무난한 대안이다.
 */
export const DISPLAY_FONT_BY_LOCALE: Record<Locale, DisplayFontFamily> = {
  ko: "Fredoka",
  en: "Fredoka",
  vi: "Nunito",
  mn: "Nunito",
};
