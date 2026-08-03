import { KNOWLEDGE_DOCS, getSourceMetadata, isSourceReviewCurrent } from "@/lib/data/knowledge";
import type { KnowledgeDoc } from "@/lib/data/knowledge-types";
import { QUESTION_INTENTS } from "@/lib/chat/retrieval-tuning";
import { LANGS, type Lang } from "@/lib/i18n/translations";

// Public, indexable guide pages built from the corpus KARXY already answers
// from.
//
// The 95 knowledge documents are the thing people actually search for — "D-2
// 연장 서류", "D-10 변경 요건" — and until now none of them was a page a search
// engine could rank. The sitemap carried 36 URLs: nine views times four
// locales. The answers existed and were invisible.
//
// Two rules shape this module, and both come from the same place: a page must
// not claim anything the product would not.
//
// 1. TOPICS ARE DERIVED, NOT LISTED. A hand-written list of "42 topics" would
//    drift from the corpus the moment a document is added or retired, and the
//    drifted copy is the one that ships. Membership is decided by the same
//    QUESTION_INTENTS patterns the retrieval reranker uses, so a page's
//    contents and a chat answer's contents cannot disagree.
//
// 2. NOTHING IS WRITTEN TO FILL SPACE. Most individual documents are short —
//    d2-overview is 182 characters — and padding them with generated prose is
//    exactly the "answer without evidence" behaviour the product refuses. So a
//    page groups several documents around one question and cites each of them
//    separately, which is what an answer already looks like.

/** Stay statuses worth their own page. Ordered as a person moves through them. */
export const GUIDE_VISA_CODES = ["D-2", "D-4", "D-10", "E-7", "F-2", "F-5"] as const;
export type GuideVisaCode = (typeof GUIDE_VISA_CODES)[number];

/**
 * The minimum number of cited documents a page must have.
 *
 * Below this a page is a stub with a title, which is worse than no page: it
 * ranks for a question it cannot answer, and the reader learns that KARXY
 * looks like every other thin visa site.
 */
export const MIN_DOCUMENTS_PER_TOPIC = 2;

export interface GuideTopic {
  slug: string;
  /** Every status this page covers. More than one when the evidence is shared. */
  visaCodes: GuideVisaCode[];
  intentId: string;
  documents: KnowledgeDoc[];
}

/**
 * Above this, two statuses are citing the same evidence and are not two topics.
 *
 * Measured, not guessed: before merging, f-2/f-5 required-documents and
 * d-2/d-4 work-permission cited IDENTICAL document sets, and d-2/d-4
 * eligibility overlapped 0.86. Publishing those as separate pages is duplicate
 * content, and the honest reading is that the corpus does not yet distinguish
 * the cases — so the page says "D-2 · D-4" instead of pretending to be two
 * pages that happen to say the same thing.
 */
export const TOPIC_MERGE_THRESHOLD = 0.8;

