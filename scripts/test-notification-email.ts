import assert from "node:assert";
import { sendNotificationEmail, __setTransportForTest } from "../src/lib/notifications/email";

async function main() {
  // env 미설정 → skipped
  delete process.env.SMTP_HOST;
  const skipped = await sendNotificationEmail({ to: "a@b.com", subject: "s", body: "b" });
  assert.equal(skipped.status, "skipped", "no SMTP env → skipped");

  // mock transport → sent, subject 전달 확인
  const calls: any[] = [];
  __setTransportForTest({ sendMail: async (m: any) => { calls.push(m); return { messageId: "x" }; } });
  process.env.SMTP_HOST = "smtp.test"; process.env.SMTP_FROM = "no-reply@kaxi";
  const sent = await sendNotificationEmail({ to: "a@b.com", subject: "심사완료", body: "본문", href: "/ko/docs" });
  assert.equal(sent.status, "sent");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].to, "a@b.com");
  assert.equal(calls[0].subject, "심사완료");

  // 수신자 없음 → skipped
  __setTransportForTest({ sendMail: async () => { throw new Error("should not send"); } });
  const noRecipient = await sendNotificationEmail({ to: "", subject: "s", body: "b" });
  assert.equal(noRecipient.status, "skipped");

  console.log("PASS notification email adapter");
}
main().catch((e) => { console.error(e); process.exit(1); });
