import { createHash, randomBytes } from "crypto";
import { redirect } from "next/navigation";
import type { User, UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { getSupabaseAuthUser } from "@/lib/supabase/server";
import { canAccessArea, defaultLoginPath, type KaxiAuthArea } from "@/lib/supabase/policy";

export class AuthBridgeError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "AuthBridgeError";
    this.code = code;
    this.status = status;
  }
}

export interface PartnerInviteTokenPayload {
  id: string;
  organizationId: string;
  email: string | null;
  expiresAt: Date;
}

export function normalizeAuthUserId(value: string): string {
  const text = value.trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(text)) {
    throw new AuthBridgeError("invalid_auth_user_id", "Supabase auth user id must be a UUID", 400);
  }
  return text;
}

export function normalizeEmail(value: string | null | undefined): string | null {
  const text = value?.trim().toLowerCase() || "";
  return text.includes("@") ? text.slice(0, 320) : null;
}

export function hashPartnerInviteToken(token: string): string {
  const text = token.trim();
  if (text.length < 24) throw new AuthBridgeError("invalid_invite_token", "Invite token is invalid", 400);
  return createHash("sha256").update(text).digest("hex");
}

export function generatePartnerInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function createPartnerAgentInvite(input: {
  organizationId: string;
  email?: string | null;
  token?: string;
  expiresAt: Date;
}) {
  const token = input.token || generatePartnerInviteToken();
  const organization = await db.organization.findUnique({ where: { id: input.organizationId } });
  if (!organization || organization.type !== "PARTNER_AGENT_OFFICE") {
    throw new AuthBridgeError("invalid_partner_office", "Invite organization must be a partner agent office", 400);
  }

  const invite = await db.partnerAgentInvite.create({
    data: {
      organizationId: input.organizationId,
      email: normalizeEmail(input.email),
      tokenHash: hashPartnerInviteToken(token),
      expiresAt: input.expiresAt,
    },
  });

  return { invite, token };
}

export async function validatePartnerInviteToken(token: string, email?: string | null): Promise<PartnerInviteTokenPayload> {
  const tokenHash = hashPartnerInviteToken(token);
  const invite = await db.partnerAgentInvite.findUnique({
    where: { tokenHash },
    include: { organization: true },
  });
  if (!invite || invite.status !== "PENDING" || invite.expiresAt.getTime() <= Date.now()) {
    throw new AuthBridgeError("invite_not_valid", "Invite token is expired or invalid", 403);
  }
  if (invite.organization.type !== "PARTNER_AGENT_OFFICE") {
    throw new AuthBridgeError("invalid_partner_office", "Invite organization is not a partner office", 400);
  }

  const normalizedEmail = normalizeEmail(email);
  if (invite.email && normalizedEmail && invite.email !== normalizedEmail) {
    throw new AuthBridgeError("invite_email_mismatch", "Invite token does not match this email", 403);
  }

  return {
    id: invite.id,
    organizationId: invite.organizationId,
    email: invite.email,
    expiresAt: invite.expiresAt,
  };
}

export async function upsertKaxiUserForAuth(input: {
  authUserId: string;
  email?: string | null;
  role: Extract<UserRole, "STUDENT" | "PARTNER_AGENT">;
  locale?: string | null;
  inviteToken?: string | null;
}): Promise<User> {
  const authUserId = normalizeAuthUserId(input.authUserId);
  const email = normalizeEmail(input.email);
  const locale = input.locale?.trim().slice(0, 12) || "ko";

  if (input.role === "PARTNER_AGENT") {
    if (!input.inviteToken) throw new AuthBridgeError("invite_required", "Partner agent signup requires an invite token", 403);
    const invite = await validatePartnerInviteToken(input.inviteToken, email);
    return db.$transaction(async (tx) => {
      const existing = await tx.user.findFirst({
        where: { OR: [{ authUserId }, ...(email ? [{ email }] : [])] },
      });
      const user = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: {
              authUserId,
              organizationId: invite.organizationId,
              role: "PARTNER_AGENT",
              email: email || invite.email,
              locale,
            },
          })
        : await tx.user.create({
            data: {
              authUserId,
              organizationId: invite.organizationId,
              role: "PARTNER_AGENT",
              email: email || invite.email,
              locale,
            },
          });
      await tx.partnerAgentInvite.update({
        where: { id: invite.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
          acceptedUserId: user.id,
        },
      });
      return user;
    });
  }

  return db.$transaction(async (tx) => {
    const existing = await tx.user.findFirst({
      where: { OR: [{ authUserId }, ...(email ? [{ email }] : [])] },
    });
    const user = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: { authUserId, role: "STUDENT", email, locale },
        })
      : await tx.user.create({
          data: { authUserId, role: "STUDENT", email, locale },
        });
    await tx.studentProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, nationality: "VN" },
    });
    return user;
  });
}

export async function getCurrentKaxiUser(): Promise<User | null> {
  const authUser = await getSupabaseAuthUser();
  if (!authUser) return null;
  const authUserId = normalizeAuthUserId(authUser.id);
  return db.user.findUnique({ where: { authUserId } });
}

export async function requireKaxiUser(roles: UserRole[]): Promise<User> {
  const user = await getCurrentKaxiUser();
  if (!user || !roles.includes(user.role)) {
    throw new AuthBridgeError("forbidden", "Authentication or role is required", user ? 403 : 401);
  }
  return user;
}

export async function requireKaxiPageUser(area: KaxiAuthArea): Promise<User> {
  const user = await getCurrentKaxiUser();
  if (!user) redirect(defaultLoginPath(area));
  if (!canAccessArea(user.role, area)) redirect(defaultLoginPath(area));
  return user;
}
