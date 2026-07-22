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
  return publicViewMetadata("docs", locale);
}

export default async function DocsPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  // Documents reads ?track= from the URL, so it needs a Suspense boundary —
  // same as the partners and diagnose routes.
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <KaxiPage view="docs" locale={locale} />
    </Suspense>
  );
}
