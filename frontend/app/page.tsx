import Link from "next/link";

import { LatestImages } from "@/components/latest-images";
import { SectionCard } from "@/components/section-card";
import { SensorLineChart } from "@/components/sensor-line-chart";
import { StatusCard } from "@/components/status-card";
import { getLatestStatus, getSensorSeries } from "@/lib/api";

function formatMetric(value: number | undefined, unit: string | undefined, digits = 1) {
  if (value === undefined || !unit) {
    return "--";
  }

  return `${value.toFixed(digits)} ${unit}`;
}

function formatDateTime(value: string | undefined) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function DashboardPage() {
  const [
    latestStatus,
    temperatureRecords,
    humidityRecords,
    co2Records,
    tankLevelRecords,
  ] = await Promise.all([
    getLatestStatus(),
    getSensorSeries("temperature"),
    getSensorSeries("humidity"),
    getSensorSeries("co2"),
    getSensorSeries("tank_level"),
  ]);

  const summaryMetrics = [
    {
      label: "Temperature",
      value: formatMetric(
        latestStatus.latest_temperature?.value,
        latestStatus.latest_temperature?.unit,
      ),
      meta: `更新: ${formatDateTime(latestStatus.latest_temperature?.timestamp)}`,
      accent: "green" as const,
    },
    {
      label: "Humidity",
      value: formatMetric(
        latestStatus.latest_humidity?.value,
        latestStatus.latest_humidity?.unit,
      ),
      meta: `更新: ${formatDateTime(latestStatus.latest_humidity?.timestamp)}`,
      accent: "blue" as const,
    },
    {
      label: "CO₂",
      value: formatMetric(latestStatus.latest_co2?.value, latestStatus.latest_co2?.unit, 0),
      meta: `更新: ${formatDateTime(latestStatus.latest_co2?.timestamp)}`,
      accent: "amber" as const,
    },
    {
      label: "Water Level",
      value: formatMetric(
        latestStatus.latest_tank_level?.value,
        latestStatus.latest_tank_level?.unit,
        0,
      ),
      meta: `更新: ${formatDateTime(latestStatus.latest_tank_level?.timestamp)}`,
      accent: "slate" as const,
    },
    {
      label: "Connection",
      value: latestStatus.connection_status.overall_status.toUpperCase(),
      meta: `確認: ${formatDateTime(latestStatus.connection_status.checked_at)}`,
      accent: "green" as const,
    },
  ];

  return (
    <div className="space-y-8">
      <section className="dashboard-first-view space-y-5">
        <div>
          <h1 className="dashboard-section-title text-[24px] sm:text-[28px]">
            栽培環境モニタリング（代表値）
          </h1>
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
                <LatestImages images={latestStatus.latest_images.slice(0, 1)} compact />
              </div>
              <div>
                <h2 className="dashboard-section-title mb-3 text-[20px]">カメラ2</h2>
                <LatestImages images={latestStatus.latest_images.slice(1, 2)} compact />
              </div>
            </div>
          </div>
        </div>
      </section>

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
            <SensorLineChart records={temperatureRecords} unit="C" color="#c8def5" />
          </SectionCard>

          <SectionCard
            eyebrow="Humidity"
            title="湿度センサー"
            description="湿度制御の安定性を確認します。"
          >
            <SensorLineChart records={humidityRecords} unit="%" color="#abcdf1" />
          </SectionCard>

          <SectionCard
            eyebrow="CO₂"
            title="CO₂ センサー"
            description="CO₂ 濃度の推移を監視します。"
          >
            <SensorLineChart records={co2Records} unit="ppm" color="#dcecff" />
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
                  {latestStatus.connection_status.overall_status.toUpperCase()}
                </p>
                <p className="mt-2 text-sm text-[#9cadbf]">
                  {latestStatus.connection_status.detail}
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
            <SensorLineChart records={tankLevelRecords} unit="%" color="#e7f1ff" />
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
