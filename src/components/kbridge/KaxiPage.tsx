"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/kbridge/Header";
import { Landing } from "@/components/kbridge/Landing";
import { Diagnosis } from "@/components/kbridge/Diagnosis";
import { Schools } from "@/components/kbridge/Schools";
import { CostCalculator } from "@/components/kbridge/CostCalculator";
import { Documents } from "@/components/kbridge/Documents";
import { Partners } from "@/components/kbridge/Partners";
import { Admin } from "@/components/kbridge/Admin";
import { Synonyms } from "@/components/kbridge/Synonyms";
import { Agent } from "@/components/kbridge/Agent";
import { KarxyWordmark } from "@/components/brand/KarxyWordmark";
import { KaxiRunningCat } from "@/components/brand/KaxiRunningCat";
import { useLangStore } from "@/store/kbridge";
import { tr, type Lang } from "@/lib/i18n/translations";
import { isViewKey, viewToPath, type ViewKey } from "@/lib/kbridge/views";
import { publicLegalCopy } from "@/lib/legal/public-legal-copy";
import { smoothScrollTo } from "@/lib/ui/scroll";

export function KaxiPage({ view, locale }: { view: ViewKey; locale?: Lang }) {
  const router = useRouter();
  const { lang, setLang } = useLangStore();
  const activeLang = locale ?? lang;
  const legalCopy = publicLegalCopy(activeLang);

  useEffect(() => {
    if (locale && locale !== lang) setLang(locale);
  }, [lang, locale, setLang]);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash && isViewKey(hash)) {
      router.replace(viewToPath(hash, locale), { scroll: false });
    }
  }, [locale, router]);

  const navigate = (nextView: string) => {
    router.push(viewToPath(nextView, locale));
    smoothScrollTo(0);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header currentView={view} locale={locale} />

      <main className={view === "agent" ? "flex-1 chat-surface dark bg-background text-foreground" : "flex-1"}>
        {view === "home" && <Landing onNavigate={navigate} />}
        {view === "agent" && <Agent />}
        {view === "diagnose" && <Diagnosis onNavigate={navigate} />}
        {view === "schools" && <Schools />}
        {view === "cost" && <CostCalculator />}
        {view === "docs" && <Documents onNavigate={navigate} />}
        {view === "partners" && <Partners />}
        {view === "admin" && <Admin />}
        {view === "synonyms" && <Synonyms />}
      </main>

      {view === "agent" ? (
        <footer className="chat-surface dark mt-auto border-t border-border/70 bg-background">
          <div className="mx-auto max-w-7xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="truncate">{tr("footer_disclaimer", activeLang)}</span>
            <span className="flex flex-wrap items-center gap-x-4 gap-y-1 shrink-0">
              <Link href={`/${activeLang}/privacy`} className="transition-colors hover:text-foreground hover:underline">{legalCopy.privacyLink}</Link>
              <Link href={`/${activeLang}/terms`} className="transition-colors hover:text-foreground hover:underline">{legalCopy.termsLink}</Link>
            </span>
          </div>
        </footer>
      ) : (
        <footer className="mt-auto border-t border-border/80 bg-card">
          <div aria-hidden className="h-px w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent dark:via-primary/30" />
          <div className="mx-auto max-w-7xl px-4 py-10">
            <div className="grid gap-8 md:grid-cols-[1.1fr_1.4fr]">
              <div className="space-y-3">
                <Link
                  href={viewToPath("home", locale)}
                  aria-label="KARXY"
                  className="inline-flex items-center gap-2.5 text-foreground/80 transition-colors hover:text-foreground"
                >
                  <KaxiRunningCat size={28} />
                  <KarxyWordmark className="h-[13px] w-auto" />
                </Link>
                <p className="text-xs text-muted-foreground">
                  © 2026 KARXY · Broker-free Korea Study Preparation
                </p>
              </div>
              <div className="space-y-2.5 text-xs leading-relaxed text-muted-foreground">
                <p>{tr("footer_disclaimer", activeLang)}</p>
                <p>{tr("footer_data_source", activeLang)}</p>
                <p>{tr("footer_company_info", activeLang)}</p>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-5">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                <Link href={`/${activeLang}/privacy`} className="transition-colors hover:text-foreground hover:underline">{legalCopy.privacyLink}</Link>
                <Link href={`/${activeLang}/terms`} className="transition-colors hover:text-foreground hover:underline">{legalCopy.termsLink}</Link>
              </div>
            </div>
          </div>
        </footer>
      )}

    </div>
  );
}
