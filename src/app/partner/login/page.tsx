import { redirect } from "next/navigation";

export default async function PartnerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string | string[] }>;
}) {
  const invite = (await searchParams).invite;
  const token = Array.isArray(invite) ? invite[0] : invite;
  redirect(token ? `/login?invite=${encodeURIComponent(token)}` : "/login");
}
