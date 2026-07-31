import { z } from "zod";
import { LANGS, type Lang } from "@/lib/i18n/translations";

// One definition of the four-locale text shape the diagnosis engine produces.
//
// POST /api/leads declared warnings and nextActions as z.array(z.string()) while
// recommendPath() has always returned {ko,vi,mn,en} objects, so EVERY completed
// diagnosis was rejected with 400 — and useLeadStore.saveDiagnosis caught the
// rejection, wrote a local-<timestamp> lead into zustand and returned its id, so
// the wizard reported success while the admin inbox received nothing. Prisma's
// own column comment already said `JSON array of {ko,vi,mn,en}`; only the
// validation layer disagreed.
//
// The locale list is derived from LANGS rather than restated, so adding a
// language cannot leave this schema behind — the same reason the admin label
// allowlists are derived from their producers.
export const LOCALIZED_TEXT_LOCALES = LANGS.map((lang) => lang.code) as Lang[];

export const localizedTextSchema = z.object(
  Object.fromEntries(LOCALIZED_TEXT_LOCALES.map((locale) => [locale, z.string()])) as Record<
    Lang,
    z.ZodString
  >,
);

export type LocalizedText = z.infer<typeof localizedTextSchema>;

export const localizedTextArraySchema = z.array(localizedTextSchema);

/** True when a value is a complete four-locale text object. */
export function isLocalizedText(value: unknown): value is LocalizedText {
  return localizedTextSchema.safeParse(value).success;
}

/**
 * Reads a stored warnings/nextActions JSON column.
 *
 * Rows written before the contract was fixed can only be plain strings, because
 * that is all the old schema let through. Those are widened to the four-locale
 * shape rather than dropped, so an operator opening an old lead still sees its
 * text instead of an empty list.
 */
export function parseLocalizedTextArray(value: unknown): LocalizedText[] {
  const raw = typeof value === "string" ? safeJsonParse(value) : value;
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry): LocalizedText[] => {
    const parsed = localizedTextSchema.safeParse(entry);
    if (parsed.success) return [parsed.data];
    if (typeof entry === "string" && entry.trim()) {
      return [Object.fromEntries(LOCALIZED_TEXT_LOCALES.map((locale) => [locale, entry])) as LocalizedText];
    }
    return [];
  });
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
