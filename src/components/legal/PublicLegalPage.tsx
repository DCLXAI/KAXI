import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Header } from "@/components/kbridge/Header";
import { PrivacyRequestForm } from "@/components/legal/PrivacyRequestForm";
import type { Locale } from "@/i18n/routing";
import { publicLegalCopy } from "@/lib/legal/public-legal-copy";

export function PublicLegalPage({ locale, page }: { locale: Locale; page: "privacy" | "terms" }) {
  const copy = publicLegalCopy(locale);
  const isPrivacy = page === "privacy";
  const sections = isPrivacy ? copy.privacySections : copy.termsSections;

  return (
    <div className="min-h-screen bg-background">
      <Header currentView={page} locale={locale} />
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <Link href={`/${locale}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />{copy.home}
        </Link>
        <div className="mt-6 border-b pb-8">
          <p className="text-sm font-medium text-primary">KAXI</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">{isPrivacy ? copy.privacyTitle : copy.termsTitle}</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{isPrivacy ? copy.privacySummary : copy.termsSummary}</p>
          <p className="mt-5 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950">{copy.reviewNotice}</p>
          <p className="mt-3 text-xs text-muted-foreground">{copy.versionLabel}</p>
        </div>

        <div className="divide-y">
          {sections.map((section) => (
            <section key={section.title} className="py-7">
              <h2 className="text-lg font-semibold tracking-normal">{section.title}</h2>
              {section.paragraphs?.map((paragraph) => <p key={paragraph} className="mt-3 text-sm leading-7 text-muted-foreground">{paragraph}</p>)}
              {section.bullets && <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground">{section.bullets.map((item) => <li key={item}>{item}</li>)}</ul>}
            </section>
          ))}
        </div>

        {isPrivacy && (
          <section className="border-t py-8">
            <h2 className="text-xl font-semibold tracking-normal">{copy.rightsTitle}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">{copy.rightsDescription}</p>
            <PrivacyRequestForm locale={locale} />
          </section>
        )}

        <div className="flex flex-wrap gap-4 border-t pt-6 text-sm">
          <Link href={`/${locale}/privacy`} className="inline-flex items-center gap-1 text-primary hover:underline">{copy.privacyLink}<ExternalLink className="h-3.5 w-3.5" /></Link>
          <Link href={`/${locale}/terms`} className="inline-flex items-center gap-1 text-primary hover:underline">{copy.termsLink}<ExternalLink className="h-3.5 w-3.5" /></Link>
        </div>
      </main>
    </div>
  );
}
