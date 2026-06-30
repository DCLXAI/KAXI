import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Admin login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return null;
        if (!credentials?.email || !credentials.password) return null;

        if (credentials.email === ADMIN_EMAIL && credentials.password === ADMIN_PASSWORD) {
          return {
            id: "admin",
            email: ADMIN_EMAIL,
            name: "KAXI Admin",
            role: "admin" as const,
          };
        }

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
    role?: "admin" | "user";
  }

  interface Session {
    user: {
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role?: "admin" | "user";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "admin" | "user";
  }
}
