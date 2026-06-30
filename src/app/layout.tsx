import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "K-Bridge Gateway · 브로커 없이 준비하는 한국 유학",
  description:
    "베트남·몽골 한국 유학 준비생을 위한 원스톱 플랫폼. 학교 비교, 비용 계산, 서류 준비, 입학 지원, 비자 가이드, 검증 파트너 연결.",
  keywords: [
    "한국 유학",
    "K-Bridge Gateway",
    "브로커 없이 유학",
    "du học Hàn Quốc",
    "Солонгос улсад сурах",
    "Study in Korea",
    "D-2 visa",
    "D-4 visa",
    "TOPIK",
    "어학당",
  ],
  authors: [{ name: "K-Bridge Gateway Team" }],
  openGraph: {
    title: "K-Bridge Gateway · 브로커 없이 준비하는 한국 유학",
    description:
      "학교 선택, 비용 계산, 서류 준비, 입학 지원, 비자 준비까지 한곳에서. 베트남·몽골 유학생을 위한 공식 정보 기반 플랫폼.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
