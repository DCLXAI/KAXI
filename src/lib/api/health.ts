import packageJson from "../../../package.json";

export function getHealthPayload() {
  return {
    name: "KAXI API",
    status: "ok",
    version: packageJson.version,
    commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || null,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    checkedAt: new Date().toISOString(),
  };
}
