import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { KaxiPage } from "@/components/kbridge/KaxiPage";
import { isLocale } from "@/i18n/routing";
import { publicViewMetadata } from "@/lib/kbridge/public-routes";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return publicViewMetadata("diagnose", locale);
}

export default async function DiagnosePage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  // The diagnosis flow reads ?goal= from the URL, so it needs a Suspense boundary — same as
  // the partners route.
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <KaxiPage view="diagnose" locale={locale} />
    </Suspense>
  );
}
