import { compareBackendTimestamps } from "@/lib/datetime";
import type { SensorRecord } from "@/types/api";

export type OndotoriMetricKey = "temperature" | "humidity" | "co2";
export type DeviceLabels = Record<string, string[]>;

export type OndotoriMetricConfig = {
  key: OndotoriMetricKey;
  label: string;
  unit: string;
  digits: number;
  color: string;
};

export const ondotoriSource = "ondotori-current";
export const ondotoriLabelStorageKey = "cultivation-manager:ondotori-device-labels";
export const ondotoriMetrics: OndotoriMetricConfig[] = [
  { key: "temperature", label: "温度", unit: "C", digits: 1, color: "#c8def5" },
  { key: "humidity", label: "湿度", unit: "%", digits: 1, color: "#abcdf1" },
  { key: "co2", label: "CO2", unit: "ppm", digits: 0, color: "#f8c471" },
];

export function deviceKeyFromRecord(record: SensorRecord) {
  return record.sensor_id.split("-ch")[0] || record.location;
}

export function parseLabelInput(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,\n、]/)
        .map((label) => label.trim())
        .filter(Boolean),
    ),
  );
}

export function formatLabelInput(labels: string[] | undefined) {
  return labels?.join(", ") ?? "";
}

export function formatDeviceLabelPrefix(labels: string[] | undefined) {
  return labels && labels.length > 0 ? `${labels.join(" / ")} / ` : "";
}

export function normalizeStoredLabels(payload: unknown): DeviceLabels {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(payload as Record<string, unknown>).map(([deviceKey, value]) => {
      if (Array.isArray(value)) {
        return [deviceKey, value.map(String).map((label) => label.trim()).filter(Boolean)];
      }
      if (typeof value === "string") {
        return [deviceKey, parseLabelInput(value)];
      }
      return [deviceKey, []];
    }),
  );
}

export function latestRecord(records: SensorRecord[]) {
  return records.reduce<SensorRecord | undefined>((latest, record) => {
    if (
      !latest ||
      compareBackendTimestamps(record.timestamp, latest.timestamp) > 0 ||
      (record.timestamp === latest.timestamp && record.id > latest.id)
    ) {
      return record;
    }

    return latest;
  }, undefined);
}

export function formatMetricValue(
  value: number | undefined,
  unit: string | undefined,
  digits: number,
) {
  if (value === undefined || !unit) {
    return "--";
  }

  return `${value.toFixed(digits)} ${unit}`;
}
