import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { getCachedCurrentKaxiSession } from "@/lib/supabase/current-session";
import type { KaxiSessionPayload } from "@/lib/supabase/session-types";

export const metadata: Metadata = {
  title: "KARXY Admin Dashboard",
  description: "행정사 케이스, 룰, 지식, 감사 로그 운영 콘솔",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let initialSession: KaxiSessionPayload = { available: true, authenticated: false, user: null };
  try {
    const session = await getCachedCurrentKaxiSession();
    if (session?.user) {
      initialSession = {
        available: true,
        authenticated: true,
        user: {
          id: session.user.id,
          email: session.user.email,
          role: session.user.role,
          organizationId: session.user.organizationId,
        },
      };
    }
  } catch {
    initialSession = { available: false, authenticated: false, user: null };
  }
  return <AdminShell initialSession={initialSession}>{children}</AdminShell>;
}
