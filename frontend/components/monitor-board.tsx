"use client";

import Link from "next/link";
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

import { getSensorChartSettings, getSensorLabels, getSensorSeries, getSensorSettings } from "@/lib/api";
import { compareBackendTimestamps, formatJapanDateTime } from "@/lib/datetime";
import {
  alertBorderClass,
  alertLevelForLabels,
  alertTextClass,
  formatMetricValue,
  labelsForSetting,
  metricConfigsForSettings,
  sensorDisplayName,
  sensorKeyFromRecord,
  sensorTypesForSettings,
  visibleSensorSettings,
  type SensorMetricConfig,
} from "@/lib/sensors";
import type { SensorChartSetting, SensorLabel, SensorRecord, SensorSetting } from "@/types/api";

type MonitorBoardProps = {
  initialSettings: SensorSetting[];
  initialLabels: SensorLabel[];
  initialChartSettings: SensorChartSetting[];
  initialRecords: Record<string, SensorRecord[]>;
};

type LabeledArea = {
  label: string;
  sensorKeys: string[];
};

type ChartPeriodKey = "1h" | "6h" | "24h" | "7d";
type MonitorMode = "mode1" | "mode2";

const refreshIntervalMs = 60_000;
const chartPeriods: Record<ChartPeriodKey, { label: string; hours: number; limit: number }> = {
  "1h": { label: "1h", hours: 1, limit: 800 },
  "6h": { label: "6h", hours: 6, limit: 2000 },
  "24h": { label: "24h", hours: 24, limit: 2000 },
  "7d": { label: "7d", hours: 24 * 7, limit: 2000 },
};

function startAtForChart(period: ChartPeriodKey) {
  return new Date(Date.now() - chartPeriods[period].hours * 60 * 60 * 1000).toISOString();
}

async function fetchMonitorData(period: ChartPeriodKey) {
  const [sensorSettings, sensorLabels, chartSettings] = await Promise.all([
    getSensorSettings(),
    getSensorLabels(),
    getSensorChartSettings(),
  ]);
  const startAt = startAtForChart(period);
  const entries = await Promise.all(
    sensorTypesForSettings(sensorSettings).map(async (sensorType) => [
      sensorType,
      await getSensorSeries(sensorType, chartPeriods[period].limit, undefined, {
        startAt,
        perSensorLimit: true,
      }),
    ] as const),
  );

  return {
    sensorSettings,
    sensorLabels,
    chartSettings,
    records: Object.fromEntries(entries) as Record<string, SensorRecord[]>,
  };
}

function buildAreas(settings: SensorSetting[]) {
  const visibleSettings = visibleSensorSettings(settings);
  const areaMap = new Map<string, string[]>();

  for (const setting of visibleSettings) {
    for (const label of setting.labels) {
      areaMap.set(label, [...(areaMap.get(label) ?? []), setting.sensor_key]);
    }
  }

  const labeledAreas = Array.from(areaMap.entries()).map(([label, sensorKeys]) => ({
    label,
    sensorKeys,
  }));

  if (labeledAreas.length > 0) {
    return labeledAreas;
  }

  return visibleSettings.slice(0, 4).map((setting) => ({
    label: sensorDisplayName(setting),
    sensorKeys: [setting.sensor_key],
  }));
}

function averageLatestFromSettings(
  settings: SensorSetting[],
  sensorKeys: string[],
  sensorType: string,
) {
  const selected = new Set(sensorKeys);
  const values = settings.filter(
    (setting) =>
      selected.has(setting.sensor_key) &&
      setting.sensor_type === sensorType &&
      setting.latest_value !== null,
  );
  const average =
    values.length > 0
      ? values.reduce((sum, setting) => sum + Number(setting.latest_value), 0) / values.length
      : undefined;
  const latestTimestamp = values
    .map((setting) => setting.latest_timestamp)
    .filter((timestamp): timestamp is string => Boolean(timestamp))
    .sort(compareBackendTimestamps)
    .at(-1);

  return {
    average,
    count: values.length,
    unit: values[0]?.latest_unit ?? values[0]?.unit,
    latestTimestamp,
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
  metric: SensorMetricConfig,
) {
  const areaSensorSets = areas.map((area) => ({
    area,
    sensorKeys: new Set(area.sensorKeys),
    seriesKey: seriesKeyForArea(area),
  }));
  const buckets = new Map<number, Record<string, number[]>>();

  for (const record of records) {
    const sensorKey = sensorKeyFromRecord(record);
    const timestampMs = parseBackendTimeMs(record.timestamp);

    for (const area of areaSensorSets) {
      if (!area.sensorKeys.has(sensorKey)) {
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
            metric.digits,
          ),
        );
      }

      return row;
    });
}

function chartDomainForSetting(chartSetting: SensorChartSetting | undefined) {
  return [
    chartSetting?.y_axis_min ?? "dataMin - 1",
    chartSetting?.y_axis_max ?? "dataMax + 1",
  ] as [number | string, number | string];
}

