"use client";

import { useMemo, useState } from "react";

import { getSensorExportUrl } from "@/lib/api";

const initialForm = {
  startAt: "",
  endAt: "",
  sensorType: "temperature",
};

export function ExportForm() {
  const [form, setForm] = useState(initialForm);

  const exportUrl = useMemo(
    () =>
      getSensorExportUrl({
        sensorType: form.sensorType,
        startAt: form.startAt || undefined,
        endAt: form.endAt || undefined,
      }),
    [form.endAt, form.sensorType, form.startAt],
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-2 text-sm font-medium">
          <span>開始日時</span>
          <input
            type="datetime-local"
            value={form.startAt}
            onChange={(event) => setForm({ ...form, startAt: event.target.value })}
            className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 outline-none transition focus:border-leaf/40"
          />
        </label>
        <label className="space-y-2 text-sm font-medium">
          <span>終了日時</span>
          <input
            type="datetime-local"
            value={form.endAt}
            onChange={(event) => setForm({ ...form, endAt: event.target.value })}
            className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 outline-none transition focus:border-leaf/40"
          />
        </label>
        <label className="space-y-2 text-sm font-medium">
          <span>センサ種別</span>
          <select
            value={form.sensorType}
            onChange={(event) => setForm({ ...form, sensorType: event.target.value })}
            className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 outline-none transition focus:border-leaf/40"
          >
            <option value="temperature">temperature</option>
            <option value="humidity">humidity</option>
          </select>
        </label>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <a
          href={exportUrl}
          className="inline-flex w-fit rounded-full bg-amber px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          CSV をダウンロード
        </a>
        <p className="text-sm text-ink/65">
          指定条件は query parameter として backend の export API に渡されます。
        </p>
      </div>
    </div>
  );
}

