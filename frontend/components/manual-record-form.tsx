"use client";

import { useState } from "react";

import { createManualRecord } from "@/lib/api";
import type { ManualRecord } from "@/types/api";

const defaultTimestamp = new Date().toISOString().slice(0, 16);

const initialForm = {
  timestamp: defaultTimestamp,
  item_type: "leaf_length",
  location: "growth-chamber-a",
  value: "0",
  unit: "cm",
  input_by: "",
  note: "",
};

type FormState = typeof initialForm;

export function ManualRecordForm() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    const payload: Omit<ManualRecord, "id"> = {
      timestamp: new Date(form.timestamp).toISOString(),
      item_type: form.item_type,
      location: form.location,
      value: Number(form.value),
      unit: form.unit,
      input_by: form.input_by,
      note: form.note || null,
    };

    try {
      const record = await createManualRecord(payload);
      setMessage(`登録完了: ${record.item_type} / ${record.value} ${record.unit}`);
      setForm({
        ...initialForm,
        input_by: form.input_by,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "送信に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium">
          <span>日時</span>
          <input
            type="datetime-local"
            value={form.timestamp}
            onChange={(event) => setForm({ ...form, timestamp: event.target.value })}
            className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 outline-none ring-0 transition focus:border-leaf/40"
            required
          />
        </label>
        <label className="space-y-2 text-sm font-medium">
          <span>入力者</span>
          <input
            type="text"
            value={form.input_by}
            onChange={(event) => setForm({ ...form, input_by: event.target.value })}
            className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 outline-none transition focus:border-leaf/40"
            placeholder="example: yamada"
            required
          />
        </label>
        <label className="space-y-2 text-sm font-medium">
          <span>項目</span>
          <input
            type="text"
            value={form.item_type}
            onChange={(event) => setForm({ ...form, item_type: event.target.value })}
            className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 outline-none transition focus:border-leaf/40"
            required
          />
        </label>
        <label className="space-y-2 text-sm font-medium">
          <span>場所</span>
          <input
            type="text"
            value={form.location}
            onChange={(event) => setForm({ ...form, location: event.target.value })}
            className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 outline-none transition focus:border-leaf/40"
            required
          />
        </label>
        <label className="space-y-2 text-sm font-medium">
          <span>値</span>
          <input
            type="number"
            step="0.01"
            value={form.value}
            onChange={(event) => setForm({ ...form, value: event.target.value })}
            className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 outline-none transition focus:border-leaf/40"
            required
          />
        </label>
        <label className="space-y-2 text-sm font-medium">
          <span>単位</span>
          <input
            type="text"
            value={form.unit}
            onChange={(event) => setForm({ ...form, unit: event.target.value })}
            className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 outline-none transition focus:border-leaf/40"
            required
          />
        </label>
      </div>
      <label className="block space-y-2 text-sm font-medium">
        <span>メモ</span>
        <textarea
          value={form.note}
          onChange={(event) => setForm({ ...form, note: event.target.value })}
          rows={4}
          className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 outline-none transition focus:border-leaf/40"
          placeholder="補足があれば記録"
        />
      </label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-moss disabled:cursor-not-allowed disabled:bg-ink/50"
        >
          {isSubmitting ? "登録中..." : "手入力データを登録"}
        </button>
        {message ? <p className="text-sm text-leaf">{message}</p> : null}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </div>
    </form>
  );
}

