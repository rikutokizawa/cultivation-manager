"use client";

import { useMemo, useState } from "react";

import {
  createSensorLabel,
  deleteSensorLabel,
  updateSensorChartSetting,
  updateSensorLabel,
  updateSensorSetting,
} from "@/lib/api";
import { formatJapanDateTime } from "@/lib/datetime";
import {
  compareSensorSettings,
  formatMetricValue,
  metricConfigForType,
  sensorDisplayName,
} from "@/lib/sensors";
import type {
  SensorChartSetting,
  SensorChartSettingInput,
  SensorLabel,
  SensorLabelInput,
  SensorLabelThreshold,
  SensorSetting,
  SensorSettingUpdate,
} from "@/types/api";

type SensorSettingsPanelProps = {
  initialSettings: SensorSetting[];
  initialLabels: SensorLabel[];
  initialChartSettings: SensorChartSetting[];
};

type DraftSensorSetting = SensorSetting;
type DraftSensorChartSetting = SensorChartSetting;
type DraftSensorLabel = SensorLabel & {
  isNew?: boolean;
};

const emptyThreshold = (sensorType = "temperature"): SensorLabelThreshold => ({
  sensor_type: sensorType,
  warning_min: null,
  warning_max: null,
  critical_min: null,
  critical_max: null,
});

const newLabel = (): DraftSensorLabel => ({
  id: -Date.now(),
  name: "",
  color: "#9fd8cb",
  display_order: 0,
  thresholds: [emptyThreshold()],
  isNew: true,
});

function toPayload(setting: DraftSensorSetting): SensorSettingUpdate {
  return {
    display_name: setting.display_name?.trim() || null,
    labels: setting.labels,
    is_visible: setting.is_visible,
    display_order: Number(setting.display_order) || 0,
  };
}

function labelToPayload(label: DraftSensorLabel): SensorLabelInput {
  return {
    name: label.name.trim(),
    color: label.color.trim() || "#9fd8cb",
    display_order: Number(label.display_order) || 0,
    thresholds: label.thresholds
      .map((threshold) => ({
        ...threshold,
        sensor_type: threshold.sensor_type.trim(),
      }))
      .filter((threshold) => threshold.sensor_type),
  };
}

function chartSettingToPayload(setting: DraftSensorChartSetting): SensorChartSettingInput {
  return {
    sensor_type: setting.sensor_type,
    y_axis_min: setting.y_axis_min,
    y_axis_max: setting.y_axis_max,
  };
}

function numberOrNull(value: string) {
  return value === "" ? null : Number(value);
}

function thresholdValue(value: number | null) {
  return value === null ? "" : String(value);
}

