import { runtimeEnvironment } from "@/infrastructure/config/runtime-environment";
import type { Transporter } from "nodemailer";
import { siteBaseUrl } from "@/lib/config/site-url";

type SendInput = { to: string; subject: string; body: string; href?: string | null };
type SendResult = { status: "sent" | "skipped" | "error" };

let testTransport: { sendMail: (m: unknown) => Promise<unknown> } | null = null;
export function __setTransportForTest(t: typeof testTransport) { testTransport = t; }

/**
 * Whether mail can actually be delivered — not merely whether a host is named.
 *
 * This used to check SMTP_HOST and SMTP_FROM only, which is a trap the moment a
 * provider needs credentials. Setting the host and the from-address makes every
 * "is mail configured?" surface report yes, while getTransport() builds an
 * unauthenticated transport that the provider rejects on every send. The result
 * is a channel that looks healthy and silently delivers nothing — worse than an
 * unset one, because readiness stops reporting the gap.
 *
 * So a declared user without a password counts as unconfigured. A host that
 * needs no auth at all (a local relay) still works, because SMTP_USER is unset
 * in that case and there is nothing to be missing.
 */
export function smtpConfigured(env: NodeJS.ProcessEnv = runtimeEnvironment()): boolean {
  if (!env.SMTP_HOST?.trim() || !env.SMTP_FROM?.trim()) return false;
  if (env.SMTP_USER?.trim() && !env.SMTP_PASS?.trim()) return false;
  return true;
}

async function getTransport() {
  if (testTransport) return testTransport;
  const nodemailer = await import("nodemailer");
  return nodemailer.createTransport({
    host: runtimeEnvironment().SMTP_HOST,
    port: Number(runtimeEnvironment().SMTP_PORT || 587),
    secure: runtimeEnvironment().SMTP_SECURE === "true",
    auth: runtimeEnvironment().SMTP_USER
      ? { user: runtimeEnvironment().SMTP_USER, pass: runtimeEnvironment().SMTP_PASS }
      : undefined,
  }) as unknown as Transporter;
}

export async function sendNotificationEmail(input: SendInput): Promise<SendResult> {
  if (!input.to || !smtpConfigured()) return { status: "skipped" };
  try {
    const transport = await getTransport();
    const text = input.href
      ? `${input.body}\n\n${siteBaseUrl()}${input.href}`
      : input.body;
    await transport.sendMail({
      from: runtimeEnvironment().SMTP_FROM,
      to: input.to,
      subject: input.subject,
      text,
    });
    return { status: "sent" };
  } catch (err) {
    console.error("[notification email] send failed", err instanceof Error ? err.message : err);
    return { status: "error" };
  }
}
