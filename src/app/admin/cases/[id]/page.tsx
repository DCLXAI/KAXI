import { AdminCaseDetail } from "@/components/admin/AdminCaseDetail";
import { forPlatformAdmin, queryAdminCase } from "@/lib/admin/server-queries";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminCaseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const initialData = await forPlatformAdmin(() => queryAdminCase(id)).catch(() => null);
  return <AdminCaseDetail caseId={id} initialData={initialData} />;
}
