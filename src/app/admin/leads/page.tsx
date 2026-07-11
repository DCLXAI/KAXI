import { NextIntlClientProvider } from "next-intl";
import koMessages from "../../../../messages/ko.json";
import { AdminDashboard } from "@/components/admin-leads/AdminDashboard";

export default function AdminLeadsPage() {
  return (
    <NextIntlClientProvider locale="ko" messages={koMessages}>
      <AdminDashboard />
    </NextIntlClientProvider>
  );
}
