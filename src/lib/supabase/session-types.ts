export interface KaxiSessionUser {
  id: string;
  email: string | null;
  role: "STUDENT" | "PARTNER_AGENT" | "PLATFORM_ADMIN";
  organizationId: string | null;
}

export interface KaxiSessionPayload {
  available: boolean;
  authenticated: boolean;
  user: KaxiSessionUser | null;
  currentAal: string | null;
  nextAal: string | null;
  mfaRequired: boolean;
}
