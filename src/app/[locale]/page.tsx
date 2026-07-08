import type { Metadata } from "next";
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
  return publicViewMetadata("home", locale);
}

export default async function LocalizedHomePage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <KaxiPage view="home" locale={locale} />;
}
