import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/api/security";
import { parseJsonBody } from "@/lib/api/validation";
import { PRODUCT_EVENT_NAMES } from "@/lib/analytics/events";

export const runtime = "nodejs";

const BLOCKED_PROPERTY_KEY = /question|answer|email|phone|contact|name|url|text|message|file/i;
const propertyValue = z.union([z.string().max(160), z.number().finite(), z.boolean(), z.null()]);
const eventSchema = z.object({
  eventId: z.string().uuid(),
  eventName: z.enum(PRODUCT_EVENT_NAMES),
  anonymousId: z.string().uuid(),
  sessionId: z.string().trim().max(160).optional(),
  locale: z.enum(["ko", "en", "vi", "mn"]),
  surface: z.string().trim().min(1).max(80),
  path: z.string().trim().max(240).regex(/^\//).optional(),
  properties: z.record(z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/), propertyValue)
    .refine((value) => Object.keys(value).length <= 16, "Too many properties")
    .refine((value) => Object.keys(value).every((key) => !BLOCKED_PROPERTY_KEY.test(key)), "Sensitive property key")
    .default({}),
  occurredAt: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, { key: "product-events", limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  const parsed = await parseJsonBody(req, eventSchema, { maxBytes: 8 * 1024 });
  if (!parsed.ok) return parsed.response;
  const event = parsed.data;
  const occurredAt = event.occurredAt ? new Date(event.occurredAt) : new Date();
  const now = Date.now();
  if (Math.abs(occurredAt.getTime() - now) > 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: "Event timestamp is outside the accepted window" }, { status: 400 });
  }

  try {
    await db.productEvent.create({
      data: {
        eventId: event.eventId,
        eventName: event.eventName,
        anonymousId: event.anonymousId,
        sessionId: event.sessionId || null,
        locale: event.locale,
        surface: event.surface,
        path: event.path || null,
        properties: event.properties,
        occurredAt,
      },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error("[POST /api/product-events]", error);
    return NextResponse.json({ error: "Could not store product event" }, { status: 500 });
  }
}
