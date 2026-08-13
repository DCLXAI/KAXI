"use client";

import useSWR from "swr";
import type { KaxiSessionPayload } from "@/lib/supabase/session-types";

async function fetchSession(url: string): Promise<KaxiSessionPayload> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Session lookup failed");
  return response.json() as Promise<KaxiSessionPayload>;
}

export function useKaxiSession(fallbackData?: KaxiSessionPayload) {
  const session = useSWR("/api/auth/session", fetchSession, {
    fallbackData,
    revalidateOnFocus: true,
    shouldRetryOnError: false,
  });

  return {
    ...session,
    status: session.isLoading ? "loading" as const : session.data?.authenticated ? "authenticated" as const : "unauthenticated" as const,
  };
}
