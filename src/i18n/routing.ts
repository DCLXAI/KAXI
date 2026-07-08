import { defineRouting } from "next-intl/routing";

export const locales = ["ko", "vi", "mn", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ko";

export const localeLabels: Record<Locale, { label: string; flag: string }> = {
  ko: { label: "한국어", flag: "🇰🇷" },
  vi: { label: "Tiếng Việt", flag: "🇻🇳" },
  mn: { label: "Монгол", flag: "🇲🇳" },
  en: { label: "English", flag: "🇬🇧" },
};

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
});

export function isLocale(value: string | undefined): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export function localePath(locale: Locale, pathname = "/") {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (normalized === "/") return `/${locale}`;
  return `/${locale}${normalized}`;
}
