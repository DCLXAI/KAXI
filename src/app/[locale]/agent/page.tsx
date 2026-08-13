import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/kbridge/PublicShell";
import { Agent } from "@/components/kbridge/Agent";
import { isLocale } from "@/i18n/routing";
import { publicViewMetadata } from "@/lib/kbridge/public-routes";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return publicViewMetadata("agent", locale);
}

export default async function AgentPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <PublicShell view="agent" locale={locale}><Agent /></PublicShell>;
}
