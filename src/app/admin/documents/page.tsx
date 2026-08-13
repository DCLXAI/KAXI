import { AdminDocumentVerificationMetrics } from "@/components/admin/AdminDocumentVerificationMetrics";
import { forPlatformAdmin, queryAdminDocumentMetrics } from "@/lib/admin/server-queries";

export default async function AdminDocumentsPage() {
  const initialData = await forPlatformAdmin(queryAdminDocumentMetrics).catch(() => null);
  return <AdminDocumentVerificationMetrics initialData={initialData} />;
}
