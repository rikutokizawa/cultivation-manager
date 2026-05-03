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
import { compareBackendTimestamps, formatJapanChartLabel, formatJapanDateTime } from "@/lib/datetime";
import {
  type DeviceLabels,
  type OndotoriMetricKey,
  deviceKeyFromRecord,
  formatDeviceLabelPrefix,
  ondotoriMetrics,
  ondotoriSource,
} from "@/lib/ondotori";
import type { SensorRecord } from "@/types/api";

type MetricKey = OndotoriMetricKey;
type PeriodKey = "1h" | "6h" | "24h" | "7d";
type ViewMode = "metric" | "device";

type OndotoriTrendExplorerProps = {
  deviceLabels: DeviceLabels;
  initialRecords: Record<MetricKey, SensorRecord[]>;
};

type Device = {
  key: string;
  name: string;
  context: string;
  location: string;
};

const refreshIntervalMs = 60_000;
const metrics = ondotoriMetrics.map((metric) => metric.key);
const metricConfig = Object.fromEntries(
  ondotoriMetrics.map((metric) => [metric.key, metric]),
) as Record<MetricKey, (typeof ondotoriMetrics)[number]>;
const periods: Record<PeriodKey, { label: string; hours: number }> = {
  "1h": { label: "1時間", hours: 1 },
  "6h": { label: "6時間", hours: 6 },
  "24h": { label: "24時間", hours: 24 },
  "7d": { label: "7日", hours: 24 * 7 },
};
const seriesColors = [
  "#c8def5",
  "#9fd8cb",
  "#f8c471",
  "#d7b7ff",
  "#f4a7a1",
  "#a7d8ff",
  "#d8f28a",
  "#f0b7d8",
];

function deviceNameFromLocation(location: string) {
  return location.split("/").map((part) => part.trim()).filter(Boolean).at(-1) ?? location;
}

