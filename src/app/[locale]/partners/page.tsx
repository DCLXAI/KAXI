import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/kbridge/PublicShell";
import { Partners } from "@/components/kbridge/Partners";
import { isLocale } from "@/i18n/routing";
import { publicViewMetadata } from "@/lib/kbridge/public-routes";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return publicViewMetadata("partners", locale);
}

export default async function PartnersPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <PublicShell view="partners" locale={locale}><Partners locale={locale} /></PublicShell>
    </Suspense>
  );
}
