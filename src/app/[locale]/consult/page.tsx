import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
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

export default async function ConsultPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirect(`/${locale}/agent`);
}
