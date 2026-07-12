import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { TypebotBubble } from "@/components/typebot/TypebotBubble";
import { ProductAnalyticsTracker } from "@/components/analytics/ProductAnalyticsTracker";
import { pretendard, notoSerifKr, nanumMyeongjo } from "./fonts";

export const metadata: Metadata = {
  title: "KAXI · 브로커 없이 준비하는 한국 유학",
  description:
    "베트남·몽골 한국 유학 준비생을 위한 원스톱 플랫폼. AI 에이전트, 학교 비교, 비용 계산, 서류 준비, 비자 가이드, 검증 파트너 연결.",
  keywords: [
    "한국 유학",
    "KAXI",
    "브로커 없이 유학",
    "du học Hàn Quốc",
    "Солонгос улсад сурах",
    "Study in Korea",
    "D-2 visa",
    "D-4 visa",
    "TOPIK",
    "어학당",
    "AI 에이전트",
  ],
  authors: [{ name: "KAXI Team" }],
  manifest: "/manifest.json",
  applicationName: "KAXI",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KAXI",
  },
  openGraph: {
    title: "KAXI · 브로커 없이 준비하는 한국 유학",
    description:
      "학교 선택, 비용 계산, 서류 준비, 입학 지원, 비자 준비까지 한곳에서. AI 에이전트가 도구를 호출해 직접 실행합니다.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export const viewport: Viewport = {
  themeColor: "#f0eee6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${pretendard.variable} ${notoSerifKr.variable} ${nanumMyeongjo.variable}`}
    >
      <body className="antialiased bg-background text-foreground">
        {children}
        <ProductAnalyticsTracker />
        <TypebotBubble />
        <Toaster />
      </body>
    </html>
  );
}
