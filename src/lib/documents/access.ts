import type { UserRole } from "@prisma/client";
import { requireKaxiUser } from "@/lib/supabase/auth";

export const DOCUMENT_WORKSPACE_ROLES = [
  "STUDENT",
  "PARTNER_AGENT",
  "PLATFORM_ADMIN",
] as const satisfies readonly UserRole[];

export function requireDocumentWorkspaceUser() {
  return requireKaxiUser([...DOCUMENT_WORKSPACE_ROLES]);
}
