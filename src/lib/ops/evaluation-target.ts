import { runtimeEnvironment } from "@/infrastructure/config/runtime-environment";
function configured(value: string | undefined) {
  return value?.trim().replace(/\/+$/, "") || "";
}

function expectedProductionOrigin(env: NodeJS.ProcessEnv) {
  const explicit = configured(env.KAXI_PRODUCTION_BASE_URL) || configured(env.NEXT_PUBLIC_SITE_URL);
  if (explicit) {
    try {
      return new URL(explicit).origin;
    } catch {
      return null;
    }
  }
  const vercelHost = configured(env.VERCEL_PROJECT_PRODUCTION_URL);
  if (!vercelHost) return null;
  try {
    return new URL(vercelHost.startsWith("http") ? vercelHost : `https://${vercelHost}`).origin;
  } catch {
    return null;
  }
}

export function evaluateProductionEvaluationTarget(
  value: unknown,
  env: NodeJS.ProcessEnv = runtimeEnvironment(),
) {
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false, baseUrl: null, origin: null, expectedOrigin: expectedProductionOrigin(env), reason: "base_url_missing" };
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, baseUrl: value, origin: null, expectedOrigin: expectedProductionOrigin(env), reason: "base_url_invalid" };
  }
  const expectedOrigin = expectedProductionOrigin(env);
  const local = url.hostname === "localhost"
    || url.hostname === "127.0.0.1"
    || url.hostname === "::1"
    || url.hostname.endsWith(".local");
  if (url.protocol !== "https:" || local) {
    return { ok: false, baseUrl: value, origin: url.origin, expectedOrigin, reason: "not_public_https" };
  }
  if (expectedOrigin && url.origin !== expectedOrigin) {
    return { ok: false, baseUrl: value, origin: url.origin, expectedOrigin, reason: "production_origin_mismatch" };
  }
  return { ok: true, baseUrl: value, origin: url.origin, expectedOrigin, reason: null };
}
