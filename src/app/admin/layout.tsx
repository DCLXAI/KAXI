import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "KAXI Admin Dashboard",
  description: "행정사 케이스, 룰, 지식, 감사 로그 운영 콘솔",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
