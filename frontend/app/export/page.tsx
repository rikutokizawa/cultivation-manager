import { ExportForm } from "@/components/export-form";
import { SectionCard } from "@/components/section-card";

export default function ExportPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
      <SectionCard
        eyebrow="CSV Export"
        title="センサデータ抽出"
        description="期間とセンサ種別を指定して backend の CSV export API へ渡します。"
      >
        <ExportForm />
      </SectionCard>

      <SectionCard
        eyebrow="Usage"
        title="使い方"
        description="当面は sensor_records の抽出に絞り、後で画像一覧や手入力データ export を追加します。"
      >
        <ol className="space-y-3 text-sm leading-6 text-ink/70">
          <li>開始日時と終了日時を必要に応じて指定します。</li>
          <li>対象センサ種別を選びます。</li>
          <li>CSV ダウンロードを押すと backend の export API に直接アクセスします。</li>
        </ol>
      </SectionCard>
    </div>
  );
}
