import { DashboardRealtime } from "@/components/dashboard-realtime";
import { getLatestStatus, getSensorSeries } from "@/lib/api";

const ondotoriSource = "ondotori-current";

export default async function DashboardPage() {
  const [
    latestStatus,
    temperatureRecords,
    humidityRecords,
    co2Records,
    tankLevelRecords,
  ] = await Promise.all([
    getLatestStatus(),
    getSensorSeries("temperature", 120, ondotoriSource),
    getSensorSeries("humidity", 120, ondotoriSource),
    getSensorSeries("co2", 120, ondotoriSource),
    getSensorSeries("tank_level"),
  ]);

  return (
    <DashboardRealtime
      initialData={{
        latestStatus,
        temperatureRecords,
        humidityRecords,
        co2Records,
        tankLevelRecords,
      }}
    />
  );
}
