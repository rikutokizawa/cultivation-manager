"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { LatestImages } from "@/components/latest-images";
import { OndotoriTrendExplorer } from "@/components/ondotori-trend-explorer";
import { SectionCard } from "@/components/section-card";
import { SensorLineChart } from "@/components/sensor-line-chart";
import { StatusCard } from "@/components/status-card";
import { getLatestStatus, getSensorSeries } from "@/lib/api";
import { compareBackendTimestamps, formatJapanDateTime } from "@/lib/datetime";
import {
  type DeviceLabels,
  deviceKeyFromRecord,
  formatLabelInput,
  formatMetricValue,
  latestRecord,
  normalizeStoredLabels,
  ondotoriLabelStorageKey,
  ondotoriMetrics,
  ondotoriSource,
  parseLabelInput,
} from "@/lib/ondotori";
import type { LatestStatus, SensorRecord } from "@/types/api";

type DashboardData = {
  latestStatus: LatestStatus;
  temperatureRecords: SensorRecord[];
  humidityRecords: SensorRecord[];
  co2Records: SensorRecord[];
  tankLevelRecords: SensorRecord[];
};

type DashboardRealtimeProps = {
  initialData: DashboardData;
};

const refreshIntervalMs = 60_000;
const ondotoriMetricOrder = ondotoriMetrics.map((metric) => metric.key);
type OndotoriMetricKey = (typeof ondotoriMetricOrder)[number];
const metricLabels: Record<string, string> = {
  co2: "CO2",
  temperature: "Temperature",
  humidity: "Humidity",
  tank_level: "Water Level",
};

function formatMetric(value: number | undefined, unit: string | undefined, digits = 1) {
  return formatMetricValue(value, unit, digits);
}

function formatDeviceName(location: string) {
  return location.split("/").map((part) => part.trim()).filter(Boolean).at(-1) ?? location;
}

