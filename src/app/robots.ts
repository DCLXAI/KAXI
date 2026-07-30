import type { MetadataRoute } from "next";
import { siteBaseUrl } from "@/lib/config/site-url";

// public/robots.txt was a static file, so the karxy.com cutover left its Sitemap
// line pointing at kaxi.vercel.app while sitemap.xml itself emitted karxy.com
// URLs — crawlers were handed the old host. Building it from siteBaseUrl(), the
// same helper sitemap.ts uses, makes the two agree by construction and removes
// the hardcoded host that drifted in the first place.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "Googlebot", allow: "/" },
      { userAgent: "Bingbot", allow: "/" },
      { userAgent: "Twitterbot", allow: "/" },
      { userAgent: "facebookexternalhit", allow: "/" },
      { userAgent: "*", allow: "/" },
    ],
    sitemap: `${siteBaseUrl()}/sitemap.xml`,
  };
}
