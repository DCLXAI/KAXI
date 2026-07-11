import { redirect } from "next/navigation";

export default async function StudentLoginPage({ searchParams }: { searchParams: Promise<{ lang?: string | string[] }> }) {
  const raw = (await searchParams).lang;
  const lang = Array.isArray(raw) ? raw[0] : raw;
  redirect(lang ? `/login?lang=${encodeURIComponent(lang)}` : "/login");
}
