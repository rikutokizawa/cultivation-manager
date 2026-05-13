import { DashboardRealtime } from "@/components/dashboard-realtime";
import { getLatestStatus, getSensorLabels, getSensorSeries, getSensorSettings } from "@/lib/api";
import { sensorTypesForSettings } from "@/lib/sensors";

export default async function DashboardPage() {
  const [latestStatus, sensorSettings, sensorLabels] = await Promise.all([
    getLatestStatus(),
    getSensorSettings(),
    getSensorLabels(),
  ]);
  const sensorTypes = sensorTypesForSettings(sensorSettings);
  const recordEntries = await Promise.all(
    sensorTypes.map(async (sensorType) => [
      sensorType,
      await getSensorSeries(sensorType, 240, undefined, { perSensorLimit: true }),
    ] as const),
  );

  return (
    <DashboardRealtime
      initialData={{
        latestStatus,
        sensorSettings,
        sensorLabels,
        recordsByType: Object.fromEntries(recordEntries),
      }}
    />
  );
}
