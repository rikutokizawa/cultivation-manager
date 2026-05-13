"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { LatestImages } from "@/components/latest-images";
import { SectionCard } from "@/components/section-card";
import { SensorLineChart } from "@/components/sensor-line-chart";
import { StatusCard } from "@/components/status-card";
import {
  getLatestStatus,
  getSensorChartSettings,
  getSensorLabels,
  getSensorSeries,
  getSensorSettings,
} from "@/lib/api";
import { compareBackendTimestamps, formatJapanDateTime } from "@/lib/datetime";
import {
  type AlertLevel,
  alertBorderClass,
  alertLevelForLabels,
  alertTextClass,
  compareLabelNames,
  compareSensorSettings,
  formatLabelPrefix,
  formatMetricValue,
  labelsForSetting,
  latestRecordsBySensor,
  metricConfigForType,
  metricConfigsForSettings,
  sensorDisplayName,
  sensorKeyFromRecord,
  sensorTypesForSettings,
  visibleSensorSettings,
} from "@/lib/sensors";
import type { LatestStatus, SensorChartSetting, SensorLabel, SensorRecord, SensorSetting } from "@/types/api";

type DashboardData = {
  latestStatus: LatestStatus;
  sensorSettings: SensorSetting[];
  sensorLabels: SensorLabel[];
  sensorChartSettings: SensorChartSetting[];
  recordsByType: Record<string, SensorRecord[]>;
};

type DashboardRealtimeProps = {
  initialData: DashboardData;
};

type LabelMetric = {
  sensorType: string;
  label: string;
  level: AlertLevel;
  average: number | undefined;
  unit: string | undefined;
  count: number;
  latestTimestamp: string | undefined;
};

const refreshIntervalMs = 60_000;
const accentCycle = ["green", "blue", "amber", "slate"] as const;

async function fetchDashboardData(): Promise<DashboardData> {
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

  return {
    latestStatus,
    sensorSettings,
    sensorLabels,
    sensorChartSettings,
    recordsByType: Object.fromEntries(recordEntries),
  };
}

function latestTimestamp(timestamps: Array<string | undefined | null>) {
  return timestamps
    .filter((timestamp): timestamp is string => Boolean(timestamp))
    .sort(compareBackendTimestamps)
    .at(-1);
}

function readingForSetting(
  setting: SensorSetting,
  latestBySensor: Map<string, SensorRecord>,
) {
  const record = latestBySensor.get(setting.sensor_key);

  return {
    value: record?.value ?? setting.latest_value,
    unit: record?.unit ?? setting.latest_unit ?? setting.unit,
    timestamp: record?.timestamp ?? setting.latest_timestamp,
  };
}

function buildSeriesNameByKey(settings: SensorSetting[]) {
  return Object.fromEntries(
    settings.map((setting) => [
      setting.sensor_key,
      `${formatLabelPrefix(setting.labels)}${sensorDisplayName(setting)}`,
    ]),
  );
}

