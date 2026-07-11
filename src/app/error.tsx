"use client";

import { KaxiCat } from "@/components/brand/KaxiCat";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <KaxiCat state="yawn" size={72} label="놀란 고양이" />
      <div>
        <h1 className="font-serif text-3xl font-semibold text-foreground">잠깐 문제가 생겼어요</h1>
        <p className="mt-2 text-sm text-muted-foreground">일시적인 오류예요. 다시 시도해 주세요. · Something went wrong.</p>
      </div>
      <button onClick={reset} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
        다시 시도
      </button>
    </main>
  );
}
