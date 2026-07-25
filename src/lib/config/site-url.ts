// Single source of truth for the production base URL used across the app
// (ops alert admin links, sitemap, notification emails, persisted source
// metadata, etc). At a future domain cutover, override via
// NEXT_PUBLIC_APP_URL (or APP_URL) rather than hunting for hardcoded
// "https://kaxi.vercel.app" strings.
//
// As of writing, NEXT_PUBLIC_APP_URL is NOT set in Vercel production, so
// this resolves to DEFAULT_SITE_BASE_URL there today.
//
// Dependency-free by design so both server code and standalone scripts can
// import it without pulling in the rest of the app.

export const DEFAULT_SITE_BASE_URL = "https://kaxi.vercel.app";

export function siteBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (explicit?.trim()) return explicit.trim().replace(/\/+$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/+$/, "")}`;
  return DEFAULT_SITE_BASE_URL;
}
