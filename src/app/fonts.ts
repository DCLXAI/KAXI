import localFont from "next/font/local";
import { Noto_Serif_KR } from "next/font/google";

export const pretendard = localFont({
  src: "../fonts/PretendardVariable.woff2",
  display: "swap",
  weight: "45 920",
  variable: "--font-pretendard",
});

// 헤드라인 세리프(라틴·숫자·베트남어). next/font는 Noto Serif KR의 한글 글리프를
// 서빙하지 못한다(선택 가능 서브셋: cyrillic|latin|latin-ext|vietnamese). 따라서
// 한글 제목의 세리프는 슬라이스 S1에서 self-host 폰트로 별도 적용하고, 그전까지
// 한글은 --font-serif 스택의 Pretendard로 폴백한다.
export const notoSerifKr = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-serif-brand",
});

// 한글 헤드라인 세리프. next/font의 Noto Serif KR는 한글 글리프를 서빙하지 못하므로
// Nanum Myeongjo(SIL OFL)를 self-host해 --font-serif 스택의 한글 폴백을 담당한다.
export const nanumMyeongjo = localFont({
  src: [
    { path: "../fonts/NanumMyeongjo-Regular.woff2", weight: "400" },
    { path: "../fonts/NanumMyeongjo-Bold.woff2", weight: "700" },
    { path: "../fonts/NanumMyeongjo-ExtraBold.woff2", weight: "800" },
  ],
  display: "swap",
  variable: "--font-serif-ko",
});
