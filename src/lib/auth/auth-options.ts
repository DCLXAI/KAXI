import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { recordAuditLog } from "@/lib/audit";
import {
  getConfiguredAdminRole,
  isAdminLoginConfigurationReady,
  verifyAdminMfa,
  verifyAdminPassword,
} from "@/lib/auth/password";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Admin login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "MFA code", type: "text" },
      },
      async authorize(credentials) {
        if (!isAdminLoginConfigurationReady()) {
          if (credentials?.email) {
            await recordAuditLog({
              actor: credentials.email,
              actorRole: "anonymous",
              action: "admin.login",
              targetType: "auth",
              success: false,
              metadata: { reason: "configuration" },
            });
          }
          return null;
        }
        if (!credentials?.email || !credentials.password) return null;

        const adminEmail = process.env.ADMIN_EMAIL?.trim() || "";
        const adminRole = getConfiguredAdminRole();
        if (!adminEmail || !adminRole) return null;

        const emailMatches = credentials.email.trim().toLowerCase() === adminEmail.toLowerCase();
        const passwordMatches = verifyAdminPassword(credentials.password);
        const mfaMatches = verifyAdminMfa(credentials.otp);

        if (emailMatches && passwordMatches && mfaMatches) {
          await recordAuditLog({
            actor: adminEmail,
            actorRole: adminRole,
            action: "admin.login",
            targetType: "auth",
            success: true,
            metadata: { authType: "credentials", mfaRequired: Boolean(process.env.ADMIN_MFA_TOTP_SECRET) },
          });
          return {
            id: "admin",
            email: adminEmail,
            name: "KAXI Admin",
            role: adminRole,
          };
        }

        await recordAuditLog({
          actor: credentials.email || "unknown",
          actorRole: "anonymous",
          action: "admin.login",
          targetType: "auth",
          success: false,
          metadata: {
            reason: !emailMatches ? "email" : !passwordMatches ? "password" : "mfa",
            mfaRequired: Boolean(process.env.ADMIN_MFA_TOTP_SECRET),
          },
        });
        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = user.role || "user";
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.role = token.role || "user";
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

declare module "next-auth" {
  interface User {
    role?: "owner" | "admin" | "viewer" | "user";
  }

  interface Session {
    user: {
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role?: "owner" | "admin" | "viewer" | "user";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "owner" | "admin" | "viewer" | "user";
  }
}
