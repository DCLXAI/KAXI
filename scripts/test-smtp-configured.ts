import { smtpConfigured } from "../src/lib/notifications/email";

// A mail channel that reports itself configured while delivering nothing is
// worse than one that is plainly unset, because readiness stops showing the gap
// and the deletion verification link silently never arrives.
//
// This is not hypothetical. smtpConfigured() checked SMTP_HOST and SMTP_FROM
// only. Setting those two for a provider that needs credentials — which is
// every hosted provider — made every "is mail configured?" surface answer yes,
// while getTransport() built an unauthenticated transport the provider rejects
// on every send. The half-configured state is the dangerous one, so it is what
// this file pins.

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

const env = (values: Record<string, string>) => values as NodeJS.ProcessEnv;

// 1. Nothing set is not configured, and neither is either half alone.
{
  assertOk(!smtpConfigured(env({})), "an empty environment must not report mail as configured");
  assertOk(!smtpConfigured(env({ SMTP_HOST: "smtp.resend.com" })), "a host with no from-address cannot send");
  assertOk(!smtpConfigured(env({ SMTP_FROM: "no-reply@karxy.com" })), "a from-address with no host cannot send");
  assertOk(
    !smtpConfigured(env({ SMTP_HOST: "   ", SMTP_FROM: "no-reply@karxy.com" })),
    "whitespace is not a host",
  );
}

// 2. The trap: a hosted provider declared without its credential. Both halves
//    the old check looked at are present, and nothing can be delivered.
{
  const halfConfigured = env({
    SMTP_HOST: "smtp.resend.com",
    SMTP_FROM: "no-reply@karxy.com",
    SMTP_USER: "resend",
  });
  assertOk(
    !smtpConfigured(halfConfigured),
    "a declared SMTP_USER with no SMTP_PASS must not report configured — the provider rejects every send",
  );

  assertOk(
    !smtpConfigured(env({ ...halfConfigured, SMTP_PASS: "  " } as Record<string, string>)),
    "a blank password is a missing password",
  );
}

// 3. Fully configured is configured — the guard must not be so strict that a
//    working setup reads as broken.
{
  assertOk(
    smtpConfigured(env({
      SMTP_HOST: "smtp.resend.com",
      SMTP_FROM: "no-reply@karxy.com",
      SMTP_USER: "resend",
      SMTP_PASS: "re_test_key",
    })),
    "host, from-address, user and password together must report configured",
  );

  // A relay that needs no authentication has no user, so there is no
  // credential to be missing. Requiring one would break local and self-hosted
  // setups for the sake of a rule aimed at hosted providers.
  assertOk(
    smtpConfigured(env({ SMTP_HOST: "localhost", SMTP_FROM: "no-reply@karxy.com" })),
    "an unauthenticated relay is configured when it names a host and a sender",
  );
}

console.log("PASS smtp configured: a half-configured mailer never reports ready, and a working one does");

// 4. Readiness must not keep its own copy of this rule. Two definitions of "is
//    mail configured?" drift, and the one that drifts is the one operators read.
{
  const { readFileSync } = await import("node:fs");
  const readiness = readFileSync("src/lib/ops/readiness.ts", "utf8");
  assertOk(
    readiness.includes("smtpConfigured(env)"),
    "readiness must derive mail readiness from the sender rather than re-checking SMTP_* itself",
  );
  assertOk(
    !/deletionMailReady\s*=\s*configured\(env\.SMTP_HOST\)/.test(readiness),
    "readiness still re-states the SMTP check; that copy had already drifted from what the sender requires",
  );
}

console.log("PASS smtp configured: readiness derives mail readiness from the sender instead of restating it");
