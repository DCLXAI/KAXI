import { AdminCaseDetail } from "@/components/admin/AdminCaseDetail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminCaseDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <AdminCaseDetail caseId={id} />;
}
