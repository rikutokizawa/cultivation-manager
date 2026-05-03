"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getSensorSeries } from "@/lib/api";
import { compareBackendTimestamps, formatJapanDateTime } from "@/lib/datetime";
import {
  type DeviceLabels,
  type OndotoriMetricKey,
  deviceKeyFromRecord,
  formatMetricValue,
  latestRecord,
  normalizeStoredLabels,
  ondotoriLabelStorageKey,
  ondotoriMetrics,
  ondotoriSource,
} from "@/lib/ondotori";
import type { SensorRecord } from "@/types/api";

type MonitorBoardProps = {
  initialRecords: Record<OndotoriMetricKey, SensorRecord[]>;
};

type LabeledArea = {
  label: string;
  deviceKeys: string[];
};

type ChartPeriodKey = "1h" | "6h" | "24h" | "7d";

const refreshIntervalMs = 60_000;
const chartPeriods: Record<ChartPeriodKey, { label: string; hours: number; limit: number }> = {
  "1h": { label: "1h", hours: 1, limit: 800 },
  "6h": { label: "6h", hours: 6, limit: 2000 },
  "24h": { label: "24h", hours: 24, limit: 2000 },
  "7d": { label: "7d", hours: 24 * 7, limit: 2000 },
};
const metricConfig = Object.fromEntries(
  ondotoriMetrics.map((metric) => [metric.key, metric]),
) as Record<OndotoriMetricKey, (typeof ondotoriMetrics)[number]>;

function startAtForChart(period: ChartPeriodKey) {
  return new Date(Date.now() - chartPeriods[period].hours * 60 * 60 * 1000).toISOString();
}

async function fetchMonitorRecords(period: ChartPeriodKey) {
  const startAt = startAtForChart(period);
  const entries = await Promise.all(
    ondotoriMetrics.map(async (metric) => [
      metric.key,
      await getSensorSeries(metric.key, chartPeriods[period].limit, ondotoriSource, { startAt }),
    ] as const),
  );

  return Object.fromEntries(entries) as Record<OndotoriMetricKey, SensorRecord[]>;
}

function buildAreas(deviceLabels: DeviceLabels) {
  const areaMap = new Map<string, string[]>();

  for (const [deviceKey, labels] of Object.entries(deviceLabels)) {
    for (const label of labels) {
      areaMap.set(label, [...(areaMap.get(label) ?? []), deviceKey]);
    }
  }

  return Array.from(areaMap.entries()).map(([label, deviceKeys]) => ({ label, deviceKeys }));
}

function averageLatest(records: SensorRecord[], deviceKeys: string[]) {
  const selected = new Set(deviceKeys);
  const latestByDevice = new Map<string, SensorRecord>();

  for (const record of records) {
    const key = deviceKeyFromRecord(record);
    if (!selected.has(key)) {
      continue;
    }
    const current = latestByDevice.get(key);
    if (
      !current ||
      compareBackendTimestamps(record.timestamp, current.timestamp) > 0 ||
      (record.timestamp === current.timestamp && record.id > current.id)
    ) {
      latestByDevice.set(key, record);
    }
  }

  const values = Array.from(latestByDevice.values());
  const latest = latestRecord(values);
  const average =
    values.length > 0 ? values.reduce((sum, record) => sum + record.value, 0) / values.length : undefined;

  return {
    average,
    count: values.length,
    unit: values[0]?.unit,
    latestTimestamp: latest?.timestamp,
  };
}

function parseBackendTimeMs(timestamp: string) {
  return new Date(timestamp.endsWith("Z") ? timestamp : `${timestamp}Z`).getTime();
}

function formatTimeTick(timestampMs: number) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestampMs));
}

function seriesKeyForArea(area: LabeledArea) {
  return `area:${area.label}`;
}