function buildLabelAverages(
  settings: SensorSetting[],
  sensorLabels: SensorLabel[],
  metricConfigs: SensorMetricConfig[],
) {
  const groupedSettings = new Map<string, SensorSetting[]>();
  const metricsByType = new Map(metricConfigs.map((metric) => [metric.key, metric]));

  for (const setting of settings) {
    for (const label of labelsForSetting(setting)) {
      groupedSettings.set(label, [...(groupedSettings.get(label) ?? []), setting]);
    }
  }

  return Array.from(groupedSettings.entries()).map(([label, labelSettings]) => {
    const sensorTypes = metricConfigs.map((metric) => metric.key);
    const metrics = sensorTypes.map((sensorType) => {
      const average = averageLatestFromSettings(
        settings,
        labelSettings.map((setting) => setting.sensor_key),
        sensorType,
      );
      const metric = metricsByType.get(sensorType);
      const level = alertLevelForLabels(
        sensorLabels,
        [label],
        sensorType,
        average.average,
      );

      return {
        sensorType,
        label: metric?.label ?? sensorType,
        level,
        average: average.average,
        unit: average.unit ?? metric?.unit,
        digits: metric?.digits,
        count: average.count,
        latestTimestamp: average.latestTimestamp,
      };
    });

    return { label, settings: labelSettings, metrics };
  });
}