export function SensorSettingsPanel({
  initialSettings,
  initialLabels,
  initialChartSettings,
}: SensorSettingsPanelProps) {
  const [settings, setSettings] = useState<DraftSensorSetting[]>(() =>
    [...initialSettings].sort(compareSensorSettings),
  );
  const [chartSettings, setChartSettings] = useState<DraftSensorChartSetting[]>(() => [
    ...initialChartSettings,
  ]);
  const [labels, setLabels] = useState<DraftSensorLabel[]>(() =>
    [...initialLabels].sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name, "ja")),
  );
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savingChartType, setSavingChartType] = useState<string | null>(null);
  const [savingLabelId, setSavingLabelId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleCount = useMemo(
    () => settings.filter((setting) => setting.is_visible).length,
    [settings],
  );
  const sensorTypes = useMemo(
    () =>
      Array.from(
        new Set([
          ...settings.map((setting) => setting.sensor_type),
          ...chartSettings.map((setting) => setting.sensor_type),
        ]),
      ).sort(),
    [chartSettings, settings],
  );
  const chartSettingsByType = useMemo(
    () => new Map(chartSettings.map((setting) => [setting.sensor_type, setting])),
    [chartSettings],
  );
  const labelNames = useMemo(() => labels.map((label) => label.name).filter(Boolean), [labels]);

  function updateDraft(sensorKey: string, patch: Partial<DraftSensorSetting>) {
    setSettings((current) =>
      current.map((setting) =>
        setting.sensor_key === sensorKey ? { ...setting, ...patch } : setting,
      ),
    );
  }

  function updateLabelDraft(labelId: number, patch: Partial<DraftSensorLabel>) {
    setLabels((current) =>
      current.map((label) => (label.id === labelId ? { ...label, ...patch } : label)),
    );
  }

  function updateChartDraft(sensorType: string, patch: Partial<DraftSensorChartSetting>) {
    setChartSettings((current) => {
      const existing = current.find((setting) => setting.sensor_type === sensorType);
      if (!existing) {
        return [
          ...current,
          {
            id: null,
            sensor_type: sensorType,
            y_axis_min: null,
            y_axis_max: null,
            ...patch,
          },
        ];
      }
      return current.map((setting) =>
        setting.sensor_type === sensorType ? { ...setting, ...patch } : setting,
      );
    });
  }

  function updateThreshold(
    labelId: number,
    index: number,
    patch: Partial<SensorLabelThreshold>,
  ) {
    setLabels((current) =>
      current.map((label) => {
        if (label.id !== labelId) {
          return label;
        }
        return {
          ...label,
          thresholds: label.thresholds.map((threshold, thresholdIndex) =>
            thresholdIndex === index ? { ...threshold, ...patch } : threshold,
          ),
        };
      }),
    );
  }

  function toggleLabel(sensorKey: string, labelName: string, checked: boolean) {
    const setting = settings.find((item) => item.sensor_key === sensorKey);
    if (!setting) {
      return;
    }
    updateDraft(sensorKey, {
      labels: checked
        ? Array.from(new Set([...setting.labels, labelName]))
        : setting.labels.filter((label) => label !== labelName),
    });
  }

  async function saveOne(sensorKey: string) {
    const draft = settings.find((setting) => setting.sensor_key === sensorKey);
    if (!draft) {
      return;
    }

    setSavingKey(sensorKey);
    setMessage(null);
    setError(null);

    try {
      const saved = await updateSensorSetting(sensorKey, toPayload(draft));
      setSettings((current) =>
        current
          .map((setting) => (setting.sensor_key === sensorKey ? saved : setting))
          .sort(compareSensorSettings),
      );
      setMessage(`${sensorDisplayName(saved)} を保存しました`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存に失敗しました");
    } finally {
      setSavingKey(null);
    }
  }

  async function saveAllSensors() {
    setSavingKey("__all__");
    setMessage(null);
    setError(null);

    try {
      const savedSettings = await Promise.all(
        settings.map((setting) => updateSensorSetting(setting.sensor_key, toPayload(setting))),
      );
      setSettings(savedSettings.sort(compareSensorSettings));
      setMessage("センサー設定を保存しました");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存に失敗しました");
    } finally {
      setSavingKey(null);
    }
  }

  async function saveChartSetting(sensorType: string) {
    const draft =
      chartSettingsByType.get(sensorType) ??
      ({
        id: null,
        sensor_type: sensorType,
        y_axis_min: null,
        y_axis_max: null,
      } satisfies DraftSensorChartSetting);

    if (draft.y_axis_min !== null && draft.y_axis_max !== null && draft.y_axis_min >= draft.y_axis_max) {
      setError("グラフ下限は上限より小さくしてください");
      return;
    }

    setSavingChartType(sensorType);
    setMessage(null);
    setError(null);

    try {
      const saved = await updateSensorChartSetting(sensorType, chartSettingToPayload(draft));
      setChartSettings((current) => {
        const next = current.some((setting) => setting.sensor_type === sensorType)
          ? current.map((setting) => (setting.sensor_type === sensorType ? saved : setting))
          : [...current, saved];
        return next.sort((a, b) => a.sensor_type.localeCompare(b.sensor_type, "ja"));
      });
      setMessage(`${metricConfigForType(sensorType, settings).label} のグラフ範囲を保存しました`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "グラフ範囲の保存に失敗しました");
    } finally {
      setSavingChartType(null);
    }
  }

  async function saveLabel(labelId: number) {
    const draft = labels.find((label) => label.id === labelId);
    if (!draft) {
      return;
    }
    if (!draft.name.trim()) {
      setError("ラベル名を入力してください");
      return;
    }

    setSavingLabelId(labelId);
    setMessage(null);
    setError(null);

    try {
      const saved = draft.isNew
        ? await createSensorLabel(labelToPayload(draft))
        : await updateSensorLabel(draft.id, labelToPayload(draft));
      setLabels((current) =>
        current
          .map((label) => (label.id === labelId ? saved : label))
          .sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name, "ja")),
      );
      setMessage(`${saved.name} を保存しました`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "ラベル保存に失敗しました");
    } finally {
      setSavingLabelId(null);
    }
  }

  async function removeLabel(labelId: number) {
    const label = labels.find((item) => item.id === labelId);
    if (!label) {
      return;
    }

    setSavingLabelId(labelId);
    setMessage(null);
    setError(null);

    try {
      if (!label.isNew) {
        await deleteSensorLabel(label.id);
      }
      setLabels((current) => current.filter((item) => item.id !== labelId));
      setSettings((current) =>
        current.map((setting) => ({
          ...setting,
          labels: setting.labels.filter((name) => name !== label.name),
        })),
      );
      setMessage(`${label.name || "新規ラベル"} を削除しました`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "ラベル削除に失敗しました");
    } finally {
      setSavingLabelId(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="dashboard-card rounded-[8px] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="dashboard-section-title text-[24px]">設定</h1>
            <p className="mt-2 text-sm text-[#9cadbf]">
              {settings.length} センサー / 表示中 {visibleCount} / ラベル {labels.length}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {message ? <span className="text-sm text-[#9fd8cb]">{message}</span> : null}
            {error ? <span className="text-sm text-[#ffb39f]">{error}</span> : null}
            <button
              type="button"
              onClick={saveAllSensors}
              disabled={savingKey !== null || settings.length === 0}
              className="rounded-[8px] border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingKey === "__all__" ? "保存中..." : "センサーをすべて保存"}
            </button>
          </div>
        </div>
      </section>

      <section className="dashboard-card rounded-[8px] p-4">
        <div className="mb-4 border-b border-white/10 pb-4">
          <h2 className="dashboard-section-title text-[20px]">グラフ範囲</h2>
          <p className="mt-1 text-sm text-[#9cadbf]">
            モニター画面のグラフY軸の下限・上限を項目ごとに固定します。空欄の場合は自動調整です。
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sensorTypes.map((sensorType) => {
            const chartSetting =
              chartSettingsByType.get(sensorType) ??
              ({
                id: null,
                sensor_type: sensorType,
                y_axis_min: null,
                y_axis_max: null,
              } satisfies DraftSensorChartSetting);
            const metric = metricConfigForType(sensorType, settings);

            return (
              <article
                key={sensorType}
                className="grid gap-3 rounded-[8px] border border-white/10 bg-white/[0.03] p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{metric.label}</h3>
                    <p className="mt-1 text-xs text-[#9cadbf]">{metric.unit || sensorType}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => saveChartSetting(sensorType)}
                    disabled={savingChartType !== null}
                    className="rounded-[8px] border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingChartType === sensorType ? "保存中..." : "保存"}
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-[#d7e1eb]">
                    <span>下限</span>
                    <input
                      type="number"
                      step="0.1"
                      value={thresholdValue(chartSetting.y_axis_min)}
                      onChange={(event) =>
                        updateChartDraft(sensorType, { y_axis_min: numberOrNull(event.target.value) })
                      }
                      className="w-full rounded-[8px] border border-white/10 bg-[#1f2123] px-3 py-2 text-sm text-white outline-none placeholder:text-[#9cadbf]/60"
                      placeholder="自動"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-[#d7e1eb]">
                    <span>上限</span>
                    <input
                      type="number"
                      step="0.1"
                      value={thresholdValue(chartSetting.y_axis_max)}
                      onChange={(event) =>
                        updateChartDraft(sensorType, { y_axis_max: numberOrNull(event.target.value) })
                      }
                      className="w-full rounded-[8px] border border-white/10 bg-[#1f2123] px-3 py-2 text-sm text-white outline-none placeholder:text-[#9cadbf]/60"
                      placeholder="自動"
                    />
                  </label>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="dashboard-card rounded-[8px] p-4">
        <div className="mb-4 flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="dashboard-section-title text-[20px]">ラベル管理</h2>
            <p className="mt-1 text-sm text-[#9cadbf]">
              ラベルを作成し、項目別の warning / critical 閾値を設定します。
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLabels((current) => [newLabel(), ...current])}
            className="rounded-[8px] border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            ラベル追加
          </button>
        </div>

        <div className="grid gap-3">
          {labels.map((label) => (
            <article key={label.id} className="rounded-[8px] border border-white/10 bg-white/[0.03] p-3">
              <div className="grid gap-3 xl:grid-cols-[0.8fr_1.6fr_auto]">
                <div className="grid gap-3 sm:grid-cols-[1fr_0.56fr_0.56fr] xl:grid-cols-1">
                  <label className="space-y-2 text-sm font-medium text-[#d7e1eb]">
                    <span>ラベル名</span>
                    <input
                      value={label.name}
                      onChange={(event) => updateLabelDraft(label.id, { name: event.target.value })}
                      className="w-full rounded-[8px] border border-white/10 bg-[#1f2123] px-3 py-2 text-sm text-white outline-none"
                      placeholder="Aエリア"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-[#d7e1eb]">
                    <span>色</span>
                    <input
                      type="color"
                      value={label.color}
                      onChange={(event) => updateLabelDraft(label.id, { color: event.target.value })}
                      className="h-10 w-full rounded-[8px] border border-white/10 bg-[#1f2123] px-2 py-1"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-[#d7e1eb]">
                    <span>表示順</span>
                    <input
                      type="number"
                      value={label.display_order}
                      onChange={(event) =>
                        updateLabelDraft(label.id, { display_order: Number(event.target.value) })
                      }
                      className="w-full rounded-[8px] border border-white/10 bg-[#1f2123] px-3 py-2 text-sm text-white outline-none"
                    />
                  </label>
                </div>

                <div className="space-y-2">
                  {label.thresholds.map((threshold, index) => (
                    <div
                      key={`${label.id}-${index}`}
                      className="grid gap-2 rounded-[8px] border border-white/10 bg-[#1f2123] p-2 md:grid-cols-[0.9fr_repeat(4,0.7fr)_auto]"
                    >
                      <label className="space-y-1 text-xs text-[#9cadbf]">
                        <span>項目</span>
                        <select
                          value={threshold.sensor_type}
                          onChange={(event) =>
                            updateThreshold(label.id, index, { sensor_type: event.target.value })
                          }
                          className="w-full rounded-[8px] border border-white/10 bg-[#242628] px-2 py-2 text-sm text-white outline-none"
                        >
                          {sensorTypes.map((sensorType) => (
                            <option key={sensorType} value={sensorType}>
                              {metricConfigForType(sensorType, settings).label}
                            </option>
                          ))}
                        </select>
                      </label>
                      {(["warning_min", "warning_max", "critical_min", "critical_max"] as const).map((key) => (
                        <label key={key} className="space-y-1 text-xs text-[#9cadbf]">
                          <span>{key.replace("_", " ")}</span>
                          <input
                            type="number"
                            step="0.1"
                            value={thresholdValue(threshold[key])}
                            onChange={(event) =>
                              updateThreshold(label.id, index, { [key]: numberOrNull(event.target.value) })
                            }
                            className="w-full rounded-[8px] border border-white/10 bg-[#242628] px-2 py-2 text-sm text-white outline-none"
                          />
                        </label>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          updateLabelDraft(label.id, {
                            thresholds: label.thresholds.filter((_, itemIndex) => itemIndex !== index),
                          })
                        }
                        className="self-end rounded-[8px] border border-white/10 px-3 py-2 text-sm text-[#ffb39f]"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      updateLabelDraft(label.id, {
                        thresholds: [...label.thresholds, emptyThreshold(sensorTypes[0] ?? "temperature")],
                      })
                    }
                    className="rounded-[8px] border border-white/10 px-3 py-2 text-sm text-white"
                  >
                    閾値追加
                  </button>
                </div>

                <div className="flex gap-2 xl:flex-col xl:items-stretch">
                  <button
                    type="button"
                    onClick={() => saveLabel(label.id)}
                    disabled={savingLabelId !== null}
                    className="rounded-[8px] border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingLabelId === label.id ? "保存中..." : "保存"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeLabel(label.id)}
                    disabled={savingLabelId !== null}
                    className="rounded-[8px] border border-[#fa6138]/30 bg-[#fa6138]/10 px-4 py-2 text-sm font-semibold text-[#ffb39f] transition hover:bg-[#fa6138]/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    削除
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-3">
        {settings.map((setting) => (
          <article
            key={setting.sensor_key}
            className={`dashboard-card rounded-[8px] p-4 ${
              setting.is_visible ? "" : "opacity-70"
            }`}
          >
            <div className="grid gap-4 xl:grid-cols-[0.48fr_1fr_0.7fr]">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9cadbf]">
                      {metricConfigForType(setting.sensor_type, settings).label}
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-white">
                      {sensorDisplayName(setting)}
                    </h2>
                  </div>
                  <label className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-[#d7e1eb]">
                    <input
                      type="checkbox"
                      checked={setting.is_visible}
                      onChange={(event) =>
                        updateDraft(setting.sensor_key, { is_visible: event.target.checked })
                      }
                    />
                    表示
                  </label>
                </div>
                <div className="grid gap-1.5 text-xs text-[#9cadbf]">
                  <p>{setting.source}</p>
                  <p>{setting.sensor_id}</p>
                  <p>{setting.location}</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-[#d7e1eb]">
                  <span>表示名</span>
                  <input
                    value={setting.display_name ?? ""}
                    onChange={(event) =>
                      updateDraft(setting.sensor_key, { display_name: event.target.value })
                    }
                    placeholder={setting.effective_name}
                    className="w-full rounded-[8px] border border-white/10 bg-[#1f2123] px-3 py-2 text-sm text-white outline-none placeholder:text-[#9cadbf]/60"
                  />
                </label>
                <div className="space-y-2 text-sm font-medium text-[#d7e1eb]">
                  <span>ラベル</span>
                  <div className="flex min-h-10 flex-wrap gap-2 rounded-[8px] border border-white/10 bg-[#1f2123] px-3 py-2">
                    {labelNames.length > 0 ? (
                      labelNames.map((labelName) => (
                        <label key={labelName} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-[#d7e1eb]">
                          <input
                            type="checkbox"
                            checked={setting.labels.includes(labelName)}
                            onChange={(event) =>
                              toggleLabel(setting.sensor_key, labelName, event.target.checked)
                            }
                          />
                          {labelName}
                        </label>
                      ))
                    ) : (
                      <span className="text-sm text-[#9cadbf]">先にラベルを追加してください</span>
                    )}
                  </div>
                </div>
                <label className="space-y-2 text-sm font-medium text-[#d7e1eb]">
                  <span>表示順</span>
                  <input
                    type="number"
                    value={setting.display_order}
                    onChange={(event) =>
                      updateDraft(setting.sensor_key, {
                        display_order: Number(event.target.value),
                      })
                    }
                    className="w-full rounded-[8px] border border-white/10 bg-[#1f2123] px-3 py-2 text-sm text-white outline-none"
                  />
                </label>
                <div className="space-y-2 text-sm font-medium text-[#d7e1eb]">
                  <span>最新値</span>
                  <div className="rounded-[8px] border border-white/10 bg-white/[0.03] px-3 py-2">
                    <p className="font-semibold text-white">
                      {formatMetricValue(
                        setting.latest_value,
                        setting.latest_unit ?? setting.unit,
                      )}
                    </p>
                    <p className="mt-1 text-xs text-[#9cadbf]">
                      {formatJapanDateTime(setting.latest_timestamp ?? undefined, { seconds: true })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-end justify-end">
                <button
                  type="button"
                  onClick={() => saveOne(setting.sensor_key)}
                  disabled={savingKey !== null}
                  className="w-full rounded-[8px] border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50 xl:w-auto"
                >
                  {savingKey === setting.sensor_key ? "保存中..." : "保存"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
