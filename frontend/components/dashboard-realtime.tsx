"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ExportForm } from "@/components/export-form";
import { LatestImages } from "@/components/latest-images";
import { SensorLineChart } from "@/components/sensor-line-chart";
import { getOverview, getSensorSeries, importTrzFiles } from "@/lib/api";
import {
  backendTimestampToMilliseconds,
  formatJapanDateTime,
} from "@/lib/datetime";
import {
  compareSensorTypes,
  formatMetricValue,
  metricConfigForType,
} from "@/lib/sensors";
import type { Overview, OverviewReading, SensorRecord } from "@/types/api";

type DashboardRealtimeProps = {
  initialOverview: Overview;
};

type PeriodKey = "6h" | "24h" | "7d";

const periods: Record<PeriodKey, { label: string; hours: number }> = {
  "6h": { label: "6時間", hours: 6 },
  "24h": { label: "24時間", hours: 24 },
  "7d": { label: "7日", hours: 24 * 7 },
};

function allReadings(overview: Overview) {
  return overview.devices.flatMap((device) =>
    device.readings.map((reading) => ({
      ...reading,
      deviceId: device.device_id,
      deviceName: device.name,
    })),
  );
}

function readingKey(reading: OverviewReading) {
  return `${reading.sensor_type}:${reading.sensor_id}`;
}

function startAt(period: PeriodKey) {
  return new Date(Date.now() - periods[period].hours * 60 * 60 * 1000).toISOString();
}

function ageInMinutes(timestamp: string | undefined, referenceTimestamp: string) {
  if (!timestamp) {
    return Number.POSITIVE_INFINITY;
  }

  const elapsedMilliseconds =
    backendTimestampToMilliseconds(referenceTimestamp) -
    backendTimestampToMilliseconds(timestamp);
  return Math.max(0, elapsedMilliseconds / 60_000);
}

function timestampColorClass(ageMinutes: number) {
  if (ageMinutes >= 30) {
    return "text-[#ff8f7f]";
  }
  if (ageMinutes >= 15) {
    return "text-[#f6d365]";
  }
  return "text-[#7cc7ff]";
}

