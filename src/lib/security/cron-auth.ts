import { runtimeEnvironment } from "@/infrastructure/config/runtime-environment";
import { NextRequest, NextResponse } from "next/server";
import { bearerToken, matchesRotatingSecret, primarySecret } from "@/lib/security/rotating-secret";

export function authorizeCronRequest(req: NextRequest): NextResponse | null {
  const configured = primarySecret(runtimeEnvironment(), "CRON_SECRET", 8);
  if (!configured) {
    return runtimeEnvironment().NODE_ENV === "production"
      ? NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 })
      : null;
  }
  return matchesRotatingSecret(
    bearerToken(req.headers),
    runtimeEnvironment(),
    "CRON_SECRET",
    "CRON_SECRET_PREVIOUS",
    8,
  )
    ? null
    : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