function deviceContextFromLocation(location: string) {
  const parts = location.split("/").map((part) => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts.slice(0, -1).join(" / ") : location;
}

function startAtForPeriod(period: PeriodKey) {
  return new Date(Date.now() - periods[period].hours * 60 * 60 * 1000).toISOString();
}

async function fetchOndotoriRecords(period: PeriodKey) {
  const startAt = startAtForPeriod(period);
  const [temperature, humidity, co2] = await Promise.all([
    getSensorSeries("temperature", 2000, ondotoriSource, { startAt }),
    getSensorSeries("humidity", 2000, ondotoriSource, { startAt }),
    getSensorSeries("co2", 2000, ondotoriSource, { startAt }),
  ]);

  return { temperature, humidity, co2 };
}

export function OndotoriTrendExplorer({
  deviceLabels,
  initialRecords,
}: OndotoriTrendExplorerProps) {
  const [records, setRecords] = useState(initialRecords);
  const [period, setPeriod] = useState<PeriodKey>("24h");
  const [viewMode, setViewMode] = useState<ViewMode>("metric");
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("temperature");
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(["temperature", "humidity", "co2"]);
  const [selectedDeviceKeys, setSelectedDeviceKeys] = useState<string[]>([]);
  const [selectedDeviceKey, setSelectedDeviceKey] = useState<string>("");
  const [lastSyncedAt, setLastSyncedAt] = useState(() => new Date());
  const [syncError, setSyncError] = useState<string | null>(null);

  const devices = useMemo(() => {
    const deviceMap = new Map<string, Device>();

    for (const recordList of Object.values(records)) {
      for (const record of recordList) {
        const key = deviceKeyFromRecord(record);
        if (!deviceMap.has(key)) {
          deviceMap.set(key, {
            key,
            name: deviceNameFromLocation(record.location),
            context: deviceContextFromLocation(record.location),
            location: record.location,
          });
        }
      }
    }

    return Array.from(deviceMap.values()).sort((a, b) => a.name.localeCompare(b.name, "ja"));
  }, [records]);

  useEffect(() => {
    if (devices.length === 0) {
      return;
    }

    setSelectedDeviceKeys((current) => {
      const validKeys = new Set(devices.map((device) => device.key));
      const next = current.filter((key) => validKeys.has(key));
      const newKeys = devices.map((device) => device.key).filter((key) => !next.includes(key));
      return next.length === 0 ? devices.map((device) => device.key) : [...next, ...newKeys];
    });

    setSelectedDeviceKey((current) => current || devices[0].key);
  }, [devices]);

  useEffect(() => {
    let isMounted = true;

    async function refresh() {
      try {
        const nextRecords = await fetchOndotoriRecords(period);
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
        setSyncError(error instanceof Error ? error.message : "時系列データの取得に失敗しました");
      }
    }

    refresh();
    const intervalId = window.setInterval(refresh, refreshIntervalMs);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [period]);

  const selectedDeviceSet = useMemo(() => new Set(selectedDeviceKeys), [selectedDeviceKeys]);
  const selectedMetricSet = useMemo(() => new Set(selectedMetrics), [selectedMetrics]);

  const chartState = useMemo(() => {
    const rows = new Map<string, Record<string, string | number>>();
    const series =
      viewMode === "metric"
        ? devices
            .filter((device) => selectedDeviceSet.has(device.key))
            .map((device, index) => ({
              key: `device-${device.key}`,
              name: `${formatDeviceLabelPrefix(deviceLabels[device.key])}${device.name}`,
              color: seriesColors[index % seriesColors.length],
            }))
        : metrics
            .filter((metric) => selectedMetricSet.has(metric))
            .map((metric) => ({
              key: `metric-${metric}`,
              name: metricConfig[metric].label,
              color: metricConfig[metric].color,
            }));

    const sourceRecords =
      viewMode === "metric"
        ? records[selectedMetric].filter((record) => selectedDeviceSet.has(deviceKeyFromRecord(record)))
        : metrics
            .filter((metric) => selectedMetricSet.has(metric))
            .flatMap((metric) =>
              records[metric]
                .filter((record) => deviceKeyFromRecord(record) === selectedDeviceKey)
                .map((record) => ({ ...record, sensor_type: metric })),
            );

    for (const record of sourceRecords) {
      const row = rows.get(record.timestamp) ?? {
        timestamp: record.timestamp,
        label: formatJapanChartLabel(record.timestamp),
      };
      const seriesKey =
        viewMode === "metric"
          ? `device-${deviceKeyFromRecord(record)}`
          : `metric-${record.sensor_type}`;
      row[seriesKey] = Number(record.value.toFixed(2));
      rows.set(record.timestamp, row);
    }

    return {
      rows: Array.from(rows.values()).sort((a, b) =>
        compareBackendTimestamps(String(a.timestamp), String(b.timestamp)),
      ),
      series,
    };
  }, [
    deviceLabels,
    devices,
    records,
    selectedDeviceKey,
    selectedDeviceSet,
    selectedMetric,
    selectedMetricSet,
    viewMode,
  ]);

  const selectedDevice = useMemo(
    () => devices.find((device) => device.key === selectedDeviceKey),
    [devices, selectedDeviceKey],
  );

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="dashboard-section-title text-[22px]">おんどとり時系列</h2>
          <p className="mt-2 text-sm text-[#9cadbf]">
            機器、項目、期間を切り替えて、おんどとりの保存済みデータを確認します。
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-[#9cadbf]">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            最終同期 {formatJapanDateTime(lastSyncedAt.toISOString(), { seconds: true })}
          </span>
          {syncError ? (
            <span className="rounded-full border border-[#fa6138]/30 bg-[#fa6138]/10 px-3 py-1 text-[#ffb39f]">
              同期エラー
            </span>
          ) : null}
        </div>
      </div>

      <div className="dashboard-card rounded-[8px] p-4">
        <div className="grid gap-4 lg:grid-cols-[0.8fr_1fr_1fr]">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9cadbf]">表示</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "metric", label: "項目別" },
                { value: "device", label: "機器別" },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setViewMode(item.value as ViewMode)}
                  className={`rounded-[8px] border px-3 py-2 text-sm font-medium transition ${
                    viewMode === item.value
                      ? "border-white/30 bg-white/15 text-white"
                      : "border-white/10 bg-white/5 text-[#9cadbf] hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9cadbf]">期間</p>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(periods) as PeriodKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPeriod(key)}
                  className={`rounded-[8px] border px-3 py-2 text-sm font-medium transition ${
                    period === key
                      ? "border-white/30 bg-white/15 text-white"
                      : "border-white/10 bg-white/5 text-[#9cadbf] hover:bg-white/10"
                  }`}
                >
                  {periods[key].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9cadbf]">
              {viewMode === "metric" ? "項目" : "機器"}
            </p>
            {viewMode === "metric" ? (
              <select
                value={selectedMetric}
                onChange={(event) => setSelectedMetric(event.target.value as MetricKey)}
                className="w-full rounded-[8px] border border-white/10 bg-[#1f2123] px-3 py-2 text-sm text-white outline-none"
              >
                {metrics.map((metric) => (
                  <option key={metric} value={metric}>
                    {metricConfig[metric].label}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={selectedDeviceKey}
                onChange={(event) => setSelectedDeviceKey(event.target.value)}
                className="w-full rounded-[8px] border border-white/10 bg-[#1f2123] px-3 py-2 text-sm text-white outline-none"
              >
                {devices.map((device) => (
                  <option key={device.key} value={device.key}>
                    {formatDeviceLabelPrefix(deviceLabels[device.key])}
                    {device.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
        <div className="dashboard-card rounded-[8px] p-4">
          <div className="mb-4 border-b border-white/10 pb-3">
            <h3 className="text-base font-semibold text-white">表示機器</h3>
            <p className="mt-1 text-sm text-[#9cadbf]">
              項目別グラフに表示する機器を選びます。位置ラベルは機器別最新値で編集します。
            </p>
          </div>
          <div className="space-y-3">
            {devices.map((device) => (
              <label
                key={device.key}
                className="flex items-start gap-3 rounded-[8px] border border-white/10 bg-white/[0.03] p-3"
              >
                <input
                  type="checkbox"
                  checked={selectedDeviceSet.has(device.key)}
                  onChange={(event) => {
                    setSelectedDeviceKeys((current) =>
                      event.target.checked
                        ? Array.from(new Set([...current, device.key]))
                        : current.filter((key) => key !== device.key),
                    );
                  }}
                  className="mt-1 h-4 w-4"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white">
                    {formatDeviceLabelPrefix(deviceLabels[device.key])}
                    {device.name}
                  </span>
                  <span className="block text-xs text-[#9cadbf]">{device.context}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="dashboard-card rounded-[8px] p-4">
          <div className="mb-4 flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9cadbf]">
                {viewMode === "metric" ? "Metric Series" : "Device Series"}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-white">
                {viewMode === "metric"
                  ? `${metricConfig[selectedMetric].label} / 機器別`
                  : `${selectedDevice ? `${formatDeviceLabelPrefix(deviceLabels[selectedDevice.key])}${selectedDevice.name}` : "機器"} / 項目別`}
              </h3>
            </div>
            <p className="text-sm text-[#9cadbf]">{periods[period].label}</p>
          </div>

          {viewMode === "device" ? (
            <div className="mb-4 flex flex-wrap gap-2">
              {metrics.map((metric) => (
                <label
                  key={metric}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-[#d7e1eb]"
                >
                  <input
                    type="checkbox"
                    checked={selectedMetricSet.has(metric)}
                    onChange={(event) => {
                      setSelectedMetrics((current) =>
                        event.target.checked
                          ? Array.from(new Set([...current, metric]))
                          : current.filter((item) => item !== metric),
                      );
                    }}
                  />
                  {metricConfig[metric].label}
                </label>
              ))}
            </div>
          ) : null}

          <div className="h-[420px] w-full">
            <ResponsiveContainer>
              <LineChart data={chartState.rows} margin={{ left: 4, right: 22, top: 18, bottom: 4 }}>
                <CartesianGrid stroke="rgba(84, 99, 113, 0.22)" strokeDasharray="4 4" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#9cadbf", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fill: "#9cadbf", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  domain={["dataMin - 1", "dataMax + 1"]}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid rgba(84, 99, 113, 0.4)",
                    backgroundColor: "rgba(31, 33, 35, 0.98)",
                    color: "#ffffff",
                  }}
                />
                {chartState.series.map((series) => (
                  <Line
                    key={series.key}
                    type="monotone"
                    dataKey={series.key}
                    name={series.name}
                    stroke={series.color}
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls
                    activeDot={{ r: 5, fill: series.color }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {chartState.series.map((series) => (
              <span key={series.key} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-[#9cadbf]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: series.color }} />
                {series.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
