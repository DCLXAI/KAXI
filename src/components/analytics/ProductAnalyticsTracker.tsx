"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { productLocale } from "@/lib/analytics/events";
import { trackProductEvent } from "@/lib/analytics/client";

export function ProductAnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (/^\/(admin|partner|student|login|auth|account)(?:\/|$)/.test(pathname)) return;
    const parts = pathname.split("/").filter(Boolean);
    trackProductEvent("page_view", {
      locale: productLocale(parts[0]),
      surface: parts[1] || parts[0] || "home",
      path: pathname,
    });
  }, [pathname]);

  return null;
}