export function DashboardRealtime({ initialOverview }: DashboardRealtimeProps) {
  const initialReadings = allReadings(initialOverview);
  const [overview, setOverview] = useState(initialOverview);
  const [exportOpen, setExportOpen] = useState(false);
  const [period, setPeriod] = useState<PeriodKey>("24h");
  const [selectedKey, setSelectedKey] = useState(
    initialReadings[0] ? readingKey(initialReadings[0]) : "",
  );
  const [series, setSeries] = useState<SensorRecord[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const trzInputRef = useRef<HTMLInputElement>(null);

  const readings = useMemo(() => allReadings(overview), [overview]);
  const selectedReading = readings.find((reading) => readingKey(reading) === selectedKey);
  const sensorTypes = useMemo(
    () =>
      Array.from(
        new Set(overview.devices.flatMap((device) => device.readings.map((item) => item.sensor_type))),
      ).sort(compareSensorTypes),
    [overview.devices],
  );

  useEffect(() => {
    let mounted = true;
    async function refreshOverview() {
      try {
        const next = await getOverview();
        if (!mounted) {
          return;
        }
        setOverview(next);
        const nextReadings = allReadings(next);
        if (!nextReadings.some((reading) => readingKey(reading) === selectedKey)) {
          setSelectedKey(nextReadings[0] ? readingKey(nextReadings[0]) : "");
        }
        setError(null);
      } catch (refreshError) {
        if (mounted) {
          setError(
            refreshError instanceof Error ? refreshError.message : "更新に失敗しました",
          );
        }
      }
    }

    const interval = window.setInterval(refreshOverview, 60_000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [selectedKey]);

  useEffect(() => {
    if (!selectedReading) {
      setSeries([]);
      return;
    }
    const activeReading = selectedReading;

    let mounted = true;
    async function refreshSeries() {
      setSeriesLoading(true);
      try {
        const records = await getSensorSeries(activeReading.sensor_type, {
          sensorId: activeReading.sensor_id,
          startAt: startAt(period),
        });
        if (mounted) {
          setSeries(records);
          setError(null);
        }
      } catch (fetchError) {
        if (mounted) {
          setError(
            fetchError instanceof Error ? fetchError.message : "グラフ取得に失敗しました",
          );
        }
      } finally {
        if (mounted) {
          setSeriesLoading(false);
        }
      }
    }

    void refreshSeries();
    const interval = window.setInterval(refreshSeries, 60_000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [period, selectedKey, selectedReading]);

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  }

  async function handleTrzSelection(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    setImporting(true);
    setImportMessage(null);
    setError(null);
    try {
      const result = await importTrzFiles(Array.from(files));
      const nextOverview = await getOverview();
      setOverview(nextOverview);
      setImportMessage(
        `${result.files.length}ファイルを取り込みました（新規 ${result.inserted_count}件、重複 ${result.skipped_duplicate_count}件）`,
      );
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "TRZの取り込みに失敗しました");
    } finally {
      setImporting(false);
      if (trzInputRef.current) {
        trzInputRef.current.value = "";
      }
    }
  }

  return (
    <div className="space-y-6">
      <header className="dashboard-card rounded-[8px] p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  overview.status.state === "online" ? "bg-[#9fd8cb]" : "bg-[#f8c471]"
                }`}
              />
              <h1 className="dashboard-section-title text-[26px]">栽培状況</h1>
            </div>
            <p className="mt-2 text-sm text-[#9cadbf]">
              最終取得{" "}
              {formatJapanDateTime(overview.status.last_sensor_at ?? undefined, {
                seconds: true,
              })}
              {" / "}
              {overview.status.state === "online" ? "正常" : "更新停止"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={trzInputRef}
              type="file"
              accept=".trz"
              multiple
              className="hidden"
              onChange={(event) => void handleTrzSelection(event.target.files)}
            />
            <button
              type="button"
              onClick={() => trzInputRef.current?.click()}
              disabled={importing}
              className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white"
            >
              {importing ? "取込中..." : "TRZ取込"}
            </button>
            <button
              type="button"
              onClick={() => setExportOpen(true)}
              className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white"
            >
              CSV出力
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white"
            >
              全画面
            </button>
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-[#ffb39f]">{error}</p> : null}
        {importMessage ? <p className="mt-3 text-sm text-[#9fd8cb]">{importMessage}</p> : null}
      </header>

      <section className="dashboard-card overflow-x-auto rounded-[8px] p-4">
        <div className="mb-4">
          <h2 className="dashboard-section-title text-[20px]">センサー現在値</h2>
        </div>
        {overview.devices.length > 0 ? (
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/10 text-xs text-[#9cadbf]">
                <th className="px-3 py-3 font-medium">機器</th>
                {sensorTypes.map((sensorType) => (
                  <th key={sensorType} className="px-3 py-3 font-medium">
                    {metricConfigForType(sensorType).label}
                  </th>
                ))}
                <th className="px-3 py-3 font-medium">更新</th>
              </tr>
            </thead>
            <tbody>
              {overview.devices.map((device) => {
                const latestTimestamp = device.readings
                  .map((reading) => reading.timestamp)
                  .sort()
                  .at(-1);
                const latestAgeMinutes = ageInMinutes(
                  latestTimestamp,
                  overview.status.checked_at,
                );
                return (
                  <tr key={device.device_id} className="border-b border-white/5">
                    <td className="px-3 py-4">
                      <p className="font-semibold text-white">{device.name}</p>
                      <p className="mt-1 text-xs text-[#9cadbf]">{device.device_id}</p>
                    </td>
                    {sensorTypes.map((sensorType) => {
                      const reading = device.readings.find(
                        (item) => item.sensor_type === sensorType,
                      );
                      const readingAgeMinutes = ageInMinutes(
                        reading?.timestamp,
                        overview.status.checked_at,
                      );
                      return (
                        <td
                          key={sensorType}
                          className={`px-3 py-4 text-lg font-semibold ${
                            !reading
                              ? "text-[#68727d]"
                              : readingAgeMinutes >= 30
                                ? "text-white/35"
                                : "text-white"
                          }`}
                        >
                          {formatMetricValue(reading?.value, reading?.unit)}
                        </td>
                      );
                    })}
                    <td
                      className={`px-3 py-4 text-xs font-medium ${timestampColorClass(
                        latestAgeMinutes,
                      )}`}
                    >
                      {formatJapanDateTime(latestTimestamp, { seconds: true })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-[#9cadbf]">センサーデータはまだありません。</p>
        )}
      </section>

      <section>
        <h2 className="dashboard-section-title mb-4 text-[20px]">最新画像</h2>
        <LatestImages images={overview.latest_images} />
      </section>

      <section className="dashboard-card rounded-[8px] p-4">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="dashboard-section-title text-[20px]">推移</h2>
            <p className="mt-1 text-sm text-[#9cadbf]">表示する機器と項目を選択します。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedKey}
              onChange={(event) => setSelectedKey(event.target.value)}
              className="rounded-[8px] border border-white/10 bg-[#1f2123] px-3 py-2 text-sm text-white"
            >
              {readings.map((reading) => (
                <option key={readingKey(reading)} value={readingKey(reading)}>
                  {reading.deviceName} / {metricConfigForType(reading.sensor_type).label}
                </option>
              ))}
            </select>
            {(Object.keys(periods) as PeriodKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setPeriod(key)}
                className={`rounded-full px-3 py-2 text-sm ${
                  period === key
                    ? "bg-white text-[#1f2123]"
                    : "border border-white/10 bg-white/5 text-white"
                }`}
              >
                {periods[key].label}
              </button>
            ))}
          </div>
        </div>
        <div className="pt-4">
          {seriesLoading && series.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-[#9cadbf]">
              読み込み中...
            </div>
          ) : series.length > 0 && selectedReading ? (
            <SensorLineChart
              records={series}
              unit={selectedReading.unit}
              color={metricConfigForType(selectedReading.sensor_type).color}
              seriesNameByKey={{
                [`ondotori:${selectedReading.sensor_type}:${selectedReading.sensor_id}`]:
                  selectedReading.deviceName,
              }}
            />
          ) : (
            <div className="flex h-[280px] items-center justify-center text-sm text-[#9cadbf]">
              表示できるデータがありません。
            </div>
          )}
        </div>
      </section>

      {exportOpen ? (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setExportOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[12px] bg-[#f4f1e8] p-5 text-[#1f2123] shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">センサーデータ出力</h2>
              <button
                type="button"
                onClick={() => setExportOpen(false)}
                className="rounded-full border border-black/10 px-3 py-1.5 text-sm"
              >
                閉じる
              </button>
            </div>
            <ExportForm />
          </section>
        </div>
      ) : null}
    </div>
  );
}
