"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Languages, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Lang } from "@/lib/i18n/translations";
import { workspaceCopy } from "@/lib/i18n/workspace";

export function WorkspaceLanguageSwitcher({ locale }: { locale: Lang }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const changeLocale = async (nextLocale: string) => {
    if (nextLocale === locale) return;
    setSaving(true);
    try {
      const response = await fetch("/api/auth/supabase/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: nextLocale }),
      });
      if (!response.ok) throw new Error("locale_sync_failed");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-label={workspaceCopy[locale].saveLanguage} /> : <Languages className="h-4 w-4 text-muted-foreground" />}
      <Select value={locale} onValueChange={(value) => void changeLocale(value)} disabled={saving}>
        <SelectTrigger className="w-36" aria-label={workspaceCopy[locale].language}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ko">한국어</SelectItem>
          <SelectItem value="vi">Tiếng Việt</SelectItem>
          <SelectItem value="mn">Монгол</SelectItem>
          <SelectItem value="en">English</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
