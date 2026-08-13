import { AdminCases } from "@/components/admin/AdminCases";
import { forPlatformAdmin, queryAdminCases } from "@/lib/admin/server-queries";

export default async function AdminCasesPage() {
  const initialData = await forPlatformAdmin(() => queryAdminCases("new")).catch(() => null);
  return <AdminCases initialData={initialData} />;
}
