import { MonitorBoard } from "@/components/monitor-board";
import { getSensorLabels, getSensorSeries, getSensorSettings } from "@/lib/api";
import { sensorTypesForSettings } from "@/lib/sensors";

function startAtForInitialLoad() {
  return new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
}

export default async function MonitorPage() {
  const [sensorSettings, sensorLabels] = await Promise.all([getSensorSettings(), getSensorLabels()]);
  const startAt = startAtForInitialLoad();
  const sensorTypes = sensorTypesForSettings(sensorSettings);
  const entries = await Promise.all(
    sensorTypes.map(async (sensorType) => [
      sensorType,
      await getSensorSeries(sensorType, 2000, undefined, { startAt }),
    ] as const),
  );

  return (
    <MonitorBoard
      initialSettings={sensorSettings}
      initialLabels={sensorLabels}
      initialRecords={Object.fromEntries(entries)}
    />
  );
}
