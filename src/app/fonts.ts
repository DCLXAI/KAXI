import localFont from "next/font/local";
import { Fredoka, Jua, Nunito } from "next/font/google";

// subsets 배열이 src/lib/i18n/display-font.ts의 DISPLAY_FONT_SUBSETS를 그대로
// 베껴 적고 있다. 상수를 spread해서 공유하려 했지만 next/font의 SWC 변환이
// 정적으로 읽을 수 있는 리터럴만 허용해서 "Unexpected spread"로 빌드가 깨진다.
// 그래서 공유 대신 일치를 강제한다 — scripts/test-locale-display-font.ts가
// 여기 적힌 리터럴과 표를 대조하고, 어긋나면 CI가 떨어진다.

// 본문 서체. 한글과 그 외를 별도 파일로 받는다.
//
// 전에는 PretendardVariable.woff2 한 덩어리 2,057,688 바이트를 unicode-range
// 없이 걸어서, 어느 로케일이든 방문자가 2 MB를 전부 받았다. 그 2 MB의 78%는
// 한글 음절 11,172자인데 베트남어·몽골어 방문자에게는 한 글자도 쓰이지 않는다.
// 본문 서체라 LCP가 여기 묶여 있었다.
//
// 쪼갠 뒤: 라틴 331,764 · 한글 1,696,616 바이트.
// vi·mn·en 방문자는 331 KB만 받는다(84% 감소). ko 방문자는 둘 다 받으므로
// 총량은 거의 같지만, 한글 쪽이 preload에서 빠져 렌더 시작을 막지 않는다.
//
// 더 잘게 쪼개면 한국어도 줄일 수 있다(앱이 쓰는 음절 681자만 뽑으면 117 KB).
// 하지만 그러려면 흩어진 범위 수천 개를 적어야 하고, next/font가
// "Font loader values must be explicitly written literals"를 강제해서 fonts.ts에
// 수십 KB짜리 문자열 리터럴이 박힌다. 그건 next/font를 걷어내야 하는 별개 작업이다.
//
// 파일 생성: scripts/subset-pretendard.py
export const pretendardLatin = localFont({
  src: "../fonts/Pretendard-latin.woff2",
  display: "swap",
  weight: "45 920",
  variable: "--font-pretendard-latin",
  declarations: [{ prop: "unicode-range", value: "U+0-ABFF, U+D7A4-10FFFF" }],
  // 폴백 face에는 unicode-range가 걸리지 않는다. 켜 두면 이 폴백이 한글까지
  // 자기가 그리겠다고 나서서 아래 한글 face가 쓰이지 않는다.
  adjustFontFallback: false,
});

export const pretendardKorean = localFont({
  src: "../fonts/Pretendard-korean.woff2",
  display: "swap",
  weight: "45 920",
  variable: "--font-pretendard-korean",
  declarations: [{ prop: "unicode-range", value: "U+AC00-D7A3" }],
  // 1.7 MB를 preload하면 쪼갠 의미가 없다. CSS는 렌더 블로킹이라 어차피
  // 즉시 발견되고, display:swap이 그 사이를 메운다.
  preload: false,
});

// KARXY의 친근한 버블 워드마크와 연결되는 라틴·숫자용 둥근 디스플레이 서체.
export const fredoka = Fredoka({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  display: "swap",
  variable: "--font-rounded-latin",
});

// 베트남어·몽골어 헤드라인용 디스플레이 서체.
//
// Fredoka로는 이 두 언어를 쓸 수 없다. 구글이 제공하는 Fredoka 서브셋은
// hebrew·latin·latin-ext 뿐이라 vietnamese도 cyrillic도 없다. 그 결과가
// 프로덕션에 그대로 나가 있었다. 베트남어 히어로 "Du học Hàn Quốc"에서
// 브라우저가 precomposed 글리프 대신 결합 부호를 합성해 성조 부호가 글자에서
// 떨어져 떠 있었고, 몽골어는 키릴 글리프가 아예 없어 Pretendard로 폴백해
// 브랜드 서체를 잃었다. 캔버스로 재보면 `"Fredoka", monospace`로 잰 키릴 문자열
// 폭이 monospace 단독 폭과 소수점까지 같다 — Fredoka가 기여한 글리프가 0이다.
//
// Nunito는 둥근 종단을 가진 같은 계열이면서 cyrillic과 vietnamese를 모두 갖는다
// (구글 카탈로그에서 이 두 조건을 동시에 만족하는 둥근 서체는 Nunito, Comfortaa,
// M PLUS Rounded 1c 뿐이고 뒤 둘은 각각 형태가 과하거나 CJK 페이로드가 크다).
//
// 폴백 체인이 아니라 로케일별 교체인 이유: 체인으로 두면 "Quốc"의 Q·u·c는
// Fredoka, ố만 Nunito로 렌더되어 한 단어 안에서 서체가 섞인다.
export const nunito = Nunito({
  subsets: ["latin", "latin-ext", "vietnamese", "cyrillic"],
  weight: "variable",
  display: "swap",
  preload: false,
  variable: "--font-rounded-intl",
});

// 한글 헤드라인용 둥근 디스플레이 서체. 본문에는 Pretendard를 유지해
// 긴 안내 문장과 다국어 정보의 가독성을 보존한다.
export const jua = Jua({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  preload: false,
  variable: "--font-rounded-ko",
});
