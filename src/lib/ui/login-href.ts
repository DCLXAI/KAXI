import type { Locale } from "@/i18n/routing";

// /login lives outside app/[locale], so the auth screen learns the language
// from ?lang and where to return from ?next (UnifiedAuthForm reads both, and
// falls back to Korean + /student when they are missing). Call sites kept
// dropping one or the other — a Vietnamese student mid-upload would land on a
// Korean form and then get sent to the dashboard instead of back to the task.
export function loginHref(locale: Locale | string, next?: string): string {
  const params = new URLSearchParams({ lang: locale });
  if (next) params.set("next", next);
  return `/login?${params.toString()}`;
}
