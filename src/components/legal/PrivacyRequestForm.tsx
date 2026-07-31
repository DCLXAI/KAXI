"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/i18n/routing";
import { publicLegalCopy } from "@/lib/legal/public-legal-copy";

export function PrivacyRequestForm({ locale }: { locale: Locale }) {
  const copy = publicLegalCopy(locale);
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  // The endpoint's own message, shown verbatim on success. A local success
  // string would state what this form believes happened, and this form cannot
  // know — whether the request was acted on depends on whether the caller could
  // prove ownership, which is decided server-side and deliberately not revealed
  // by the status code.
  const [serverMessage, setServerMessage] = useState("");

  // The "exact question you asked" field is gone. The old endpoint used it as a
  // record selector, matching hashPii(question) across every row — and many
  // people type the same question, so it selected strangers' records. A shared
  // string cannot identify one person's data, so there is nothing to verify and
  // nothing to keep.

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    try {
      const response = await fetch("/api/privacy/delete-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Sent with credentials so a signed-in session and the lead_access
        // cookie both reach the endpoint — those are the two proofs it accepts.
        credentials: "same-origin",
        body: JSON.stringify({ contact: contact.trim() }),
      });
      if (!response.ok) throw new Error("PRIVACY_REQUEST_FAILED");
      const body = await response.json().catch(() => ({}));
      setContact("");
      setServerMessage(typeof body?.message === "string" ? body.message : copy.requestSuccess);
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
      <Button type="submit" disabled={status === "sending"}>
        <Send className="h-4 w-4" />
        {status === "sending" ? copy.requestSending : copy.requestSubmit}
      </Button>
      <p id="privacy-request-status" aria-live="polite" className={`min-h-5 text-sm ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
        {status === "success" ? serverMessage : status === "error" ? copy.requestError : ""}
      </p>
    </form>
  );
}
