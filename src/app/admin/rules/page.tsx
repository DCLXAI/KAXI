import { AdminRules } from "@/components/admin/AdminRules";
import { forPlatformAdmin, queryAdminRules } from "@/lib/admin/server-queries";

export default async function AdminRulesPage() {
  const initialData = await forPlatformAdmin(queryAdminRules).catch(() => null);
  return <AdminRules initialData={initialData} />;
}
