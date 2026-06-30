import NextAuth from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/auth-options";
import { isAdminLoginConfigurationReady } from "@/lib/auth/password";

const handler = NextAuth(authOptions);

function isSessionRequest(req: NextRequest): boolean {
  return new URL(req.url).pathname.endsWith("/session");
}

export function GET(req: NextRequest, ctx: unknown) {
  if (!isAdminLoginConfigurationReady() && isSessionRequest(req)) {
    return NextResponse.json({});
  }

  return handler(req, ctx as never);
}

export function POST(req: NextRequest, ctx: unknown) {
  return handler(req, ctx as never);
}
