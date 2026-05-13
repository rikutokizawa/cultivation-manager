import { MonitorBoard } from "@/components/monitor-board";
import { getSensorChartSettings, getSensorLabels, getSensorSeries, getSensorSettings } from "@/lib/api";
import { sensorTypesForSettings } from "@/lib/sensors";

function startAtForInitialLoad() {
  return new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
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
      await getSensorSeries(sensorType, 5000, undefined, { startAt, perSensorLimit: true }),
    ] as const),
  );

  return (
    <div className="relative left-1/2 w-[calc(100vw-2rem)] -translate-x-1/2 sm:w-[calc(100vw-3rem)] lg:w-[calc(100vw-4rem)]">
      <MonitorBoard
        initialSettings={sensorSettings}
        initialLabels={sensorLabels}
        initialChartSettings={chartSettings}
        initialRecords={Object.fromEntries(entries)}
      />
    </div>
  );
}
