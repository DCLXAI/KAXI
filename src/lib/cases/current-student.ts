import { db } from "@/lib/db";
import { getCurrentKaxiSession } from "@/lib/supabase/auth";

export async function currentAuthenticatedStudentProfileId(): Promise<string | null> {
  try {
    const session = await getCurrentKaxiSession();
    if (session?.user?.role !== "STUDENT") return null;
    const profile = await db.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    return profile?.id || null;
  } catch {
    return null;
  }
}
