import { DashboardRealtime } from "@/components/dashboard-realtime";
import {
  getLatestStatus,
  getSensorChartSettings,
  getSensorLabels,
  getSensorSeries,
  getSensorSettings,
} from "@/lib/api";
import { sensorTypesForSettings } from "@/lib/sensors";

export default async function DashboardPage() {
  const [latestStatus, sensorSettings, sensorLabels, sensorChartSettings] = await Promise.all([
    getLatestStatus(),
    getSensorSettings(),
    getSensorLabels(),
    getSensorChartSettings(),
  ]);
  const sensorTypes = sensorTypesForSettings(sensorSettings, sensorChartSettings);
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
        sensorChartSettings,
        recordsByType: Object.fromEntries(recordEntries),
      }}
    />
  );
}
