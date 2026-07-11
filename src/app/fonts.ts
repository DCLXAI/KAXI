import localFont from "next/font/local";
import { Noto_Serif_KR } from "next/font/google";

export const pretendard = localFont({
  src: "../fonts/PretendardVariable.woff2",
  display: "swap",
  weight: "45 920",
  variable: "--font-pretendard",
});

// 헤드라인용. mn(키릴)은 Pretendard 폴백으로 커버.
export const notoSerifKr = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-serif-brand",
});
