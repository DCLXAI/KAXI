import { AdminKnowledge } from "@/components/admin/AdminKnowledge";
import { forPlatformAdmin, queryAdminKnowledge } from "@/lib/admin/server-queries";

export default async function AdminKnowledgePage() {
  const initialData = await forPlatformAdmin(() => queryAdminKnowledge(1, 25)).catch(() => null);
  return <AdminKnowledge initialData={initialData} />;
}
