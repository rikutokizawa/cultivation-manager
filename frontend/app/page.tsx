import { DashboardRealtime } from "@/components/dashboard-realtime";
import { getOverview } from "@/lib/api";

export default async function DashboardPage() {
  return <DashboardRealtime initialOverview={await getOverview()} />;
}
