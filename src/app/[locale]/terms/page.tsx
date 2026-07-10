import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicLegalPage } from "@/components/legal/PublicLegalPage";
import { isLocale } from "@/i18n/routing";
import { publicLegalCopy } from "@/lib/legal/public-legal-copy";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const copy = publicLegalCopy(locale);
  return { title: `${copy.termsTitle} | KAXI`, description: copy.termsSummary };
}

export default async function TermsPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <PublicLegalPage locale={locale} page="terms" />;
}
