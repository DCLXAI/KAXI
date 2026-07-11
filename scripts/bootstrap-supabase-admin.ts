import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import { db } from "../src/lib/db";
import { getSupabaseServerConfig } from "../src/lib/supabase/config";

function fail(message: string): never {
  throw new Error(`[bootstrap-supabase-admin] ${message}`);
}

function requestedEmail(): string {
  const argument = process.argv.find((value) => value.startsWith("--email="))?.slice("--email=".length);
  const email = (argument || process.env.SUPABASE_ADMIN_EMAIL || "").trim().toLowerCase();
  if (!email.includes("@")) fail("pass --email=admin@example.com or set SUPABASE_ADMIN_EMAIL");
  return email;
}

function shouldInvite(): boolean {
  return process.argv.includes("--invite");
}

async function resolveAuthUser(email: string): Promise<{ user: SupabaseUser; invited: boolean }> {
  const config = getSupabaseServerConfig();
  if (!config?.serviceRoleKey) fail("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

  const client = createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  for (let page = 1; page <= 20; page += 1) {
    const result = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (result.error) fail(result.error.message);
    const match = result.data.users.find((user) => user.email?.trim().toLowerCase() === email);
    if (match) {
      if (!match.email_confirmed_at) fail("Supabase user must confirm the email before admin linking");
      return { user: match, invited: false };
    }
    if (result.data.users.length < 1000) break;
  }

  if (!shouldInvite()) fail("confirmed Supabase Auth user was not found; sign up and confirm the email first, or pass --invite");
  const publicOrigin = (process.env.KAXI_PUBLIC_URL || "https://kaxi.vercel.app").replace(/\/$/, "");
  const invite = await client.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${publicOrigin}/auth/callback?next=/admin/cases`,
  });
  if (invite.error || !invite.data.user) fail(invite.error?.message || "Supabase admin invite failed");
  return { user: invite.data.user, invited: true };
}

const email = requestedEmail();

try {
  const { user: authUser, invited } = await resolveAuthUser(email);
  const [byAuthUserId, byEmail] = await Promise.all([
    db.user.findUnique({ where: { authUserId: authUser.id } }),
    db.user.findUnique({ where: { email } }),
  ]);
  if (byAuthUserId && byEmail && byAuthUserId.id !== byEmail.id) {
    fail("Supabase identity and email are already linked to different KAXI users");
  }

  const existing = byAuthUserId || byEmail;
  if (existing?.role === "PARTNER_AGENT") {
    fail("partner accounts cannot be promoted by this bootstrap command");
  }

  const user = existing
    ? await db.user.update({
        where: { id: existing.id },
        data: {
          authUserId: authUser.id,
          email,
          organizationId: null,
          role: "PLATFORM_ADMIN",
        },
      })
    : await db.user.create({
        data: {
          authUserId: authUser.id,
          email,
          locale: "ko",
          role: "PLATFORM_ADMIN",
        },
      });

  console.log(`${invited ? "Supabase admin invited and linked" : "Supabase admin linked"}: ${user.id}`);
} finally {
  await db.$disconnect();
}