function formatDeviceContext(location: string) {
  const parts = location.split("/").map((part) => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts.slice(0, -1).join(" / ") : location;
}

function latestByLocation(records: SensorRecord[]) {
  const latestMap = new Map<string, SensorRecord>();

  for (const record of records) {
    const current = latestMap.get(record.location);
    if (
      !current ||
      compareBackendTimestamps(record.timestamp, current.timestamp) > 0 ||
      (record.timestamp === current.timestamp && record.id > current.id)
    ) {
      latestMap.set(record.location, record);
    }
  }

  return latestMap;
}

async function fetchDashboardData(): Promise<DashboardData> {
  const [
    latestStatus,
    temperatureRecords,
    humidityRecords,
    co2Records,
    tankLevelRecords,
  ] = await Promise.all([
    getLatestStatus(),
    getSensorSeries("temperature", 120, ondotoriSource),
    getSensorSeries("humidity", 120, ondotoriSource),
    getSensorSeries("co2", 120, ondotoriSource),
    getSensorSeries("tank_level", 120),
  ]);

  return {
    latestStatus,
    temperatureRecords,
    humidityRecords,
    co2Records,
    tankLevelRecords,
  };
}

export function DashboardRealtime({ initialData }: DashboardRealtimeProps) {
  const [data, setData] = useState(initialData);
  const [lastSyncedAt, setLastSyncedAt] = useState(() => new Date());
  const [syncError, setSyncError] = useState<string | null>(null);
  const [deviceLabels, setDeviceLabels] = useState<DeviceLabels>({});

  const latestOndotori = useMemo(
    () => ({
      temperature: latestRecord(data.temperatureRecords),
      humidity: latestRecord(data.humidityRecords),
      co2: latestRecord(data.co2Records),
    }),
    [data.co2Records, data.humidityRecords, data.temperatureRecords],
  );

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
    window.localStorage.setItem(ondotoriLabelStorageKey, JSON.stringify(deviceLabels));
  }, [deviceLabels]);

  const summaryMetrics = useMemo(
    () => [
      {
        label: "Temperature",
        value: formatMetric(
          latestOndotori.temperature?.value,
          latestOndotori.temperature?.unit,
        ),
        meta: `測定: ${formatJapanDateTime(latestOndotori.temperature?.timestamp, { seconds: true })} / ${
          latestOndotori.temperature?.location ?? "--"
        }`,
        accent: "green" as const,
      },
      {
        label: "Humidity",
        value: formatMetric(
          latestOndotori.humidity?.value,
          latestOndotori.humidity?.unit,
        ),
        meta: `測定: ${formatJapanDateTime(latestOndotori.humidity?.timestamp, { seconds: true })} / ${
          latestOndotori.humidity?.location ?? "--"
        }`,
        accent: "blue" as const,
      },
      {
        label: "CO₂",
        value: formatMetric(
          latestOndotori.co2?.value,
          latestOndotori.co2?.unit,
          0,
        ),
        meta: `測定: ${formatJapanDateTime(latestOndotori.co2?.timestamp, { seconds: true })} / ${
          latestOndotori.co2?.location ?? "--"
        }`,
        accent: "amber" as const,
      },
      {
        label: "Water Level",
        value: formatMetric(
          data.latestStatus.latest_tank_level?.value,
          data.latestStatus.latest_tank_level?.unit,
          0,
        ),
        meta: `更新: ${formatJapanDateTime(data.latestStatus.latest_tank_level?.timestamp, { seconds: true })} / ${
          data.latestStatus.latest_tank_level?.location ?? "--"
        }`,
        accent: "slate" as const,
      },
      {
        label: "Connection",
        value: data.latestStatus.connection_status.overall_status.toUpperCase(),
        meta: `確認: ${formatJapanDateTime(data.latestStatus.connection_status.checked_at, { seconds: true })}`,
        accent: "green" as const,
      },
    ],
    [data.latestStatus, latestOndotori],
  );

  const deviceGroups = useMemo(() => {
    const byType = {
      temperature: latestByLocation(data.temperatureRecords),
      humidity: latestByLocation(data.humidityRecords),
      co2: latestByLocation(data.co2Records),
    };
    const locations = new Set<string>();

    for (const recordsByLocation of Object.values(byType)) {
      for (const location of recordsByLocation.keys()) {
        locations.add(location);
      }
    }

    return Array.from(locations)
      .sort((a, b) => formatDeviceName(a).localeCompare(formatDeviceName(b), "ja"))
      .map((location) => ({
        location,
        deviceName: formatDeviceName(location),
        context: formatDeviceContext(location),
        records: Object.fromEntries(
          ondotoriMetricOrder.map((sensorType) => [sensorType, byType[sensorType].get(location)]),
        ) as Record<OndotoriMetricKey, SensorRecord | undefined>,
      }))
      .map((device) => {
        const firstRecord = ondotoriMetricOrder
          .map((sensorType) => device.records[sensorType])
          .find((record): record is SensorRecord => Boolean(record));

        return {
          ...device,
          key: firstRecord ? deviceKeyFromRecord(firstRecord) : device.location,
        };
      });
  }, [data]);

  const labelAverages = useMemo(() => {
    const groupedDevices = new Map<string, typeof deviceGroups>();

    for (const device of deviceGroups) {
      const labels = deviceLabels[device.key] ?? [];
      for (const label of labels) {
        groupedDevices.set(label, [...(groupedDevices.get(label) ?? []), device]);
      }
    }

    const availableMetrics = ondotoriMetricOrder.filter((sensorType) =>
      deviceGroups.some((device) => Boolean(device.records[sensorType])),
    );

    return Array.from(groupedDevices.entries()).map(([label, devices]) => ({
      label,
      devices,
      metrics: availableMetrics.map((sensorType) => {
        const values = devices
          .map((device) => device.records[sensorType])
          .filter((record): record is SensorRecord => Boolean(record));
        const average =
          values.length > 0
            ? values.reduce((sum, record) => sum + record.value, 0) / values.length
            : undefined;
        const latestTimestamp = latestRecord(values)?.timestamp;
        const unit = values[0]?.unit;

        return {
          sensorType,
          average,
          unit,
          count: values.length,
          latestTimestamp,
        };
      }),
    }));
  }, [deviceGroups, deviceLabels]);

  return (
    <div className="space-y-8">
      <section className="dashboard-first-view space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="dashboard-section-title text-[24px] sm:text-[28px]">
            栽培環境モニタリング（代表値）
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
              更新間隔 60秒
            </span>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {summaryMetrics.map((metric) => (
                <StatusCard
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                  meta={metric.meta}
                  accent={metric.accent}
                  compact
                />
              ))}
            </div>
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
                機器別最新値で同じ位置ラベルを付けた機器の最新値を平均します。
              </p>
            </div>
            <span className="text-xs text-[#9cadbf]">おんどとり項目のみ</span>
          </div>

          {labelAverages.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-3">
              {labelAverages.map((area) => (
                <article key={area.label} className="rounded-[8px] border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-white">{area.label}</h3>
                      <p className="mt-1 text-xs text-[#9cadbf]">
                        {area.devices.map((device) => device.deviceName).join(" / ")}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-[#9cadbf]">
                      {area.devices.length}機器
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {area.metrics.map((metric) => (
                      <div key={metric.sensorType} className="flex items-start justify-between gap-3 text-sm">
                        <span className="text-[#9cadbf]">{metricLabels[metric.sensorType]}</span>
                        <span className="text-right font-semibold text-white">
                          {formatMetric(
                            metric.average,
                            metric.unit,
                            metric.sensorType === "co2" ? 0 : 1,
                          )}
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
              機器別最新値で位置ラベルを入力すると、ここにラベル別平均が表示されます。
            </p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="dashboard-section-title text-[22px]">おんどとり機器別 最新値</h2>
          <p className="mt-2 text-sm text-[#9cadbf]">
            おんどとりAPIから保存した値だけを、設置グループ、親機、子機ごとにまとめています。
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {deviceGroups.map((device) => (
            <article key={device.location} className="dashboard-card rounded-[8px] p-4">
              <div className="border-b border-white/10 pb-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9cadbf]">
                  Ondotori Device
                </p>
                <h3 className="mt-2 text-xl font-semibold text-white">{device.deviceName}</h3>
                <p className="mt-1 text-sm text-[#9cadbf]">{device.context}</p>
                <input
                  value={formatLabelInput(deviceLabels[device.key])}
                  onChange={(event) =>
                    setDeviceLabels((current) => ({
                      ...current,
                      [device.key]: parseLabelInput(event.target.value),
                    }))
                  }
                  placeholder="位置ラベル（例: Aエリア, Bエリア）"
                  className="mt-3 w-full rounded-[8px] border border-white/10 bg-[#1f2123] px-3 py-2 text-sm text-white outline-none placeholder:text-[#9cadbf]/60"
                />
                {deviceLabels[device.key]?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {deviceLabels[device.key].map((label) => (
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

              <div className="mt-4 grid gap-3">
                {ondotoriMetricOrder.map((sensorType) => {
                  const record = device.records[sensorType];

                  return (
                    <div
                      key={sensorType}
                      className="rounded-[8px] border border-white/10 bg-white/[0.03] p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium text-[#9cadbf]">
                            {metricLabels[sensorType]}
                          </p>
                          <p className="mt-1 text-lg font-semibold text-white">
                            {record ? formatMetric(record.value, record.unit, sensorType === "co2" ? 0 : 1) : "--"}
                          </p>
                        </div>
                        {record ? (
                          <span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-[#9cadbf]">
                            測定 {formatJapanDateTime(record.timestamp, { seconds: true })}
                          </span>
                        ) : null}
                      </div>
                      {record ? (
                        <p className="mt-2 text-xs text-[#9cadbf]">
                          {record.sensor_id}
                          {record.note ? ` / ${record.note}` : ""}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      <OndotoriTrendExplorer
        deviceLabels={deviceLabels}
        initialRecords={{
          temperature: data.temperatureRecords,
          humidity: data.humidityRecords,
          co2: data.co2Records,
        }}
      />

      <section id="timeseries" className="space-y-8">
        <div>
          <h2 className="dashboard-section-title text-[22px]">空気質環境</h2>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard
            eyebrow="Temperature"
            title="気温センサー"
            description="栽培室の温度変動を追跡します。"
          >
            <SensorLineChart records={data.temperatureRecords} unit="C" color="#c8def5" />
          </SectionCard>

          <SectionCard
            eyebrow="Humidity"
            title="湿度センサー"
            description="湿度制御の安定性を確認します。"
          >
            <SensorLineChart records={data.humidityRecords} unit="%" color="#abcdf1" />
          </SectionCard>

          <SectionCard
            eyebrow="CO₂"
            title="CO₂ センサー"
            description="CO₂ 濃度の推移を監視します。"
          >
            <SensorLineChart records={data.co2Records} unit="ppm" color="#dcecff" />
          </SectionCard>

          <SectionCard
            eyebrow="Connection"
            title="接続状況"
            description="ローカル開発構成における backend 接続状態です。"
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

        <div>
          <h2 className="dashboard-section-title text-[22px]">養液環境</h2>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard
            eyebrow="Water Level"
            title="水位センサー"
            description="養液タンクの残量推移を監視します。"
          >
            <SensorLineChart records={data.tankLevelRecords} unit="%" color="#e7f1ff" />
          </SectionCard>

          <SectionCard
            eyebrow="Navigation"
            title="画面導線"
            description="入力と出力は下記から移動できます。"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/manual-input"
                className="dashboard-card rounded-[8px] p-4 transition hover:border-white/25"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9cadbf]">
                  Manual Input
                </p>
                <p className="mt-3 text-lg font-semibold text-white">手入力データ</p>
                <p className="mt-2 text-sm text-[#9cadbf]">
                  実測値を登録して履歴へ反映します。
                </p>
              </Link>
              <Link
                href="/export"
                className="dashboard-card rounded-[8px] p-4 transition hover:border-white/25"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9cadbf]">
                  Export
                </p>
                <p className="mt-3 text-lg font-semibold text-white">CSV 出力</p>
                <p className="mt-2 text-sm text-[#9cadbf]">
                  指定期間のデータを CSV で保存します。
                </p>
              </Link>
            </div>
          </SectionCard>
        </div>
      </section>
    </div>
  );
}
