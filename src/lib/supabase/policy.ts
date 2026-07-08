import type { UserRole } from "@prisma/client";

export type KaxiAuthArea = "student" | "partner" | "admin" | "public";

export function areaForPath(pathname: string): KaxiAuthArea {
  if (pathname.startsWith("/student")) return "student";
  if (pathname.startsWith("/partner") || pathname.startsWith("/api/partner")) return "partner";
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) return "admin";
  return "public";
}

export function canAccessArea(role: UserRole | null | undefined, area: KaxiAuthArea): boolean {
  if (area === "public") return true;
  if (area === "admin") return role === "PLATFORM_ADMIN";
  if (area === "student") return role === "STUDENT";
  if (area === "partner") return role === "PARTNER_AGENT";
  return false;
}

export function defaultLoginPath(area: KaxiAuthArea): string {
  if (area === "partner") return "/partner/login";
  if (area === "student") return "/student/login";
  if (area === "admin") return "/login";
  return "/";
}
