import type { Transporter } from "nodemailer";

type SendInput = { to: string; subject: string; body: string; href?: string | null };
type SendResult = { status: "sent" | "skipped" | "error" };

let testTransport: { sendMail: (m: unknown) => Promise<unknown> } | null = null;
export function __setTransportForTest(t: typeof testTransport) { testTransport = t; }

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

async function getTransport() {
  if (testTransport) return testTransport;
  const nodemailer = await import("nodemailer");
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  }) as unknown as Transporter;
}

export async function sendNotificationEmail(input: SendInput): Promise<SendResult> {
  if (!input.to || !smtpConfigured()) return { status: "skipped" };
  try {
    const transport = await getTransport();
    const text = input.href
      ? `${input.body}\n\nhttps://kaxi.vercel.app${input.href}`
      : input.body;
    await transport.sendMail({
      from: process.env.SMTP_FROM,
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
