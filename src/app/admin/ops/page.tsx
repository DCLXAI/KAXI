import { AdminOps } from "@/components/admin/AdminOps";
import { getAdminOpsPayload } from "@/lib/ops/admin-ops-payload";
import { getCachedCurrentKaxiSession } from "@/lib/supabase/current-session";

export default async function AdminOpsPage() {
  const session = await getCachedCurrentKaxiSession().catch(() => null);
  const initialData = session?.user?.role === "PLATFORM_ADMIN"
    ? JSON.parse(JSON.stringify(await getAdminOpsPayload()))
    : null;
  return <AdminOps initialData={initialData} />;
}
