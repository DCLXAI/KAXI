import { AdminAudit } from "@/components/admin/AdminAudit";
import { forPlatformAdmin, queryAdminAudit } from "@/lib/admin/server-queries";

export default async function AdminAuditPage() {
  const initialData = await forPlatformAdmin(() => queryAdminAudit()).catch(() => null);
  return <AdminAudit initialData={initialData} />;
}
