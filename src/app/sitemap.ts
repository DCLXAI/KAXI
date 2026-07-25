import type { MetadataRoute } from "next";
import { siteBaseUrl } from "@/lib/config/site-url";

const BASE = siteBaseUrl();
const LOCALES = ["ko", "vi", "mn", "en"] as const;
const VIEWS = ["", "/agent", "/diagnose", "/schools", "/cost", "/docs", "/partners", "/privacy", "/terms"] as const;

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
