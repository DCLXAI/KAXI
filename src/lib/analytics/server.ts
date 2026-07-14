import { createHash, randomUUID } from "crypto";
import { db } from "@/lib/db";
import type { ProductEventName, ProductLocale } from "./events";

function sessionUuid(sessionId: string) {
  const hex = createHash("sha256").update(`kaxi-product:${sessionId}`).digest("hex").slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = "8";
  const value = hex.join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

export async function recordServerProductEvent(input: {
  eventName: ProductEventName;
  sessionId: string;
  locale: ProductLocale;
  surface: string;
  properties?: Record<string, string | number | boolean | null>;
}) {
  await db.productEvent.create({
    data: {
      eventId: randomUUID(),
      eventName: input.eventName,
      anonymousId: sessionUuid(input.sessionId),
      sessionId: input.sessionId.slice(0, 160),
      locale: input.locale,
      surface: input.surface.slice(0, 80),
      properties: input.properties || {},
    },
  });
}
