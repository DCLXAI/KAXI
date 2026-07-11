"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { workspaceLocale } from "@/lib/i18n/workspace";

const LOADING_COPY = {
  ko: "로그인 정보를 확인하고 있습니다.",
  vi: "Đang xác minh thông tin đăng nhập.",
  mn: "Нэвтрэх мэдээллийг шалгаж байна.",
  en: "Verifying your sign-in.",
} as const;

interface SyncResponse {
  error?: string;
  redirectTo?: string;
}

export function AuthComplete() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const started = useRef(false);
  const locale = workspaceLocale(searchParams.get("locale"));

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function complete() {
      const client = await createSupabaseBrowserClient();
      const authResult = await client.auth.getUser();
      if (authResult.error || !authResult.data?.user) throw new Error("auth_session_missing");

      // Supabase implicit links place credentials in the fragment. Remove them
      // as soon as the browser client has persisted the session cookie.
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);

      const response = await fetch("/api/auth/supabase/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          inviteToken: searchParams.get("inviteToken") || undefined,
          locale: searchParams.get("locale") || "ko",
          next: searchParams.get("next") || undefined,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as SyncResponse;
      if (!response.ok) {
        await client.auth.signOut?.();
        throw new Error(data.error || "account_sync_failed");
      }

      router.replace(data.redirectTo || "/student");
      router.refresh();
    }

    void complete().catch(() => {
      const locale = searchParams.get("locale") || "ko";
      router.replace(`/login?error=callback_failed&lang=${encodeURIComponent(locale)}`);
      router.refresh();
    });
  }, [router, searchParams]);

  return (
    <main lang={locale} className="flex min-h-screen flex-col items-center justify-center gap-3 bg-muted/30 px-4 text-center">
      <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
      <p className="text-sm text-muted-foreground" aria-live="polite">{LOADING_COPY[locale]}</p>
    </main>
  );
}
