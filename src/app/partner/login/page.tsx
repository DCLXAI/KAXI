import { redirect } from "next/navigation";

export default async function PartnerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string | string[]; lang?: string | string[] }>;
}) {
  const params = await searchParams;
  const invite = params.invite;
  const token = Array.isArray(invite) ? invite[0] : invite;
  const rawLang = params.lang;
  const lang = Array.isArray(rawLang) ? rawLang[0] : rawLang;
  const query = new URLSearchParams();
  if (token) query.set("invite", token);
  if (lang) query.set("lang", lang);
  redirect(query.size > 0 ? `/login?${query}` : "/login");
}
