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
import { useLangStore } from "@/store/kbridge";
import { tr, type Lang } from "@/lib/i18n/translations";
import { isViewKey, viewToPath, type ViewKey } from "@/lib/kbridge/views";
import { publicLegalCopy } from "@/lib/legal/public-legal-copy";

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
    window.scrollTo({ top: 0, behavior: "smooth" });
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
        <footer className="mt-auto border-t bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="truncate">⚠️ {tr("footer_disclaimer", activeLang)}</span>
            <span className="flex flex-wrap items-center gap-x-4 gap-y-1 shrink-0">
              <Link href={`/${activeLang}/privacy`} className="hover:text-foreground hover:underline">{legalCopy.privacyLink}</Link>
              <Link href={`/${activeLang}/terms`} className="hover:text-foreground hover:underline">{legalCopy.termsLink}</Link>
            </span>
          </div>
        </footer>
      ) : (
        <footer className="mt-auto border-t bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-6 space-y-3">
            <div className="text-xs text-muted-foreground leading-relaxed">
              ⚠️ {tr("footer_disclaimer", activeLang)}
            </div>
            <div className="text-xs text-muted-foreground">
              📚 {tr("footer_data_source", activeLang)}
            </div>
            <div className="text-xs text-muted-foreground">
              🏢 {tr("footer_company_info", activeLang)}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
              <div className="text-xs text-muted-foreground">
                © 2026 KAXI · Broker-free Korea Study Preparation
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                <Link href={`/${activeLang}/privacy`} className="hover:text-foreground hover:underline">{legalCopy.privacyLink}</Link>
                <Link href={`/${activeLang}/terms`} className="hover:text-foreground hover:underline">{legalCopy.termsLink}</Link>
              </div>
            </div>
          </div>
        </footer>
      )}

    </div>
  );
}
