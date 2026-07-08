"use client";

import { useLocale, useTranslations } from "next-intl";
import { defaultLocale, isLocale } from "@/i18n/routing";
import { tr, type Lang, type TranslationKey } from "@/lib/i18n/translations";

export type LegacyTranslator = (key: TranslationKey, lang?: Lang) => string;

export function useLegacyTranslations(): LegacyTranslator {
  const translate = useTranslations();
  const activeLocale = useLocale();
  const activeLang = isLocale(activeLocale) ? activeLocale : defaultLocale;

  return (key, lang = activeLang) => {
    if (lang !== activeLang) return tr(key, lang);
    try {
      return translate(key);
    } catch {
      return tr(key, lang);
    }
  };
}
