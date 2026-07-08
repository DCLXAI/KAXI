import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseMiddlewareClient, isSupabaseAuthUnavailable } from "@/lib/supabase/server";

export async function updateSupabaseSession(req: NextRequest): Promise<NextResponse> {
  const res = NextResponse.next({ request: req });
  try {
    const client = await createSupabaseMiddlewareClient(req, res);
    await client.auth.getUser();
  } catch (err) {
    if (!isSupabaseAuthUnavailable(err)) {
      console.warn("[supabase middleware skipped]", err instanceof Error ? err.message : "unknown error");
    }
  }
  return res;
}
