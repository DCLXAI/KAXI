import { readFileSync } from "node:fs";
import { locales } from "../src/i18n/routing";
import { KNOWLEDGE_DOCS, getSourceMetadata } from "../src/lib/data/knowledge";
import { guideTitle } from "../src/lib/content/guide-copy";
import {
  GUIDE_VISA_CODES,
  MIN_DOCUMENTS_PER_TOPIC,
  TOPIC_MERGE_THRESHOLD,
  guideCitations,
  guideStaticParams,
  guideTopicBySlug,
  guideTopics,
} from "../src/lib/content/guide-topics";

// The public guide pages are the only surface a search engine can rank, and
// they are generated rather than written. That makes a specific failure cheap
// and invisible: a corpus edit quietly empties a page, or fills it with text
// that has no source, and the page keeps ranking while saying nothing anyone
// can check.
//
// So what is pinned here is not "the pages render" but the properties that make
// them worth publishing at all — every paragraph carries a real official source
// and a checked date, no two pages are the same page, and nothing appears that
// the product would not cite.

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

const topics = guideTopics();

// 1. There must be pages, and each must carry enough evidence to answer.
{
  // 20 is what the corpus currently supports, measured — not a target.
  //
  // The plan estimated "7 tracks x ~6 intents = ~42 topics". That estimate was
  // made before anyone counted the corpus. Measuring (visa code x intent) pairs
  // shows why the real number is lower and why that is correct:
  //
  //   cost                      0-2 documents per status (the corpus has 3 in total)
  //   refusal_or_reapplication  0-1 per status
  //   status_change (F-2/F-5)   0
  //
  // Those pages would rank for a question they cannot answer. Reaching 42 would
  // mean writing content without evidence, which is the one thing this product
  // refuses to do — so the shortfall is a corpus fact to fix upstream, not a
  // threshold to lower here.
  //
  // Widening intent matching to all four locales was measured too, and rejected:
  // it takes work_permission from 17 documents to 49 by matching English
  // "hours?" and Vietnamese "giấy phép" incidentally, which drags re-entry
  // permits and departure inspection onto a page about working hours. Korean is
  // the language the corpus is authored in and the precise one.
  //
  // A floor rather than an equality: growing the corpus should add pages freely,
  // but losing them should be noticed.
  assertOk(
    topics.length >= 20,
    `guide coverage fell to ${topics.length} topics from the 20 the corpus supports; a document or source likely expired`,
  );
  for (const topic of topics) {
    assertOk(
      topic.documents.length >= MIN_DOCUMENTS_PER_TOPIC,
      `${topic.slug} has ${topic.documents.length} documents; a page below ${MIN_DOCUMENTS_PER_TOPIC} is a stub that ranks for a question it cannot answer`,
    );
    assertOk(topic.visaCodes.length > 0, `${topic.slug} covers no status`);
    for (const code of topic.visaCodes) {
      assertOk(
        (GUIDE_VISA_CODES as readonly string[]).includes(code),
        `${topic.slug} claims status ${code}, which is not a published status`,
      );
    }
  }
}

// 2. Every cited paragraph must be checkable. This is the whole premise: a page
//    that asserts something without a source the reader can open is the thing
//    the product refuses to do in chat, and doing it in HTML is no better.
{
  for (const topic of topics) {
    for (const locale of locales) {
      const citations = guideCitations(topic, locale);
      assertOk(citations.length === topic.documents.length, `${topic.slug}/${locale} dropped citations`);
      for (const citation of citations) {
        assertOk(citation.body.trim().length > 0, `${topic.slug}/${locale} cites ${citation.docId} with empty text`);
        assertOk(citation.title.trim().length > 0, `${topic.slug}/${locale} cites ${citation.docId} with no title`);
        assertOk(
          citation.sourceUrl.startsWith("https://"),
          `${topic.slug} cites ${citation.docId} without an https source the reader can open`,
        );
        assertOk(
          /^\d{4}-\d{2}-\d{2}$/.test(citation.verifiedAt),
          `${topic.slug} cites ${citation.docId} without a checked date (${citation.verifiedAt})`,
        );
      }
    }
  }
}

console.log("PASS guide pages: every published paragraph carries an official source URL and a checked date");

// 3. No two pages may be near-duplicates. Before merging, f-2/f-5 required
//    documents and d-2/d-4 work permission cited IDENTICAL sets — publishing
//    those separately is duplicate content, and the honest reading is that the
//    corpus does not distinguish the cases yet.
{
  for (let i = 0; i < topics.length; i += 1) {
    for (let j = i + 1; j < topics.length; j += 1) {
      const left = new Set(topics[i]!.documents.map((doc) => doc.id));
      const right = new Set(topics[j]!.documents.map((doc) => doc.id));
      const intersection = [...left].filter((id) => right.has(id)).length;
      const union = new Set([...left, ...right]).size;
      const overlap = union === 0 ? 0 : intersection / union;
      assertOk(
        overlap < TOPIC_MERGE_THRESHOLD,
        `${topics[i]!.slug} and ${topics[j]!.slug} overlap ${overlap.toFixed(2)} — they cite the same evidence and are one page, not two`,
      );
    }
  }

  const slugs = topics.map((topic) => topic.slug);
  assertOk(new Set(slugs).size === slugs.length, "two topics resolved to the same slug");
}

