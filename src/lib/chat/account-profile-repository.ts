import { db } from "@/lib/db";
import { getCurrentKaxiUser } from "@/lib/supabase/auth";
import type { StudentChatProfileFields } from "@/lib/chat/account-profile";

// Best-effort: only returns a student id when a logged-in STUDENT with a
// StudentProfile is resolved. Any failure degrades to null (chat proceeds
// anonymously). Mirrors the write-time best-effort pattern in /api/leads.
export async function resolveLoggedInStudentId(): Promise<string | null> {
  try {
    const user = await getCurrentKaxiUser();
    if (!user || user.role !== "STUDENT") return null;
    const profile = await db.studentProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    return profile ? user.id : null;
  } catch (error) {
    console.warn("[account-profile] logged-in student lookup failed", error);
    return null;
  }
}

export async function loadStudentChatProfile(userId: string): Promise<StudentChatProfileFields | null> {
  try {
    const row = await db.studentProfile.findUnique({
      where: { userId },
      select: { visaType: true, targetVisa: true, chatStudyStage: true },
    });
    return row ?? null;
  } catch (error) {
    console.warn("[account-profile] StudentProfile read failed", error);
    return null;
  }
}

export async function fillStudentChatProfile(
  userId: string,
  fills: Partial<{ visaType: string; targetVisa: string; chatStudyStage: string }>,
): Promise<void> {
  if (Object.keys(fills).length === 0) return;
  try {
    await db.studentProfile.update({ where: { userId }, data: fills });
  } catch (error) {
    console.warn("[account-profile] StudentProfile fill failed", error);
  }
}
