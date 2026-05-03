import { MonitorBoard } from "@/components/monitor-board";
import { getSensorSeries } from "@/lib/api";
import { type OndotoriMetricKey, ondotoriMetrics, ondotoriSource } from "@/lib/ondotori";
import type { SensorRecord } from "@/types/api";

function startAtForInitialLoad() {
  return new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
}

export default async function MonitorPage() {
  const startAt = startAtForInitialLoad();
  const entries = await Promise.all(
    ondotoriMetrics.map(async (metric) => [
      metric.key,
      await getSensorSeries(metric.key, 2000, ondotoriSource, { startAt }),
    ] as const),
  );

  return (
    <MonitorBoard
      initialRecords={Object.fromEntries(entries) as Record<OndotoriMetricKey, SensorRecord[]>}
    />
  );
}