// 4. Monitor documents describe what KARXY watches, not what a reader must do.
//    A page built from one would tell a visitor about our crawler.
{
  const published = new Set(topics.flatMap((topic) => topic.documents.map((doc) => doc.id)));
  const monitors = KNOWLEDGE_DOCS.filter((doc) => /감시|모니터/.test(doc.title.ko));
  assertOk(monitors.length > 0, "expected the corpus to contain monitor documents; the exclusion may be matching nothing");
  for (const monitor of monitors) {
    assertOk(!published.has(monitor.id), `${monitor.id} is a monitoring document and must not be published as guidance`);
  }

  // And every published document must have current source metadata — an expired
  // source is one the product itself would refuse to answer from today.
  for (const docId of published) {
    const doc = KNOWLEDGE_DOCS.find((item) => item.id === docId)!;
    const meta = getSourceMetadata(doc.source);
    assertOk(meta.url?.startsWith("https://"), `${docId} is published but its source has no https URL`);
  }
}

console.log("PASS guide pages: no two pages cite the same evidence, and monitoring documents are never published");

// 5. Every page must be reachable and submitted. A generated page that the
//    sitemap does not list is invisible, which is the exact problem these pages
//    were built to fix.
{
  const params = guideStaticParams();
  assertOk(
    params.length === topics.length * locales.length,
    `expected ${topics.length * locales.length} (locale, topic) pairs, got ${params.length}`,
  );
  for (const { locale, topic } of params) {
    assertOk(guideTopicBySlug(topic), `${topic} is pre-rendered but does not resolve`);
    assertOk((locales as readonly string[]).includes(locale), `unexpected locale ${locale}`);
  }

  const sitemap = readFileSync("src/app/sitemap.ts", "utf8");
  assertOk(
    sitemap.includes("guideTopics()"),
    "the sitemap must derive guide URLs from guideTopics(); a hand-written list drifts and the drifted copy is the one submitted",
  );
  assertOk(sitemap.includes("/guide/"), "the sitemap does not emit guide URLs");
}

// 6. Titles must be locale-specific. A Vietnamese page titled in Korean ranks
//    for nothing and tells the reader the translation is cosmetic.
{
  const sample = topics[0]!;
  const titles = new Map(locales.map((locale) => [locale, guideTitle(sample, locale)]));
  assertOk(new Set(titles.values()).size > 1, "guide titles are identical across locales");
  for (const [locale, title] of titles) {
    assertOk(title.includes(sample.visaCodes[0]!), `${locale} title lost the status code: ${title}`);
  }
}

console.log("PASS guide pages: every topic is pre-rendered, listed in the sitemap, and titled in its own locale");

// 7. No topic may be an orphan. The pages shipped reachable only from the
//    sitemap and from four "related" links on sibling pages; a search engine
//    weights an orphan far below a page inside a linked cluster, and a reader
//    who lands on one has no way to reach the rest. Building the pages and
//    leaving them unfindable is the same failure the effort was meant to fix.
{
  const { readFileSync } = await import("node:fs");
  const hub = readFileSync("src/app/[locale]/guide/page.tsx", "utf8");
  assertOk(hub.includes("guideTopics()"), "the hub must list topics derived from the corpus, not a fixed list");
  assertOk(
    /href=\{`\/\$\{locale\}\/guide\/\$\{topic\.slug\}`\}/.test(hub),
    "the hub must link every topic it lists",
  );

  // Grouping must cover every topic — a group filter that silently drops one
  // leaves that page an orphan again.
  const grouped = GUIDE_VISA_CODES.flatMap((code) => topics.filter((topic) => topic.visaCodes[0] === code));
  assertOk(
    grouped.length === topics.length,
    `the hub groups ${grouped.length} of ${topics.length} topics; the rest would be unreachable from it`,
  );

  const page = readFileSync("src/app/[locale]/guide/[topic]/page.tsx", "utf8");
  assertOk(
    /href=\{`\/\$\{locale\}\/guide`\}/.test(page),
    "each guide page must link back to the hub, so the cluster is linked in both directions",
  );

  const sitemap = readFileSync("src/app/sitemap.ts", "utf8");
  assertOk(sitemap.includes("/guide`"), "the hub itself must be in the sitemap");
}

console.log("PASS guide pages: the hub lists every topic and every page links back to it");
