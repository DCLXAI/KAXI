"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileWarning, Loader2, MessageSquare, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { tr } from "@/lib/i18n/translations";

export function PartnerCaseActions({ caseId, documentIds }: { caseId: string; documentIds: string[] }) {
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
          note,
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
        placeholder="메모"
      />
      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
      <div className="grid gap-2 sm:grid-cols-2">
        <Button onClick={() => submit("accept_case")} disabled={Boolean(pending)}>
          {pending === "accept_case" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {tr("case_accept", "ko")}
        </Button>
        <Button variant="outline" onClick={() => submit("add_comment")} disabled={Boolean(pending)}>
          {pending === "add_comment" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
          {tr("case_comment", "ko")}
        </Button>
        <Button variant="secondary" onClick={() => submit("request_supplement")} disabled={Boolean(pending)}>
          {pending === "request_supplement" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileWarning className="h-4 w-4" />}
          {tr("case_request_docs", "ko")}
        </Button>
        <Button variant="destructive" onClick={() => submit("close_case")} disabled={Boolean(pending)}>
          {pending === "close_case" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
          {tr("case_close", "ko")}
        </Button>
      </div>
    </div>
  );
}
