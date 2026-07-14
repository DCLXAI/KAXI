"use client";

import type { ProductEventName, ProductLocale } from "./events";

type EventValue = string | number | boolean | null;

function anonymousId() {
  const key = "kaxi-product-session";
  try {
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.sessionStorage.setItem(key, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

export function trackProductEvent(
  eventName: ProductEventName,
  options: {
    locale: ProductLocale;
    surface: string;
    sessionId?: string;
    path?: string;
    properties?: Record<string, EventValue>;
  },
) {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({
    eventId: crypto.randomUUID(),
    eventName,
    anonymousId: anonymousId(),
    locale: options.locale,
    surface: options.surface,
    sessionId: options.sessionId,
    path: options.path || window.location.pathname,
    properties: options.properties || {},
    occurredAt: new Date().toISOString(),
  });
  void fetch("/api/product-events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}
