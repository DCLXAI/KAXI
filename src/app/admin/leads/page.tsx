import { NextIntlClientProvider } from "next-intl";
import koMessages from "../../../../messages/ko.json";
import { AdminDashboard } from "@/components/admin-leads/AdminDashboard";
import { forPlatformAdmin, queryAdminLeadDashboard } from "@/lib/admin/server-queries";

export default async function AdminLeadsPage() {
  const initialData = await forPlatformAdmin(queryAdminLeadDashboard).catch(() => null);
  return (
    <NextIntlClientProvider locale="ko" messages={koMessages}>
      <AdminDashboard initialData={initialData} />
    </NextIntlClientProvider>
  );
}
