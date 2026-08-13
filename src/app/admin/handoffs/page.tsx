import { AdminHandoffs } from "@/components/admin/AdminHandoffs";
import { forPlatformAdmin, queryAdminHandoffs } from "@/lib/admin/server-queries";

export default async function AdminHandoffsPage() {
  const initialData = await forPlatformAdmin(queryAdminHandoffs).catch(() => null);
  return <AdminHandoffs initialData={initialData} />;
}