function buildChartData(
  records: SensorRecord[],
  areas: LabeledArea[],
  metric: OndotoriMetricKey,
) {
  const areaDeviceSets = areas.map((area) => ({
    area,
    deviceKeys: new Set(area.deviceKeys),
    seriesKey: seriesKeyForArea(area),
  }));
  const buckets = new Map<number, Record<string, number[]>>();

  for (const record of records) {
    const deviceKey = deviceKeyFromRecord(record);
    const timestampMs = parseBackendTimeMs(record.timestamp);

    for (const area of areaDeviceSets) {
      if (!area.deviceKeys.has(deviceKey)) {
        continue;
      }

      const row = buckets.get(timestampMs) ?? {};
      row[area.seriesKey] = [...(row[area.seriesKey] ?? []), record.value];
      buckets.set(timestampMs, row);
    }
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([timestampMs, areaValues]) => {
      const row: Record<string, number | string> = {
        timestampMs,
        label: formatTimeTick(timestampMs),
      };

      for (const [seriesKey, values] of Object.entries(areaValues)) {
        row[seriesKey] = Number(
          (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(
            metricConfig[metric].digits,
          ),
        );
      }

      return row;
    });
}

export function MonitorBoard({ initialRecords }: MonitorBoardProps) {
  const [records, setRecords] = useState(initialRecords);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriodKey>("6h");
  const [deviceLabels, setDeviceLabels] = useState<DeviceLabels>({});
  const [lastSyncedAt, setLastSyncedAt] = useState(() => new Date());
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    const storedLabels = window.localStorage.getItem(ondotoriLabelStorageKey);
    if (!storedLabels) {
      return;
    }

    try {
      setDeviceLabels(normalizeStoredLabels(JSON.parse(storedLabels)));
    } catch {
      setDeviceLabels({});
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function refresh() {
      try {
        const nextRecords = await fetchMonitorRecords(chartPeriod);
        if (!isMounted) {
          return;
        }
        setRecords(nextRecords);
        setLastSyncedAt(new Date());
        setSyncError(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setSyncError(error instanceof Error ? error.message : "同期に失敗しました");
      }
    }

    refresh();
    const intervalId = window.setInterval(refresh, refreshIntervalMs);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [chartPeriod]);

  const areas = useMemo(() => buildAreas(deviceLabels), [deviceLabels]);
  const displayAreas = areas.length > 0 ? areas.slice(0, 4) : [{ label: "未設定", deviceKeys: [] }];
  const hiddenAreaCount = Math.max(areas.length - displayAreas.length, 0);

  return (
    <div className="flex h-[calc(100vh-7.5rem)] min-h-[620px] flex-col gap-3 overflow-hidden">
      <section className="flex shrink-0 items-end justify-between gap-4">
        <div>
          <h1 className="dashboard-section-title text-[24px]">常時モニター</h1>
          <p className="mt-1 text-sm text-[#9cadbf]">
            ラベル別平均値と直近{chartPeriods[chartPeriod].label}の推移
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2 text-xs text-[#9cadbf]">
          <div className="flex rounded-full border border-white/10 bg-white/5 p-0.5">
            {(Object.keys(chartPeriods) as ChartPeriodKey[]).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setChartPeriod(period)}
                className={`rounded-full px-3 py-1 font-medium transition ${
                  chartPeriod === period ? "bg-white/15 text-white" : "text-[#9cadbf] hover:text-white"
                }`}
              >
                {chartPeriods[period].label}
              </button>
            ))}
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            最終同期 {formatJapanDateTime(lastSyncedAt.toISOString(), { seconds: true })}
          </span>
          {syncError ? (
            <span className="rounded-full border border-[#fa6138]/30 bg-[#fa6138]/10 px-3 py-1 text-[#ffb39f]">
              同期エラー
            </span>
          ) : null}
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">更新間隔 60秒</span>
        </div>
      </section>

      <section className="grid min-h-0 flex-1 gap-3" style={{ gridTemplateRows: `repeat(${ondotoriMetrics.length}, minmax(0, 1fr))` }}>
        {ondotoriMetrics.map((metric) => (
          <div key={metric.key} className="grid min-h-0 gap-3 xl:grid-cols-[0.68fr_1.32fr]">
            <div className="dashboard-card grid min-h-0 grid-cols-2 gap-2 overflow-hidden rounded-[8px] p-3">
              <div className="col-span-2 flex h-8 items-center justify-between border-b border-white/10 pb-2">
                <h2 className="dashboard-section-title text-[18px]">{metric.label}</h2>
                <div className="flex items-center gap-2 text-xs text-[#9cadbf]">
                  {hiddenAreaCount > 0 ? <span>+{hiddenAreaCount} labels</span> : null}
                  <span>{metric.unit}</span>
                </div>
              </div>
              {displayAreas.map((area) => {
                const average = averageLatest(records[metric.key], area.deviceKeys);

                return (
                  <article key={area.label} className="min-h-0 rounded-[8px] border border-white/10 bg-white/[0.03] p-2.5">
                    <p className="truncate text-xs font-semibold text-[#9cadbf]">{area.label}</p>
                    <p className="mt-1 text-[24px] font-semibold leading-none text-white">
                      {formatMetricValue(average.average, average.unit ?? metric.unit, metric.digits)}
                    </p>
                    <p className="mt-1 truncate text-[10px] text-[#9cadbf]">
                      n={average.count} / {formatJapanDateTime(average.latestTimestamp, { seconds: true })}
                    </p>
                  </article>
                );
              })}
            </div>

            <div className="dashboard-card min-h-0 overflow-hidden rounded-[8px] p-2">
              <div className="h-full min-h-[120px]">
                <ResponsiveContainer>
                  <LineChart
                    data={buildChartData(records[metric.key], displayAreas, metric.key)}
                    margin={{ left: 0, right: 16, top: 10, bottom: 0 }}
                  >
                    <CartesianGrid stroke="rgba(84, 99, 113, 0.18)" strokeDasharray="4 4" />
                    <XAxis
                      dataKey="timestampMs"
                      tick={{ fill: "#9cadbf", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={28}
                      type="number"
                      scale="time"
                      domain={["dataMin", "dataMax"]}
                      tickFormatter={(value) => formatTimeTick(Number(value))}
                    />
                    <YAxis
                      tick={{ fill: "#9cadbf", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      domain={["dataMin - 1", "dataMax + 1"]}
                      unit={metric.unit}
                    />
                    <Tooltip
                      labelFormatter={(value) => `${formatTimeTick(Number(value))} JST`}
                      formatter={(value, name) => [
                        `${Number(value).toFixed(metric.digits)} ${metric.unit}`,
                        name,
                      ]}
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid rgba(84, 99, 113, 0.4)",
                        backgroundColor: "rgba(31, 33, 35, 0.98)",
                        color: "#ffffff",
                      }}
                    />
                    {displayAreas.map((area, index) => (
                      <Line
                        key={`${metric.key}-${area.label}`}
                        type="linear"
                        dataKey={seriesKeyForArea(area)}
                        name={area.label}
                        stroke={["#c8def5", "#f8c471", "#9fd8cb", "#d7b7ff", "#f4a7a1"][index % 5]}
                        strokeWidth={2.4}
                        dot={false}
                        connectNulls
                        activeDot={{ r: 4 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
