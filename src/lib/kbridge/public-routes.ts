import type { Metadata } from "next";
import { defaultLocale, localePath, locales, type Locale } from "@/i18n/routing";
import { tr, type TranslationKey } from "@/lib/i18n/translations";
import type { ViewKey } from "@/lib/kbridge/views";

export const PUBLIC_VIEW_KEYS = [
  "home",
  "agent",
  "consult",
  "diagnose",
  "schools",
  "cost",
  "docs",
  "partners",
] as const satisfies readonly ViewKey[];

export type PublicViewKey = (typeof PUBLIC_VIEW_KEYS)[number];

export const PUBLIC_VIEW_PATHS: Record<PublicViewKey, string> = {
  home: "/",
  agent: "/agent",
  consult: "/consult",
  diagnose: "/diagnose",
  schools: "/schools",
  cost: "/cost",
  docs: "/docs",
  partners: "/partners",
};

const PUBLIC_TITLE_KEYS: Record<PublicViewKey, TranslationKey | null> = {
  home: "hero_title",
  agent: null,
  consult: null,
  diagnose: "diagnose_title",
  schools: "schools_title",
  cost: "cost_title",
  docs: "docs_title",
  partners: "partners_title",
};

const PUBLIC_DESCRIPTION_KEYS: Record<PublicViewKey, TranslationKey | null> = {
  home: "hero_subtitle",
  agent: "ai_disclaimer",
  consult: "features_subtitle",
  diagnose: "diagnose_subtitle",
  schools: "schools_subtitle",
  cost: "cost_subtitle",
  docs: "docs_subtitle",
  partners: "partners_subtitle",
};

const AGENT_TITLES: Record<Locale, string> = {
  ko: "AI 에이전트",
  vi: "AI Agent",
  mn: "AI Agent",
  en: "AI Agent",
};

const CONSULT_TITLES: Record<Locale, string> = {
  ko: "전문 상담",
  vi: "Tư vấn chuyên môn",
  mn: "Мэргэжлийн зөвлөгөө",
  en: "Expert consultation",
};

export function isPublicViewKey(value: string): value is PublicViewKey {
  return (PUBLIC_VIEW_KEYS as readonly string[]).includes(value);
}

export function publicViewPath(view: PublicViewKey, locale: Locale = defaultLocale): string {
  return localePath(locale, PUBLIC_VIEW_PATHS[view]);
}

export function publicViewFromSegment(segment: string): PublicViewKey | null {
  if (segment === "") return "home";
  return isPublicViewKey(segment) ? segment : null;
}

export function publicRouteAlternates(view: PublicViewKey) {
  return Object.fromEntries(
    locales.map((locale) => [locale, publicViewPath(view, locale)]),
  ) as Record<Locale, string>;
}

export function publicViewMetadata(view: PublicViewKey, locale: Locale): Metadata {
  const titleKey = PUBLIC_TITLE_KEYS[view];
  const descriptionKey = PUBLIC_DESCRIPTION_KEYS[view];
  const rawTitle =
    view === "agent"
      ? AGENT_TITLES[locale]
      : view === "consult"
        ? CONSULT_TITLES[locale]
        : titleKey
          ? tr(titleKey, locale)
          : "KAXI";
  const description = descriptionKey ? tr(descriptionKey, locale) : tr("hero_subtitle", locale);
  const path = publicViewPath(view, locale);

  return {
    title: `${rawTitle} · KAXI`,
    description,
    alternates: {
      canonical: path,
      languages: {
        ...publicRouteAlternates(view),
        "x-default": publicViewPath(view, defaultLocale),
      },
    },
    openGraph: {
      title: `${rawTitle} · KAXI`,
      description,
      url: path,
      locale,
      alternateLocale: locales.filter((item) => item !== locale),
      type: "website",
    },
  };
}
