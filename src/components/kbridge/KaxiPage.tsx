"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/kbridge/Header";
import { Landing } from "@/components/kbridge/Landing";
import { Diagnosis } from "@/components/kbridge/Diagnosis";
import { Schools } from "@/components/kbridge/Schools";
import { CostCalculator } from "@/components/kbridge/CostCalculator";
import { Documents } from "@/components/kbridge/Documents";
import { Partners } from "@/components/kbridge/Partners";
import { Admin } from "@/components/kbridge/Admin";
import { Synonyms } from "@/components/kbridge/Synonyms";
import { Consult } from "@/components/kbridge/Consult";
import { Agent } from "@/components/kbridge/Agent";
import { AIAssistant } from "@/components/kbridge/AIAssistant";
import { useLangStore } from "@/store/kbridge";
import { tr } from "@/lib/i18n/translations";
import { isViewKey, viewToPath, type ViewKey } from "@/lib/kbridge/views";

export function KaxiPage({ view }: { view: ViewKey }) {
  const router = useRouter();
  const { lang } = useLangStore();

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash && isViewKey(hash)) {
      router.replace(viewToPath(hash), { scroll: false });
    }
  }, [router]);

  const navigate = (nextView: string) => {
    router.push(viewToPath(nextView));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header currentView={view} />

      <main className="flex-1">
        {view === "home" && <Landing onNavigate={navigate} />}
        {view === "agent" && <Agent />}
        {view === "consult" && <Consult />}
        {view === "diagnose" && <Diagnosis onNavigate={navigate} />}
        {view === "schools" && <Schools />}
        {view === "cost" && <CostCalculator />}
        {view === "docs" && <Documents onNavigate={navigate} />}
        {view === "partners" && <Partners />}
        {view === "admin" && <Admin />}
        {view === "synonyms" && <Synonyms />}
      </main>

      {view !== "consult" && view !== "agent" && (
        <footer className="mt-auto border-t bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-6 space-y-3">
            <div className="text-xs text-muted-foreground leading-relaxed">
              ⚠️ {tr("footer_disclaimer", lang)}
            </div>
            <div className="text-xs text-muted-foreground">
              📚 {tr("footer_data_source", lang)}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
              <div className="text-xs text-muted-foreground">
                © 2026 KAXI · Broker-free Korea Study Preparation
              </div>
              <div className="text-xs text-muted-foreground">
                MVP Demo · 7/22 deadline
              </div>
            </div>
          </div>
        </footer>
      )}

      {view !== "consult" && view !== "agent" && <AIAssistant />}
    </div>
  );
}
