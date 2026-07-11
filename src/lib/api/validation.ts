import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { JsonBodyError, readJsonBody } from "@/lib/api/json-body";

export type ParseResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

/**
 * Reads a JSON request body (size-capped via readJsonBody) and validates it
 * against a zod schema. Returns a discriminated result so callers can early
 * return the prebuilt NextResponse on failure without duplicating status
 * code / error shape logic across routes.
 *
 * Issues are reported as {path, message} only — the offending input value is
 * never echoed back, to avoid leaking PII (e.g. contact info) into error
 * responses or logs that capture them.
 */
export async function parseJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
  options: { maxBytes?: number } = {}
): Promise<ParseResult<T>> {
  let raw: unknown;
  try {
    raw = await readJsonBody(request, options.maxBytes ?? 16_384);
  } catch (err) {
    if (err instanceof JsonBodyError) {
      return { ok: false, response: NextResponse.json({ error: err.message }, { status: err.status }) };
    }
    return { ok: false, response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }) };
  }

  // safeParse only converts ZodError into { success: false }. An error thrown
  // from inside a custom .refine()/.transform() callback still propagates — keep
  // such callbacks side-effect-free so this helper's clean 400 contract holds.
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
    return { ok: false, response: NextResponse.json({ error: "Invalid request body", issues }, { status: 400 }) };
  }

  return { ok: true, data: parsed.data };
}
