import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { recordAuditLog } from "@/lib/audit";
import { verifyAdminPassword, verifyTotp } from "@/lib/auth/password";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_ROLE = process.env.ADMIN_ROLE === "viewer" ? "viewer" : process.env.ADMIN_ROLE === "admin" ? "admin" : "owner";

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
        if (!ADMIN_EMAIL || (!process.env.ADMIN_PASSWORD_HASH && !process.env.ADMIN_PASSWORD)) return null;
        if (!credentials?.email || !credentials.password) return null;

        const emailMatches = credentials.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
        const passwordMatches = verifyAdminPassword(credentials.password);
        const mfaMatches = verifyTotp(credentials.otp, process.env.ADMIN_MFA_TOTP_SECRET);

        if (emailMatches && passwordMatches && mfaMatches) {
          await recordAuditLog({
            actor: ADMIN_EMAIL,
            actorRole: ADMIN_ROLE,
            action: "admin.login",
            targetType: "auth",
            success: true,
            metadata: { authType: "credentials", mfaEnabled: Boolean(process.env.ADMIN_MFA_TOTP_SECRET) },
          });
          return {
            id: "admin",
            email: ADMIN_EMAIL,
            name: "KAXI Admin",
            role: ADMIN_ROLE,
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
            mfaEnabled: Boolean(process.env.ADMIN_MFA_TOTP_SECRET),
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
