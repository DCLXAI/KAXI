import { AdminAnalytics } from "@/components/admin/AdminAnalytics";
import { forPlatformAdmin, queryAdminAnalytics } from "@/lib/admin/server-queries";

export default async function AdminAnalyticsPage() {
  const initialData = await forPlatformAdmin(() => queryAdminAnalytics(30)).catch(() => null);
  return <AdminAnalytics initialData={initialData} />;
}
