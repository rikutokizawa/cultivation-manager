import { MonitorBoard } from "@/components/monitor-board";
import { getSensorChartSettings, getSensorLabels, getSensorSeries, getSensorSettings } from "@/lib/api";
import { sensorTypesForSettings } from "@/lib/sensors";

function startAtForInitialLoad() {
  return new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
}

export default async function MonitorPage() {
  const [sensorSettings, sensorLabels, chartSettings] = await Promise.all([
    getSensorSettings(),
    getSensorLabels(),
    getSensorChartSettings(),
  ]);
  const startAt = startAtForInitialLoad();
  const sensorTypes = sensorTypesForSettings(sensorSettings, chartSettings);
  const entries = await Promise.all(
    sensorTypes.map(async (sensorType) => [
      sensorType,
      await getSensorSeries(sensorType, 2000, undefined, { startAt, perSensorLimit: true }),
    ] as const),
  );

  return (
    <MonitorBoard
      initialSettings={sensorSettings}
      initialLabels={sensorLabels}
      initialChartSettings={chartSettings}
      initialRecords={Object.fromEntries(entries)}
    />
  );
}
