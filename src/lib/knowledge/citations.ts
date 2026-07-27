import {
  getRagDocumentMetadata,
  pickLangText,
  type KnowledgeDoc,
} from "@/lib/data/knowledge";
import type { Lang } from "@/lib/i18n/translations";

export function hasNumericCitation(text: string): boolean {
  return /\[(\d{1,2})\]/.test(answerBody(text));
}

function sourceHeading(lang: Lang): string {
  return lang === "ko" ? "📚 출처:" : "📚 Sources:";
}

function checkedText(lang: Lang, checkedAt: string): string {
  return lang === "ko" ? `확인일 ${checkedAt}` : `checked ${checkedAt}`;
}

function sourceSectionMatch(text: string): RegExpExecArray | null {
  return /📚\s*(출처|Sources)|(^|\n)\s*(출처|Sources)\s*:/i.exec(text);
}

function answerBody(text: string): string {
  const match = sourceSectionMatch(text);
  return match ? text.slice(0, match.index) : text;
}

function hasSourceSection(text: string): boolean {
  return Boolean(sourceSectionMatch(text));
}

function sourceUrlPart(url: string): string {
  return url ? ` <${url}>` : "";
}

export function buildKnowledgeSourceList(
  docs: KnowledgeDoc[],
  lang: Lang,
  maxSources = 8
): string {
  const lines = docs.slice(0, maxSources).map((doc, index) => {
    const meta = getRagDocumentMetadata(doc, lang);
    const checked = meta.last_checked_at ? ` (${checkedText(lang, meta.last_checked_at)})` : "";
    return `- [${index + 1}] ${pickLangText(doc.title, lang)} — ${doc.source}${sourceUrlPart(meta.source_url)}${checked}`;
  });

  return `${sourceHeading(lang)}\n${lines.join("\n")}`;
}

function appendCitationToFirstAnswerLine(answer: string, citation = "[1]"): string {
  const lines = answer.split("\n");
  const targetIndex = lines.findIndex((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (trimmed.startsWith("#")) return false;
    if (/^[-*]\s*\[\d{1,2}\]/.test(trimmed)) return false;
    if (/^📚\s*(출처|Sources)/i.test(trimmed)) return false;
    if (/^(출처|Sources)\s*:/i.test(trimmed)) return false;
    return true;
  });

  if (targetIndex < 0) return `${answer.trim()} ${citation}`.trim();
  if (lines[targetIndex].includes(citation)) return answer;

  lines[targetIndex] = `${lines[targetIndex].replace(/\s+$/, "")} ${citation}`;
  return lines.join("\n");
}

/**
 * Attaches the retrieved-source list to an answer, and reports whether the
 * model actually cited anything.
 *
 * This used to staple a `[1]` onto the first line when the model had not cited
 * — which made an ungrounded answer read as a sourced legal statement next to a
 * law.go.kr URL. On an immigration product that is the worst artifact we can
 * emit, so the marker is never invented now. The source list still renders,
 * because "these are the documents we retrieved" is true either way; only the
 * per-sentence attribution was a claim we could not support.
 *
 * `grounded` is false when the model produced no citation. Callers should treat
 * that as low confidence rather than presenting the answer as sourced.
 */
export function ensureGroundedCitationAnswer({
  answer,
  docs,
  lang,
  sourceNotice,
  maxSources = 8,
}: {
  answer: string;
  docs: KnowledgeDoc[];
  lang: Lang;
  sourceNotice?: string;
  maxSources?: number;
}): { answer: string; grounded: boolean } {
  let next = answer.trim();
  const visibleDocs = docs.slice(0, maxSources);
  const grounded = visibleDocs.length === 0 || hasNumericCitation(next);

  if (visibleDocs.length > 0 && !hasSourceSection(next)) {
    next = `${next}\n\n${buildKnowledgeSourceList(visibleDocs, lang, maxSources)}`;
  }

  if (sourceNotice && !next.includes(sourceNotice)) {
    next = `${next}\n\n${sourceNotice}`;
  }

  return { answer: next, grounded };
}
