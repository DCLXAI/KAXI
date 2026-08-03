import type { MetadataRoute } from "next";
import { siteBaseUrl } from "@/lib/config/site-url";
import { guideTopics } from "@/lib/content/guide-topics";

const BASE = siteBaseUrl();
const LOCALES = ["ko", "vi", "mn", "en"] as const;
const VIEWS = ["", "/agent", "/diagnose", "/schools", "/cost", "/docs", "/partners", "/privacy", "/terms"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const views = LOCALES.flatMap((locale) =>
    VIEWS.map((view) => ({
      url: `${BASE}/${locale}${view}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: view === "" ? 1 : 0.7,
    }))
  );

  // The guide pages are the only surface that answers the questions people
  // actually type into a search engine, and none of them was listed here — the
  // sitemap carried nine views per locale and nothing else, so a corpus of 95
  // reviewed documents was invisible to search.
  //
  // Derived from guideTopics() rather than listed, so a topic cannot exist
  // without being submitted, or stay submitted after it stops existing.
  const guides = guideTopics().flatMap((topic) =>
    LOCALES.map((locale) => ({
      url: `${BASE}/${locale}/guide/${topic.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }))
  );

  return [...views, ...guides];
}
