import { prepareTestDb } from "./prepare-test-db";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

async function expectAuthError(operation: Promise<unknown>, code: string) {
  try {
    await operation;
  } catch (err) {
    const actual = err && typeof err === "object" && "code" in err ? String(err.code) : "";
    assert(actual === code, `expected ${code}, got ${actual || String(err)}`);
    return;
  }
  fail(`expected ${code} error`);
}

prepareTestDb("supabase auth bridge");

const [
  otpRouteSource,
  bootstrapAdminSource,
  passwordResetSource,
  supabaseConfigSource,
  supabaseDynamicSource,
  adminShellSource,
  apiSecuritySource,
  sessionRouteSource,
] = await Promise.all([
  Bun.file(new URL("../src/app/api/auth/supabase/otp/route.ts", import.meta.url)).text(),
  Bun.file(new URL("./bootstrap-supabase-admin.ts", import.meta.url)).text(),
  Bun.file(new URL("../src/components/auth/PasswordResetForm.tsx", import.meta.url)).text(),
  Bun.file(new URL("../src/lib/supabase/config.ts", import.meta.url)).text(),
  Bun.file(new URL("../src/lib/supabase/dynamic.ts", import.meta.url)).text(),
  Bun.file(new URL("../src/components/admin/AdminShell.tsx", import.meta.url)).text(),
  Bun.file(new URL("../src/lib/api/security.ts", import.meta.url)).text(),
  Bun.file(new URL("../src/app/api/auth/session/route.ts", import.meta.url)).text(),
]);
assert(otpRouteSource.includes('new URL("/auth/complete"'), "implicit email links should use the browser completion route");
assert(
  bootstrapAdminSource.includes("/account/reset-password?next=/admin/cases"),
  "admin invitations should open the client-side password setup route"
);
assert(
  passwordResetSource.indexOf("client.auth.setSession?.(recoveryTokens)") < passwordResetSource.indexOf("client.auth.getUser()") &&
    passwordResetSource.indexOf("client.auth.getUser()") < passwordResetSource.indexOf("client.auth.updateUser"),
  "password reset should convert implicit recovery tokens into a session before validation and update"
);
assert(
  passwordResetSource.includes('params.get("type") !== "recovery"') &&
    passwordResetSource.includes("window.history.replaceState"),
  "password reset should accept only recovery fragments and remove tokens from the address bar"
);
assert(
  supabaseConfigSource.includes("process.env.NEXT_PUBLIC_SUPABASE_URL") &&
    supabaseConfigSource.includes("process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  "client Supabase config must use statically analyzable NEXT_PUBLIC environment references"
);
assert(
  supabaseDynamicSource.includes("createBrowserClient") &&
    supabaseDynamicSource.includes("createServerClient"),
  "Supabase dynamic loader must expose both browser and server client factories"
);
assert(
  adminShellSource.includes("const hasAdminAccess = isSessionAdmin;") &&
    !adminShellSource.includes("SupabaseMfaPanel") &&
    !adminShellSource.includes("currentAal"),
  "admin UI access should depend on the linked PLATFORM_ADMIN role without an MFA enrollment gate"
);
assert(
  adminShellSource.includes('href="/"') && adminShellSource.includes('aria-label="KAXI 홈으로 이동"'),
  "admin brand link should return to the KAXI home page"
);
assert(
  !apiSecuritySource.includes("MFA verification required") &&
    !apiSecuritySource.includes("mfaVerified") &&
    !sessionRouteSource.includes("mfaRequired"),
  "admin API and session contracts should not require or expose MFA state"
);

const { db } = await import("../src/lib/db");
const { areaForPath, canAccessArea, defaultLoginPath, postLoginPath } = await import("../src/lib/supabase/policy");
const {
  createPartnerAgentInvite,
  hashPartnerInviteToken,
  syncKaxiUserForAuth,
  upsertKaxiUserForAuth,
  validatePartnerInviteToken,
} = await import("../src/lib/supabase/auth");

try {
  assert(areaForPath("/student") === "student", "student path should map to student area");
  assert(areaForPath("/api/partner/cases") === "partner", "partner API should map to partner area");
  assert(canAccessArea("STUDENT", "student"), "STUDENT should access student area");
  assert(!canAccessArea("PARTNER_AGENT", "student"), "PARTNER_AGENT should not access student area");
  assert(canAccessArea("PARTNER_AGENT", "partner"), "PARTNER_AGENT should access partner area");
  assert(!canAccessArea("STUDENT", "partner"), "STUDENT should not access partner area");
  assert(defaultLoginPath("partner") === "/login", "partner should use unified login");
  assert(defaultLoginPath("student") === "/login", "student should use unified login");
  assert(defaultLoginPath("admin") === "/login", "admin should use unified login");
  assert(postLoginPath("STUDENT") === "/student", "student should default to student home");
  assert(postLoginPath("PARTNER_AGENT") === "/partner", "partner should default to partner home");
  assert(postLoginPath("PLATFORM_ADMIN") === "/admin/cases", "admin should default to admin home");
  assert(postLoginPath("STUDENT", "/documents") === "/documents", "student may return to a public path");
  assert(postLoginPath("STUDENT", "/partner") === "/student", "student cannot redirect into partner area");
  assert(postLoginPath("STUDENT", "//evil.example") === "/student", "protocol-relative redirects must be rejected");
  assert(canAccessArea("PLATFORM_ADMIN", "admin"), "linked admin role should access the admin area");
  assert(!canAccessArea("STUDENT", "admin"), "student role must not gain admin access");

  const existingStudent = await db.user.create({
    data: {
      id: "user_auth_existing_student",
      role: "STUDENT",
      email: "student-auth@example.com",
      locale: "vi",
    },
  });
  const student = await upsertKaxiUserForAuth({
    authUserId: "11111111-1111-4111-8111-111111111111",
    email: "student-auth@example.com",
    role: "STUDENT",
    locale: "ko",
  });
  assert(student.id === existingStudent.id, "student auth mapping should link existing email user");
  assert(student.authUserId === "11111111-1111-4111-8111-111111111111", "student authUserId should be stored");
  const profile = await db.studentProfile.findUnique({ where: { userId: student.id } });
  assert(profile, "student auth mapping should ensure StudentProfile exists");

  const organization = await db.organization.create({
    data: { id: "org_auth_partner", name: "Auth Partner Office", type: "PARTNER_AGENT_OFFICE" },
  });
  const token = "phase3-auth-invite-token-00000001";
  const created = await createPartnerAgentInvite({
    organizationId: organization.id,
    email: "agent@example.com",
    token,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });
  assert(created.token === token, "create invite should return plaintext token only to caller");
  assert(created.invite.tokenHash === hashPartnerInviteToken(token), "invite should store token hash");
  assert(!created.invite.tokenHash.includes(token), "stored token hash must not include plaintext token");

  const validInvite = await validatePartnerInviteToken(token, "agent@example.com");
  assert(validInvite.organizationId === organization.id, "invite should resolve organization");
  await expectAuthError(validatePartnerInviteToken(token, "other@example.com"), "invite_email_mismatch");

  const partner = await upsertKaxiUserForAuth({
    authUserId: "22222222-2222-4222-8222-222222222222",
    email: "agent@example.com",
    role: "PARTNER_AGENT",
    inviteToken: token,
  });
  assert(partner.role === "PARTNER_AGENT", "partner mapping should set PARTNER_AGENT role");
  assert(partner.organizationId === organization.id, "partner mapping should attach organization");
  assert(partner.authUserId === "22222222-2222-4222-8222-222222222222", "partner authUserId should be stored");
  const returningPartner = await syncKaxiUserForAuth({
    authUserId: "22222222-2222-4222-8222-222222222222",
    email: "agent@example.com",
  });
  assert(returningPartner.role === "PARTNER_AGENT", "returning partner login must preserve its database role");
  assert(returningPartner.organizationId === organization.id, "returning partner must preserve its organization");
  const acceptedInvite = await db.partnerAgentInvite.findUnique({ where: { id: created.invite.id } });
  assert(acceptedInvite?.status === "ACCEPTED", "invite should be marked accepted");
  assert(acceptedInvite.acceptedUserId === partner.id, "invite should link accepted user");
  await expectAuthError(validatePartnerInviteToken(token, "agent@example.com"), "invite_not_valid");

  const expired = await createPartnerAgentInvite({
    organizationId: organization.id,
    email: "expired@example.com",
    token: "phase3-auth-invite-token-expired",
    expiresAt: new Date(Date.now() - 1000),
  });
  await expectAuthError(validatePartnerInviteToken(expired.token, "expired@example.com"), "invite_not_valid");
  await expectAuthError(
    upsertKaxiUserForAuth({
      authUserId: "33333333-3333-4333-8333-333333333333",
      email: "no-invite@example.com",
      role: "PARTNER_AGENT",
    }),
    "invite_required"
  );

  const unifiedSignup = await syncKaxiUserForAuth({
    authUserId: "44444444-4444-4444-8444-444444444444",
    email: "new-student@example.com",
    locale: "ko",
  });
  assert(unifiedSignup.role === "STUDENT", "new unified signup should create only a student account");

  const conflictingEmailUser = await db.user.create({
    data: {
      id: "user_auth_conflicting_email",
      authUserId: "55555555-5555-4555-8555-555555555555",
      role: "STUDENT",
      email: "conflict@example.com",
    },
  });
  assert(Boolean(conflictingEmailUser), "conflicting identity fixture should be created");
  await expectAuthError(
    syncKaxiUserForAuth({
      authUserId: "66666666-6666-4666-8666-666666666666",
      email: "conflict@example.com",
    }),
    "auth_identity_conflict"
  );

  const linkedAdmin = await db.user.create({
    data: {
      id: "user_auth_linked_admin",
      authUserId: "77777777-7777-4777-8777-777777777777",
      role: "PLATFORM_ADMIN",
      email: "linked-admin@example.com",
    },
  });
  const returningAdmin = await syncKaxiUserForAuth({
    authUserId: "77777777-7777-4777-8777-777777777777",
    email: "linked-admin@example.com",
  });
  assert(returningAdmin.id === linkedAdmin.id && returningAdmin.role === "PLATFORM_ADMIN", "linked admin role should be preserved");

  await db.user.create({
    data: {
      id: "user_auth_unlinked_admin",
      role: "PLATFORM_ADMIN",
      email: "unlinked-admin@example.com",
    },
  });
  await expectAuthError(
    syncKaxiUserForAuth({
      authUserId: "88888888-8888-4888-8888-888888888888",
      email: "unlinked-admin@example.com",
    }),
    "admin_link_required"
  );

  console.log("PASS unified Auth bridge: role preservation, partner invites, identity conflicts, and redirects verified");
} finally {
  await db.$disconnect();
}
