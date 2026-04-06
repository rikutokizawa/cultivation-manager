import { ManualRecordForm } from "@/components/manual-record-form";
import { SectionCard } from "@/components/section-card";
import { getManualRecords } from "@/lib/api";

function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export default async function ManualInputPage() {
  const records = await getManualRecords();

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <SectionCard
        eyebrow="Entry"
        title="手入力データ登録"
        description="葉長や重量など、手元の測器で計測した値をここから保存します。"
      >
        <ManualRecordForm />
      </SectionCard>

      <SectionCard
        eyebrow="Recent Records"
        title="直近の手入力"
        description="入力導線の確認用に、登録済みデータを右側へ並べています。"
      >
        <div className="space-y-3">
          {records.map((record) => (
            <article
              key={record.id}
              className="rounded-[20px] border border-ink/10 bg-white/80 px-4 py-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">{record.item_type}</h3>
                  <p className="mt-1 text-sm text-ink/65">
                    {record.location} / {record.input_by}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">
                    {record.value} {record.unit}
                  </p>
                  <p className="mt-1 text-sm text-ink/55">
                    {formatTimestamp(record.timestamp)}
                  </p>
                </div>
              </div>
              {record.note ? <p className="mt-3 text-sm text-ink/60">{record.note}</p> : null}
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

