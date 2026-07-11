import type { MetadataRoute } from "next";

const BASE = "https://kaxi.vercel.app";
const LOCALES = ["ko", "vi", "mn", "en"] as const;
const VIEWS = ["", "/diagnose", "/schools", "/cost", "/docs", "/partners", "/consult", "/agent", "/privacy", "/terms"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return LOCALES.flatMap((locale) =>
    VIEWS.map((view) => ({
      url: `${BASE}/${locale}${view}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: view === "" ? 1 : 0.7,
    }))
  );
}
