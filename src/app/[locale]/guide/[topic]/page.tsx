import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@/i18n/routing";
import { siteBaseUrl } from "@/lib/config/site-url";
import { guideCopy, guideDescription, guideTitle } from "@/lib/content/guide-copy";
import { guideCitations, guideStaticParams, guideTopicBySlug, guideTopics } from "@/lib/content/guide-topics";

// The public, indexable half of KARXY.
//
// Every paragraph on this page is a document the product would cite when
// answering the same question, shown with its official source URL and the date
// that source was last checked. Nothing here is written to fill the template —
// if the corpus has no evidence for a question, there is no page for it.
//
// That is not only an honesty rule. The citation and the checked date are also
// the strongest signals a search engine has that this page is worth ranking,
// so the design that keeps the product truthful is the same one that makes it
// findable.

type PageProps = { params: Promise<{ locale: string; topic: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return guideStaticParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, topic: slug } = await params;
  if (!isLocale(locale)) return {};
  const topic = guideTopicBySlug(slug);
  if (!topic) return {};

  const base = siteBaseUrl();
  return {
    title: `${guideTitle(topic, locale)} | KARXY`,
    description: guideDescription(topic, locale),
    alternates: {
      canonical: `${base}/${locale}/guide/${slug}`,
      // Every locale carries the same evidence, so they are translations of one
      // page rather than competing pages.
      languages: Object.fromEntries(locales.map((item) => [item, `${base}/${item}/guide/${slug}`])),
    },
    openGraph: {
      title: guideTitle(topic, locale),
      description: guideDescription(topic, locale),
      url: `${base}/${locale}/guide/${slug}`,
      type: "article",
    },
  };
}

export default async function GuidePage({ params }: PageProps) {
  const { locale, topic: slug } = await params;
  if (!isLocale(locale)) notFound();
  const topic = guideTopicBySlug(slug);
  if (!topic) notFound();

  const copy = guideCopy(locale);
  const citations = guideCitations(topic, locale);
  const related = guideTopics()
    .filter((item) => item.slug !== topic.slug
      && item.visaCodes.some((code) => topic.visaCodes.includes(code)))
    .slice(0, 4);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
      <article>
        <nav className="mb-4 text-sm" aria-label="breadcrumb">
          <Link href={`/${locale}/guide`} className="text-primary underline underline-offset-2">
            {copy.hubBack}
          </Link>
        </nav>
        <header className="mb-8">
          <h1 className="font-serif text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            {guideTitle(topic, locale)}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {copy.sourceCount(citations.length)}
          </p>
        </header>

        <div className="space-y-6">
          {citations.map((citation, index) => (
            <section
              key={citation.docId}
              className="rounded-xl border border-border/45 bg-card/40 p-5"
              data-testid="guide-citation"
            >
              <h2 className="text-base font-bold text-foreground">
                <span className="mr-2 text-primary">[{index + 1}]</span>
                {citation.title}
              </h2>
              <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">
                {citation.body}
              </p>
              <p className="mt-3 border-t border-border/45 pt-3 text-xs text-muted-foreground">
                {copy.sourceLabel}:{" "}
                <a
                  href={citation.sourceUrl}
                  className="underline underline-offset-2 hover:text-foreground"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                >
                  {citation.sourceLabel}
                </a>
                {" · "}
                {copy.checkedLabel} {citation.verifiedAt}
              </p>
            </section>
          ))}
        </div>

        <p className="mt-8 rounded-xl border border-border/45 bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
          {copy.disclaimer}
        </p>

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

        {related.length > 0 && (
          <nav className="mt-10" aria-label={copy.relatedTitle}>
            <h2 className="text-sm font-bold text-foreground">{copy.relatedTitle}</h2>
            <ul className="mt-3 space-y-2">
              {related.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/${locale}/guide/${item.slug}`}
                    className="text-sm text-primary underline underline-offset-2"
                  >
                    {guideTitle(item, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </article>
    </main>
  );
}
