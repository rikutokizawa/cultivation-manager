import Link from "next/link";

import { LatestImages } from "@/components/latest-images";
import { SectionCard } from "@/components/section-card";
import { StatusCard } from "@/components/status-card";
import { TemperatureChart } from "@/components/temperature-chart";
import { getHealth, getLatestStatus, getTemperatureSeries } from "@/lib/api";

function formatTemperature(value: number | undefined, unit: string | undefined) {
  if (value === undefined || !unit) {
    return "--";
  }

  return `${value.toFixed(1)} ${unit}`;
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
  const [health, latestStatus, temperatureRecords] = await Promise.all([
    getHealth(),
    getLatestStatus(),
    getTemperatureSeries(),
  ]);

  const latestTemperature = latestStatus.latest_temperature;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-3">
        <StatusCard
          label="現在温度"
          value={formatTemperature(latestTemperature?.value, latestTemperature?.unit)}
          meta={`更新 ${formatDateTime(latestTemperature?.timestamp)} / ${latestTemperature?.location ?? "--"}`}
          accent="green"
        />
        <StatusCard
          label="画像更新"
          value={`${latestStatus.latest_images.length} cameras`}
          meta={
            latestStatus.latest_images[0]
              ? `最新 ${formatDateTime(latestStatus.latest_images[0].timestamp)}`
              : "画像データなし"
          }
          accent="amber"
        />
        <StatusCard
          label="システム状態"
          value={health.status.toUpperCase()}
          meta={`API: ${health.app_name}`}
          accent="slate"
        />
      </section>

      <SectionCard
        eyebrow="Time Series"
        title="温度の時系列グラフ"
        description="直近のダミーデータを読み込み、研究室での閲覧を想定したベース画面を先に固めています。"
      >
        <TemperatureChart records={temperatureRecords} />
      </SectionCard>

      <SectionCard
        eyebrow="Latest Cameras"
        title="最新画像"
        description="いまは SVG のダミー画像を表示しています。後で USB カメラ保存処理に差し替えます。"
      >
        <LatestImages images={latestStatus.latest_images} />
      </SectionCard>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          eyebrow="Flow"
          title="次の作業"
          description="v0.1 では dashboard, manual input, export を最小導線でつなぎます。"
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
            <li>frontend は backend API を直接参照し、認証追加に備えて責務を分離。</li>
          </ul>
        </SectionCard>
      </section>
    </div>
  );
}