function jaccard(left: KnowledgeDoc[], right: KnowledgeDoc[]): number {
  const a = new Set(left.map((doc) => doc.id));
  const b = new Set(right.map((doc) => doc.id));
  const intersection = [...a].filter((id) => b.has(id)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Most specific evidence first.
 *
 * A document naming the status in its title is about that status; one that
 * merely mentions it in the body is background. Ties break on body length and
 * then on id, so the order is stable between builds and two deploys of the
 * same corpus produce byte-identical pages.
 */
function orderCitations(documents: KnowledgeDoc[], codes: GuideVisaCode[]): KnowledgeDoc[] {
  const titleMentions = (doc: KnowledgeDoc) =>
    codes.some((code) => new RegExp(`${code.replace("-", "[-\\s]?")}(?![0-9])`, "i").test(doc.title.ko));
  return [...documents].sort((left, right) => {
    const byTitle = Number(titleMentions(right)) - Number(titleMentions(left));
    if (byTitle !== 0) return byTitle;
    const byLength = right.content.ko.length - left.content.ko.length;
    if (byLength !== 0) return byLength;
    return left.id.localeCompare(right.id);
  });
}

/** Monitor documents describe what KARXY watches, not what a reader must do. */
function isMonitorDoc(doc: KnowledgeDoc): boolean {
  return /감시|모니터/.test(doc.title.ko);
}

/**
 * True when the document is about this status.
 *
 * Matched against the Korean body and keywords rather than the id, because ids
 * are naming choices and the body is the thing being cited. "D-2" also has to
 * match "D-2-1" and the spaced "D 2" forms that appear in official text.
 */
function mentionsVisaCode(doc: KnowledgeDoc, code: GuideVisaCode): boolean {
  const pattern = new RegExp(`${code.replace("-", "[-\\s]?")}(?![0-9])`, "i");
  return pattern.test(doc.content.ko) || pattern.test(doc.title.ko)
    || doc.keywords.some((keyword) => pattern.test(keyword));
}

/**
 * Documents that carry evidence for this intent.
 *
 * Uses the reranker's own evidencePattern, so "this document answers a document
 * question" means the same thing here as it does during retrieval.
 */
function answersIntent(doc: KnowledgeDoc, intentId: string): boolean {
  const intent = QUESTION_INTENTS.find((item) => item.id === intentId);
  if (!intent) return false;
  return intent.evidencePattern.test(doc.content.ko) || intent.evidencePattern.test(doc.title.ko);
}

/** Every topic with enough cited evidence to be worth publishing. */
export function guideTopics(referenceDate: Date = new Date()): GuideTopic[] {
  const publishable = KNOWLEDGE_DOCS.filter((doc) => {
    if (isMonitorDoc(doc)) return false;
    // An expired source is one KARXY itself would not answer from today.
    if (!isSourceReviewCurrent(doc.source, referenceDate)) return false;
    const meta = getSourceMetadata(doc.source);
    return Boolean(meta.url?.startsWith("https://") && meta.verifiedAt);
  });

  const topics: GuideTopic[] = [];
  for (const intent of QUESTION_INTENTS) {
    // Build one candidate per status, then fold together the ones citing the
    // same evidence. Merging within an intent only: a documents page and a
    // timing page are different questions even when they share sources.
    const candidates: { codes: GuideVisaCode[]; documents: KnowledgeDoc[] }[] = [];
    for (const visaCode of GUIDE_VISA_CODES) {
      const documents = publishable.filter(
        (doc) => mentionsVisaCode(doc, visaCode) && answersIntent(doc, intent.id),
      );
      if (documents.length < MIN_DOCUMENTS_PER_TOPIC) continue;

      const twin = candidates.find((item) => jaccard(item.documents, documents) >= TOPIC_MERGE_THRESHOLD);
      if (twin) {
        twin.codes.push(visaCode);
        // Keep the union, so the merged page cites everything either status had.
        const seen = new Set(twin.documents.map((doc) => doc.id));
        twin.documents.push(...documents.filter((doc) => !seen.has(doc.id)));
      } else {
        candidates.push({ codes: [visaCode], documents });
      }
    }

    for (const candidate of candidates) {
      topics.push({
        slug: `${candidate.codes.map((code) => code.toLowerCase()).join("-")}-${intent.id.replace(/_/g, "-")}`,
        visaCodes: candidate.codes,
        intentId: intent.id,
        documents: orderCitations(candidate.documents, candidate.codes),
      });
    }
  }
  return topics;
}

export function guideTopicBySlug(slug: string, referenceDate: Date = new Date()): GuideTopic | null {
  return guideTopics(referenceDate).find((topic) => topic.slug === slug) ?? null;
}

/** Every (locale, slug) pair the route should pre-render. */
export function guideStaticParams(referenceDate: Date = new Date()) {
  const locales = LANGS.map((lang) => lang.code) as Lang[];
  return guideTopics(referenceDate).flatMap((topic) =>
    locales.map((locale) => ({ locale, topic: topic.slug })),
  );
}

/** A cited paragraph: the text, and where a reader can check it. */
export interface GuideCitation {
  docId: string;
  title: string;
  body: string;
  sourceLabel: string;
  sourceUrl: string;
  verifiedAt: string;
}

export function guideCitations(topic: GuideTopic, locale: Lang): GuideCitation[] {
  return topic.documents.map((doc) => {
    const meta = getSourceMetadata(doc.source);
    return {
      docId: doc.id,
      title: doc.title[locale] || doc.title.ko,
      body: doc.content[locale] || doc.content.ko,
      sourceLabel: meta.label,
      sourceUrl: meta.url,
      verifiedAt: meta.verifiedAt,
    };
  });
}
