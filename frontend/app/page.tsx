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
    month: "numeric",
    day: "numeric",
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

  const heroMetrics = [
    {
      label: "温度",
      value: formatMetric(latestStatus.latest_temperature?.value, latestStatus.latest_temperature?.unit),
      meta: `更新 ${formatDateTime(latestStatus.latest_temperature?.timestamp)}`,
      accent: "green" as const,
    },
    {
      label: "湿度",
      value: formatMetric(latestStatus.latest_humidity?.value, latestStatus.latest_humidity?.unit),
      meta: `更新 ${formatDateTime(latestStatus.latest_humidity?.timestamp)}`,
      accent: "blue" as const,
    },
    {
      label: "CO2濃度",
      value: formatMetric(latestStatus.latest_co2?.value, latestStatus.latest_co2?.unit, 0),
      meta: `更新 ${formatDateTime(latestStatus.latest_co2?.timestamp)}`,
      accent: "amber" as const,
    },
    {
      label: "タンク水位",
      value: formatMetric(latestStatus.latest_tank_level?.value, latestStatus.latest_tank_level?.unit, 0),
      meta: `${latestStatus.latest_tank_level?.location ?? "nutrient-tank-a"}`,
      accent: "slate" as const,
    },
    {
      label: "接続状況",
      value: latestStatus.connection_status.overall_status.toUpperCase(),
      meta: `確認 ${formatDateTime(latestStatus.connection_status.checked_at)}`,
      accent: "green" as const,
    },
  ];

  return (
    <div className="space-y-8">
      <section className="dashboard-first-view grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="panel hero-grid flex h-full min-h-[26rem] flex-col rounded-[30px] p-5 shadow-soft sm:p-6">
          <div className="mb-5 flex items-end justify-between gap-4 border-b border-ink/10 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-leaf/80">
                Live Overview
              </p>
              <h2 className="mt-2 text-2xl font-semibold">トップ画面で主要監視項目を一覧表示</h2>
            </div>
            <a
              href="#timeseries"
              className="rounded-full border border-ink/10 bg-white/80 px-4 py-2 text-sm font-medium text-ink/75 transition hover:bg-white"
            >
              詳細へ
            </a>
          </div>
          <div className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {heroMetrics.map((metric) => (
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

        <div className="panel flex h-full min-h-[26rem] flex-col rounded-[30px] p-5 shadow-soft sm:p-6">
          <div className="mb-5 border-b border-ink/10 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-leaf/80">
              Camera Feed
            </p>
            <h2 className="mt-2 text-2xl font-semibold">栽培画像 2 枚</h2>
            <p className="mt-2 text-sm leading-6 text-ink/65">
              1 画面目では最新画像を常時表示し、詳細時系列は下へスクロールして確認します。
            </p>
          </div>
          <div className="flex-1">
            <LatestImages images={latestStatus.latest_images} compact />
          </div>
        </div>
      </section>

      <section id="timeseries" className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          eyebrow="Time Series"
          title="温度の時系列"
          description="栽培室の温度変動を追跡します。"
        >
          <SensorLineChart records={temperatureRecords} unit="C" color="#38795b" />
        </SectionCard>

        <SectionCard
          eyebrow="Time Series"
          title="湿度の時系列"
          description="湿度制御の安定性を確認します。"
        >
          <SensorLineChart records={humidityRecords} unit="%" color="#2563eb" />
        </SectionCard>

        <SectionCard
          eyebrow="Time Series"
          title="CO2濃度の時系列"
          description="将来の実機 CO2 センサ統合を見据えた表示枠です。"
        >
          <SensorLineChart records={co2Records} unit="ppm" color="#c67f2a" />
        </SectionCard>

        <SectionCard
          eyebrow="Time Series"
          title="タンク水位の時系列"
          description="養液タンクの残量推移を監視します。"
        >
          <SensorLineChart records={tankLevelRecords} unit="%" color="#334155" />
        </SectionCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          eyebrow="Flow"
          title="運用導線"
          description="監視トップの下から、そのまま入力と出力に移れます。"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/manual-input"
              className="rounded-[20px] border border-ink/10 bg-white/80 p-5 transition hover:border-leaf/30 hover:bg-white"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-leaf/75">
                Manual Input
              </p>
              <h3 className="mt-2 text-lg font-semibold">手入力データを登録</h3>
              <p className="mt-2 text-sm leading-6 text-ink/65">
                スマホや PC から実測値を登録する導線です。
              </p>
            </Link>
            <Link
              href="/export"
              className="rounded-[20px] border border-ink/10 bg-white/80 p-5 transition hover:border-leaf/30 hover:bg-white"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-leaf/75">
                Export
              </p>
              <h3 className="mt-2 text-lg font-semibold">CSV を抽出</h3>
              <p className="mt-2 text-sm leading-6 text-ink/65">
                期間指定とセンサ種別で CSV を落とせる構成です。
              </p>
            </Link>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Architecture"
          title="ローカル構成メモ"
          description="将来の Raspberry Pi 移行で置き換える場所を明確にしています。"
        >
          <ul className="space-y-3 text-sm leading-6 text-ink/70">
            <li>保存先と URL は `.env` / `.env.local` に切り出し。</li>
            <li>センサ取得ロジックは backend の services / scripts に寄せる。</li>
            <li>トップ画面は主要監視項目を 1 画面に集約し、詳細はスクロール下へ分離。</li>
          </ul>
        </SectionCard>
      </section>
    </div>
  );
}
