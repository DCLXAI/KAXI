"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/i18n/routing";
import { publicLegalCopy } from "@/lib/legal/public-legal-copy";

export function PrivacyRequestForm({ locale }: { locale: Locale }) {
  const copy = publicLegalCopy(locale);
  const [contact, setContact] = useState("");
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contact.trim() && !question.trim()) return;
    setStatus("sending");
    try {
      const response = await fetch("/api/privacy/delete-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contact: contact.trim(), question: question.trim() }),
      });
      if (!response.ok) throw new Error("PRIVACY_REQUEST_FAILED");
      setContact("");
      setQuestion("");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 max-w-2xl space-y-4" aria-describedby="privacy-request-status">
      <div className="space-y-1.5">
        <label htmlFor="privacy-contact" className="text-sm font-medium">{copy.requestContactLabel}</label>
        <Input id="privacy-contact" value={contact} onChange={(event) => setContact(event.target.value)} placeholder={copy.requestContactPlaceholder} autoComplete="email" maxLength={320} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="privacy-question" className="text-sm font-medium">{copy.requestQuestionLabel}</label>
        <Textarea id="privacy-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={copy.requestQuestionPlaceholder} maxLength={1200} rows={4} />
      </div>
      <Button type="submit" disabled={status === "sending" || (!contact.trim() && !question.trim())}>
        <Send className="h-4 w-4" />
        {status === "sending" ? copy.requestSending : copy.requestSubmit}
      </Button>
      <p id="privacy-request-status" aria-live="polite" className={`min-h-5 text-sm ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
        {status === "success" ? copy.requestSuccess : status === "error" ? copy.requestError : ""}
      </p>
    </form>
  );
}
