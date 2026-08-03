import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@/i18n/routing";
import { siteBaseUrl } from "@/lib/config/site-url";
import { guideCopy, guideTitle } from "@/lib/content/guide-copy";
import { GUIDE_VISA_CODES, guideTopics } from "@/lib/content/guide-topics";

// The hub the 80 guide pages were missing.
//
// They shipped reachable only from the sitemap and from four "related" links on
// sibling pages — orphans. A search engine can discover an orphan but weights it
// far below a page inside a linked cluster, and a reader who lands on one has no
// way to see the rest. The pages were built and then left unfindable, which is
// the same failure the whole effort was meant to fix one level down.

type PageProps = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const copy = guideCopy(locale);
  const topics = guideTopics();
  const sources = topics.reduce((total, topic) => total + topic.documents.length, 0);
  const base = siteBaseUrl();
  return {
    title: `${copy.hubTitle} | KARXY`,
    description: `${copy.hubIntro} ${copy.topicCount(topics.length, sources)}`,
    alternates: {
      canonical: `${base}/${locale}/guide`,
      languages: Object.fromEntries(locales.map((item) => [item, `${base}/${item}/guide`])),
    },
  };
}

export default async function GuideHubPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const copy = guideCopy(locale);
  const topics = guideTopics();
  const sources = topics.reduce((total, topic) => total + topic.documents.length, 0);

  // Grouped by the first status each page covers, in the order a person moves
  // through them, so the hub reads as a path rather than an alphabetical dump.
  const groups = GUIDE_VISA_CODES.map((code) => ({
    code,
    topics: topics.filter((topic) => topic.visaCodes[0] === code),
  })).filter((group) => group.topics.length > 0);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-bold leading-tight text-foreground sm:text-4xl">
          {copy.hubTitle}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{copy.hubIntro}</p>
        <p className="mt-2 text-sm text-primary">{copy.topicCount(topics.length, sources)}</p>
      </header>

      <div className="space-y-7">
        {groups.map((group) => (
          <section key={group.code} data-testid="guide-group">
            <h2 className="text-lg font-bold text-foreground">{group.topics[0]!.visaCodes.join(" · ")}</h2>
            <ul className="mt-3 space-y-2">
              {group.topics.map((topic) => (
                <li key={topic.slug}>
                  <Link
                    href={`/${locale}/guide/${topic.slug}`}
                    className="flex items-baseline justify-between gap-3 rounded-lg border border-border/45 bg-card/40 px-4 py-3 hover:border-primary/45"
                  >
                    <span className="text-[15px] font-medium text-foreground">{guideTitle(topic, locale)}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{topic.documents.length}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <aside className="mt-10 rounded-xl border border-primary/45 bg-primary/10 p-6">
        <h2 className="text-lg font-bold text-foreground">{copy.ctaTitle}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{copy.ctaBody}</p>
        <Link
          href={`/${locale}/diagnose`}
          className="mt-4 inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          {copy.ctaButton}
        </Link>
      </aside>
    </main>
  );
}