export function DashboardRealtime({ initialData }: DashboardRealtimeProps) {
  const [data, setData] = useState(initialData);
  const [lastSyncedAt, setLastSyncedAt] = useState(() => new Date());
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function refresh() {
      try {
        const nextData = await fetchDashboardData();
        if (!isMounted) {
          return;
        }
        setData(nextData);
        setLastSyncedAt(new Date());
        setSyncError(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setSyncError(error instanceof Error ? error.message : "同期に失敗しました");
      }
    }

    const intervalId = window.setInterval(refresh, refreshIntervalMs);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const visibleSettings = useMemo(
    () => visibleSensorSettings(data.sensorSettings),
    [data.sensorSettings],
  );
  const visibleSensorKeys = useMemo(
    () => new Set(visibleSettings.map((setting) => setting.sensor_key)),
    [visibleSettings],
  );
  const latestBySensor = useMemo(
    () => latestRecordsBySensor(data.recordsByType),
    [data.recordsByType],
  );
  const metricConfigs = useMemo(
    () =>
      visibleSettings.length > 0
        ? metricConfigsForSettings(visibleSettings, data.sensorChartSettings)
        : [],
    [data.sensorChartSettings, visibleSettings],
  );
  const seriesNameByKey = useMemo(() => buildSeriesNameByKey(data.sensorSettings), [data.sensorSettings]);

  const summarySettings = useMemo(
    () => [...visibleSettings].sort(compareSensorSettings).slice(0, 6),
    [visibleSettings],
  );

  const labelAverages = useMemo(() => {
    const groupedSettings = new Map<string, SensorSetting[]>();

    for (const setting of visibleSettings) {
      for (const label of labelsForSetting(setting)) {
        groupedSettings.set(label, [...(groupedSettings.get(label) ?? []), setting]);
      }
    }

    const sensorTypes = Array.from(new Set(visibleSettings.map((setting) => setting.sensor_type)));

    return Array.from(groupedSettings.entries())
      .sort(([a], [b]) => compareLabelNames(a, b, data.sensorLabels))
      .map(([label, settings]) => {
        const metrics: LabelMetric[] = sensorTypes.map((sensorType) => {
          const readings = settings
            .filter((setting) => setting.sensor_type === sensorType)
            .map((setting) => readingForSetting(setting, latestBySensor))
            .filter((reading) => reading.value !== null && reading.value !== undefined);
          const average =
            readings.length > 0
              ? readings.reduce((sum, reading) => sum + Number(reading.value), 0) / readings.length
              : undefined;
          const metric = metricConfigForType(sensorType, visibleSettings);
          const level = alertLevelForLabels(
            data.sensorLabels,
            [label],
            sensorType,
            average,
          );

          return {
            sensorType,
            label: metric.label,
            level,
            average,
            unit: readings[0]?.unit ?? metric.unit,
            count: readings.length,
            latestTimestamp: latestTimestamp(readings.map((reading) => reading.timestamp)),
          };
        });

        return { label, settings, metrics };
      });
  }, [data.sensorLabels, latestBySensor, visibleSettings]);

  const recordsByVisibleType = useMemo(() => {
    const entries = Object.entries(data.recordsByType).map(([sensorType, records]) => [
      sensorType,
      records.filter((record) => {
        return visibleSensorKeys.has(sensorKeyFromRecord(record));
      }),
    ] as const);

    return Object.fromEntries(entries);
  }, [data.recordsByType, visibleSensorKeys]);

  return (
    <div className="space-y-8">
      <section className="dashboard-first-view space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="dashboard-section-title text-[24px] sm:text-[28px]">
            栽培環境モニタリング
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#9cadbf]">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              最終同期 {formatJapanDateTime(lastSyncedAt.toISOString(), { seconds: true })}
            </span>
            {syncError ? (
              <span className="rounded-full border border-[#fa6138]/30 bg-[#fa6138]/10 px-3 py-1 text-[#ffb39f]">
                同期エラー
              </span>
            ) : null}
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              表示 {visibleSettings.length} センサー
            </span>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7">
            {summarySettings.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {summarySettings.map((setting, index) => {
                  const reading = readingForSetting(setting, latestBySensor);
                  const metric = metricConfigForType(setting.sensor_type, data.sensorSettings, index);

                  return (
                    <StatusCard
                      key={setting.sensor_key}
                      label={sensorDisplayName(setting)}
                      value={formatMetricValue(reading.value, reading.unit, metric.digits)}
                      meta={`${metric.label} / ${formatJapanDateTime(reading.timestamp ?? undefined, { seconds: true })}`}
                      accent={accentCycle[index % accentCycle.length]}
                      compact
                    />
                  );
                })}
              </div>
            ) : (
              <div className="dashboard-card rounded-[8px] p-5 text-sm text-[#9cadbf]">
                表示対象のセンサーがありません。
              </div>
            )}
          </div>

          <div className="space-y-4 lg:col-span-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <h2 className="dashboard-section-title mb-3 text-[20px]">カメラ1</h2>
                <LatestImages images={data.latestStatus.latest_images.slice(0, 1)} compact />
              </div>
              <div>
                <h2 className="dashboard-section-title mb-3 text-[20px]">カメラ2</h2>
                <LatestImages images={data.latestStatus.latest_images.slice(1, 2)} compact />
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-card rounded-[8px] p-4">
          <div className="mb-4 flex flex-col gap-2 border-b border-white/10 pb-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="dashboard-section-title text-[20px]">ラベル別 最新平均</h2>
              <p className="mt-1 text-sm text-[#9cadbf]">
                設定済みラベルごとに、表示中センサーの最新値を項目別にまとめます。
              </p>
            </div>
            <Link href="/settings" className="text-sm font-medium text-white underline-offset-4 hover:underline">
              設定を開く
            </Link>
          </div>

          {labelAverages.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-3">
              {labelAverages.map((area) => (
                <article key={area.label} className="rounded-[8px] border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-white">{area.label}</h3>
                      <p className="mt-1 text-xs text-[#9cadbf]">
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
                          {formatMetricValue(metric.average, metric.unit)}
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
            <p className="text-sm text-[#9cadbf]">
              ラベルが設定された表示中センサーはまだありません。
            </p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="dashboard-section-title text-[22px]">センサー別 最新値</h2>
            <p className="mt-2 text-sm text-[#9cadbf]">
              データ取得元に関係なく、設定済みの表示名とラベルで並べます。
            </p>
          </div>
          <Link href="/monitor" className="text-sm font-medium text-white underline-offset-4 hover:underline">
            モニターを開く
          </Link>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {visibleSettings.map((setting) => {
            const reading = readingForSetting(setting, latestBySensor);
            const metric = metricConfigForType(setting.sensor_type, data.sensorSettings);

            const level = alertLevelForLabels(
              data.sensorLabels,
              setting.labels,
              setting.sensor_type,
              reading.value,
            );

            return (
              <article key={setting.sensor_key} className={`dashboard-card rounded-[8px] p-4 ${alertBorderClass(level)}`}>
                <div className="border-b border-white/10 pb-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9cadbf]">
                    {metric.label}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{sensorDisplayName(setting)}</h3>
                  <p className="mt-1 text-sm text-[#9cadbf]">{setting.location}</p>
                  {setting.labels.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {setting.labels.map((label) => (
                        <span
                          key={label}
                          className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-[#d7e1eb]"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 rounded-[8px] border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-[#9cadbf]">Latest</p>
                      <p className={`mt-1 text-lg font-semibold ${alertTextClass(level)}`}>
                        {formatMetricValue(reading.value, reading.unit, metric.digits)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-[#9cadbf]">
                      {formatJapanDateTime(reading.timestamp ?? undefined, { seconds: true })}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[#9cadbf]">
                    {setting.source} / {setting.sensor_id}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="timeseries" className="space-y-8">
        <div>
          <h2 className="dashboard-section-title text-[22px]">時系列</h2>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {metricConfigs.map((metric) => {
            const records = recordsByVisibleType[metric.key] ?? [];
            const unit =
              metric.unit ||
              records[0]?.unit ||
              visibleSettings.find((setting) => setting.sensor_type === metric.key)?.unit ||
              "";

            if (records.length === 0) {
              return null;
            }

            return (
              <SectionCard
                key={metric.key}
                eyebrow={metric.key}
                title={metric.label}
                description="表示中センサーの保存済みデータを表示します。"
              >
                <SensorLineChart
                  records={records}
                  unit={unit}
                  color={metric.color}
                  seriesNameByKey={seriesNameByKey}
                />
              </SectionCard>
            );
          })}

          <SectionCard
            eyebrow="Connection"
            title="接続状況"
            description="backend から取得した現在の接続状態です。"
          >
            <div className="space-y-4">
              <div className="dashboard-card rounded-[8px] p-4">
                <p className="text-sm font-medium text-white/70">System Status</p>
                <p className="mt-2 text-[30px] font-semibold text-white">
                  {data.latestStatus.connection_status.overall_status.toUpperCase()}
                </p>
                <p className="mt-2 text-sm text-[#9cadbf]">
                  {syncError ?? data.latestStatus.connection_status.detail}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/settings"
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  設定
                </Link>
                <Link
                  href="/manual-input"
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  データ入力
                </Link>
                <Link
                  href="/export"
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  CSV 出力
                </Link>
              </div>
            </div>
          </SectionCard>
        </div>
      </section>
    </div>
  );
}