export function MonitorBoard({
  initialSettings,
  initialLabels,
  initialChartSettings,
  initialRecords,
}: MonitorBoardProps) {
  const [sensorSettings, setSensorSettings] = useState(initialSettings);
  const [sensorLabels, setSensorLabels] = useState(initialLabels);
  const [chartSettings, setChartSettings] = useState(initialChartSettings);
  const [records, setRecords] = useState(initialRecords);
  const [monitorMode, setMonitorMode] = useState<MonitorMode>("mode1");
  const [chartPeriod, setChartPeriod] = useState<ChartPeriodKey>("6h");
  const [lastSyncedAt, setLastSyncedAt] = useState(() => new Date());
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function refresh() {
      try {
        const nextData = await fetchMonitorData(chartPeriod);
        if (!isMounted) {
          return;
        }
        setSensorSettings(nextData.sensorSettings);
        setSensorLabels(nextData.sensorLabels);
        setChartSettings(nextData.chartSettings);
        setRecords(nextData.records);
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

  const visibleSettings = useMemo(() => visibleSensorSettings(sensorSettings), [sensorSettings]);
  const metricConfigs = useMemo(
    () => metricConfigsForSettings(visibleSettings.length > 0 ? visibleSettings : sensorSettings),
    [sensorSettings, visibleSettings],
  );
  const areas = useMemo(() => buildAreas(sensorSettings), [sensorSettings]);
  const chartSettingsByType = useMemo(
    () => new Map(chartSettings.map((setting) => [setting.sensor_type, setting])),
    [chartSettings],
  );
  const displayAreas = areas.length > 0 ? areas.slice(0, 4) : [];
  const hiddenAreaCount = Math.max(areas.length - displayAreas.length, 0);
  const labelAverages = useMemo(
    () => buildLabelAverages(visibleSettings, sensorLabels, metricConfigs),
    [metricConfigs, sensorLabels, visibleSettings],
  );

  return (
    <div className="flex h-[calc(100vh-7.5rem)] min-h-[620px] flex-col gap-3 overflow-hidden">
      <section className="flex shrink-0 items-end justify-between gap-4">
        <div>
          <h1 className="dashboard-section-title text-[24px]">常時モニター</h1>
          <p className="mt-1 text-sm text-[#9cadbf]">
            {monitorMode === "mode1"
              ? `ラベル別平均値と直近${chartPeriods[chartPeriod].label}の推移`
              : "ラベル別 最新平均"}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2 text-xs text-[#9cadbf]">
          <div className="flex rounded-full border border-white/10 bg-white/5 p-0.5">
            {(["mode1", "mode2"] as MonitorMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setMonitorMode(mode)}
                className={`rounded-full px-3 py-1 font-medium transition ${
                  monitorMode === mode ? "bg-white/15 text-white" : "text-[#9cadbf] hover:text-white"
                }`}
              >
                {mode === "mode1" ? "モニター1" : "モニター2"}
              </button>
            ))}
          </div>
          {monitorMode === "mode1" ? (
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
          ) : null}
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            最終同期 {formatJapanDateTime(lastSyncedAt.toISOString(), { seconds: true })}
          </span>
          {syncError ? (
            <span className="rounded-full border border-[#fa6138]/30 bg-[#fa6138]/10 px-3 py-1 text-[#ffb39f]">
              同期エラー
            </span>
          ) : null}
          <Link href="/settings" className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white">
            設定
          </Link>
        </div>
      </section>

      {visibleSettings.length === 0 ? (
        <section className="dashboard-card rounded-[8px] p-5 text-sm text-[#9cadbf]">
          表示対象のセンサーがありません。
        </section>
      ) : (
        <>
          {monitorMode === "mode1" ? (
            <section
              className="grid min-h-0 flex-1 gap-3"
              style={{ gridTemplateRows: `repeat(${metricConfigs.length}, minmax(0, 1fr))` }}
            >
              {metricConfigs.map((metric) => {
            const metricRecords = (records[metric.key] ?? []).filter((record) =>
              visibleSettings.some((setting) => setting.sensor_key === sensorKeyFromRecord(record)),
            );
            const unit = metric.unit || metricRecords[0]?.unit || "";
            const chartData = buildChartData(metricRecords, displayAreas, metric);
            const yAxisDomain = chartDomainForSetting(chartSettingsByType.get(metric.key));

            return (
              <div key={metric.key} className="grid min-h-0 gap-3 xl:grid-cols-[0.68fr_1.32fr]">
                <div className="dashboard-card grid min-h-0 grid-cols-2 grid-rows-[auto_repeat(2,minmax(0,1fr))] gap-2 overflow-hidden rounded-[8px] p-3">
                  <div className="col-span-2 flex min-w-0 items-center justify-between border-b border-white/10 pb-2">
                    <h2 className="dashboard-section-title min-w-0 truncate text-[18px]">{metric.label}</h2>
                    <div className="flex shrink-0 items-center gap-2 text-xs text-[#9cadbf]">
                      {hiddenAreaCount > 0 ? <span>+{hiddenAreaCount} labels</span> : null}
                      <span>{unit}</span>
                    </div>
                  </div>
                  {displayAreas.map((area) => {
                    const average = averageLatestFromSettings(
                      visibleSettings,
                      area.sensorKeys,
                      metric.key,
                    );
                    const level = alertLevelForLabels(
                      sensorLabels,
                      [area.label],
                      metric.key,
                      average.average,
                    );

                    return (
                      <article
                        key={area.label}
                        className={`flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[8px] border px-2.5 py-2 ${alertBorderClass(level)}`}
                      >
                        <p className="truncate text-xs font-semibold text-[#9cadbf]">{area.label}</p>
                        <p
                          className={`mt-1 min-w-0 truncate font-semibold leading-none ${alertTextClass(level)}`}
                          style={{ fontSize: "clamp(1rem, 1.45vw, 1.5rem)" }}
                        >
                          {formatMetricValue(average.average, average.unit ?? unit, metric.digits)}
                        </p>
                        <p className="mt-auto min-w-0 truncate pt-1 text-[10px] leading-tight text-[#9cadbf]">
                          n={average.count} / {formatJapanDateTime(average.latestTimestamp, { seconds: true })}
                        </p>
                      </article>
                    );
                  })}
                </div>

                <div className="dashboard-card min-h-0 overflow-hidden rounded-[8px] p-2">
                  <div className="relative h-full min-h-[120px]">
                    {chartData.length === 0 ? (
                      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-sm text-[#9cadbf]">
                        この期間のデータはありません
                      </div>
                    ) : null}
                    <ResponsiveContainer>
                      <LineChart
                        data={chartData}
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
                          domain={yAxisDomain}
                          unit={unit}
                        />
                        <Tooltip
                          labelFormatter={(value) => `${formatTimeTick(Number(value))} JST`}
                          formatter={(value, name) => [
                            `${Number(value).toFixed(metric.digits)} ${unit}`,
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
            );
              })}
            </section>
          ) : (
            <section className="min-h-0 flex-1 overflow-y-auto">
              {labelAverages.length > 0 ? (
                <div className="grid gap-3 lg:grid-cols-3">
                  {labelAverages.map((area) => (
                    <article key={area.label} className="dashboard-card rounded-[8px] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-semibold text-white">{area.label}</h3>
                            <p className="mt-1 line-clamp-2 text-xs text-[#9cadbf]">
                              {area.settings.map(sensorDisplayName).join(" / ")}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-[#9cadbf]">
                            {area.settings.length}センサー
                          </span>
                        </div>
                        <div className="mt-3 grid gap-2">
                          {area.metrics.map((metric) => (
                            <div key={metric.sensorType} className="flex items-start justify-between gap-3 text-sm">
                              <span className="text-[#9cadbf]">{metric.label}</span>
                              <span className={`text-right font-semibold ${alertTextClass(metric.level)}`}>
                                {formatMetricValue(metric.average, metric.unit, metric.digits)}
                                <span className="ml-2 text-xs font-normal text-[#9cadbf]">n={metric.count}</span>
                                <span className="block text-[11px] font-normal text-[#9cadbf]">
                                  {formatJapanDateTime(metric.latestTimestamp, { seconds: true })}
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </article>
                  ))}
                </div>
              ) : (
                <div className="dashboard-card rounded-[8px] p-5 text-sm text-[#9cadbf]">
                  ラベルが設定された表示中センサーはまだありません。
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
