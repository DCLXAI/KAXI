"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileWarning, Loader2, MessageSquare, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { tr, type Lang } from "@/lib/i18n/translations";

const NOTE_PLACEHOLDER: Record<Lang, string> = { ko: "메모", vi: "Ghi chú", mn: "Тэмдэглэл", en: "Note" };
const DEFAULT_NOTES: Record<Lang, Record<string, string>> = {
  ko: { accept_case: "케이스를 수임했습니다.", add_comment: "케이스 코멘트", request_supplement: "추가 서류 보완이 필요합니다.", close_case: "케이스를 종결합니다." },
  vi: { accept_case: "Đã nhận hồ sơ.", add_comment: "Bình luận hồ sơ", request_supplement: "Cần bổ sung giấy tờ.", close_case: "Đóng hồ sơ." },
  mn: { accept_case: "Кейсийг хүлээн авлаа.", add_comment: "Кейсийн тайлбар", request_supplement: "Нэмэлт баримт шаардлагатай.", close_case: "Кейсийг хаалаа." },
  en: { accept_case: "Case accepted.", add_comment: "Case comment", request_supplement: "Additional documents are required.", close_case: "Case closed." },
};

export function PartnerCaseActions({ caseId, documentIds, locale }: { caseId: string; documentIds: string[]; locale: Lang }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(action: string) {
    setPending(action);
    setError(null);
    try {
      const res = await fetch(`/api/partner/cases/${caseId}/actions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          note: note.trim() || DEFAULT_NOTES[locale][action],
          documentItemIds: action === "request_supplement" ? documentIds : [],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Action failed");
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-3">
      <Textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={4}
        placeholder={NOTE_PLACEHOLDER[locale]}
      />
      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
      <div className="grid gap-2 sm:grid-cols-2">
        <Button onClick={() => submit("accept_case")} disabled={Boolean(pending)}>
          {pending === "accept_case" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {tr("case_accept", locale)}
        </Button>
        <Button variant="outline" onClick={() => submit("add_comment")} disabled={Boolean(pending)}>
          {pending === "add_comment" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
          {tr("case_comment", locale)}
        </Button>
        <Button variant="secondary" onClick={() => submit("request_supplement")} disabled={Boolean(pending)}>
          {pending === "request_supplement" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileWarning className="h-4 w-4" />}
          {tr("case_request_docs", locale)}
        </Button>
        <Button variant="destructive" onClick={() => submit("close_case")} disabled={Boolean(pending)}>
          {pending === "close_case" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
          {tr("case_close", locale)}
        </Button>
      </div>
    </div>
  );
}
