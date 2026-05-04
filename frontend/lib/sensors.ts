import { compareBackendTimestamps } from "@/lib/datetime";
import type { SensorLabel, SensorLabelThreshold, SensorRecord, SensorSetting } from "@/types/api";

export type SensorMetricConfig = {
  key: string;
  label: string;
  unit: string;
  digits: number;
  color: string;
};

export const fallbackSensorTypes = ["temperature", "humidity", "co2", "tank_level"];

const defaultMetricLabels: Record<string, string> = {
  temperature: "温度",
  humidity: "湿度",
  co2: "CO2",
  tank_level: "水位",
  ph: "pH",
  ec: "EC",
};

const metricColors = [
  "#c8def5",
  "#9fd8cb",
  "#f8c471",
  "#d7b7ff",
  "#f4a7a1",
  "#a7d8ff",
  "#d8f28a",
  "#f0b7d8",
];

export function sensorKeyFromParts(source: string, sensorType: string, sensorId: string) {
  return `${source}:${sensorType}:${sensorId}`;
}

export function sensorKeyFromRecord(record: SensorRecord) {
  return sensorKeyFromParts(record.source, record.sensor_type, record.sensor_id);
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

export function formatLabelPrefix(labels: string[] | undefined) {
  return labels && labels.length > 0 ? `${labels.join(" / ")} / ` : "";
}

export function sensorDisplayName(setting: SensorSetting) {
  return setting.display_name || setting.effective_name || setting.sensor_id;
}

export function compareSensorSettings(a: SensorSetting, b: SensorSetting) {
  return (
    a.display_order - b.display_order ||
    Number(!a.is_visible) - Number(!b.is_visible) ||
    sensorDisplayName(a).localeCompare(sensorDisplayName(b), "ja") ||
    a.sensor_type.localeCompare(b.sensor_type, "ja") ||
    a.sensor_id.localeCompare(b.sensor_id, "ja")
  );
}

export function visibleSensorSettings(settings: SensorSetting[]) {
  return [...settings].filter((setting) => setting.is_visible).sort(compareSensorSettings);
}

export function sensorTypesForSettings(settings: SensorSetting[]) {
  const visibleTypes = Array.from(
    new Set(visibleSensorSettings(settings).map((setting) => setting.sensor_type)),
  );
  if (visibleTypes.length > 0) {
    return visibleTypes;
  }
  return settings.length === 0 ? fallbackSensorTypes : [];
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

export function latestRecordsBySensor(recordsByType: Record<string, SensorRecord[]>) {
  const latestBySensor = new Map<string, SensorRecord>();

  for (const records of Object.values(recordsByType)) {
    for (const record of records) {
      const key = sensorKeyFromRecord(record);
      const current = latestBySensor.get(key);
      if (
        !current ||
        compareBackendTimestamps(record.timestamp, current.timestamp) > 0 ||
        (record.timestamp === current.timestamp && record.id > current.id)
      ) {
        latestBySensor.set(key, record);
      }
    }
  }

  return latestBySensor;
}

function digitsForUnit(unit: string | undefined) {
  const normalized = unit?.trim().toLowerCase();
  if (normalized === "ppm" || normalized === "%") {
    return 0;
  }
  if (normalized === "ph") {
    return 2;
  }
  return 1;
}

export function metricConfigForType(
  sensorType: string,
  settings: SensorSetting[] = [],
  index = 0,
): SensorMetricConfig {
  const matchingSetting = settings.find((setting) => setting.sensor_type === sensorType);
  const unit = matchingSetting?.unit || matchingSetting?.latest_unit || "";

  return {
    key: sensorType,
    label: defaultMetricLabels[sensorType] ?? sensorType,
    unit,
    digits: digitsForUnit(unit),
    color: metricColors[index % metricColors.length],
  };
}

export function metricConfigsForSettings(settings: SensorSetting[]) {
  return sensorTypesForSettings(settings).map((sensorType, index) =>
    metricConfigForType(sensorType, settings, index),
  );
}

export function formatMetricValue(
  value: number | undefined | null,
  unit: string | undefined | null,
  digits = digitsForUnit(unit ?? undefined),
) {
  if (value === undefined || value === null || !unit) {
    return "--";
  }

  return `${value.toFixed(digits)} ${unit}`;
}

export function labelsForSetting(setting: SensorSetting) {
  return setting.labels.length > 0 ? setting.labels : [];
}

export function labelsByName(labels: SensorLabel[]) {
  return new Map(labels.map((label) => [label.name, label]));
}

export type AlertLevel = "normal" | "warning" | "critical";

function thresholdLevel(value: number, threshold: SensorLabelThreshold): AlertLevel {
  if (
    (threshold.critical_min !== null && value < threshold.critical_min) ||
    (threshold.critical_max !== null && value > threshold.critical_max)
  ) {
    return "critical";
  }
  if (
    (threshold.warning_min !== null && value < threshold.warning_min) ||
    (threshold.warning_max !== null && value > threshold.warning_max)
  ) {
    return "warning";
  }
  return "normal";
}

export function alertLevelForLabels(
  labels: SensorLabel[],
  labelNames: string[],
  sensorType: string,
  value: number | undefined | null,
): AlertLevel {
  if (value === undefined || value === null) {
    return "normal";
  }

  let level: AlertLevel = "normal";
  const labelMap = labelsByName(labels);

  for (const labelName of labelNames) {
    const label = labelMap.get(labelName);
    const threshold = label?.thresholds.find((item) => item.sensor_type === sensorType);
    if (!threshold) {
      continue;
    }

    const nextLevel = thresholdLevel(value, threshold);
    if (nextLevel === "critical") {
      return "critical";
    }
    if (nextLevel === "warning") {
      level = "warning";
    }
  }

  return level;
}

export function alertTextClass(level: AlertLevel) {
  if (level === "critical") {
    return "text-[#ff8f73]";
  }
  if (level === "warning") {
    return "text-[#f8c471]";
  }
  return "text-white";
}

export function alertBorderClass(level: AlertLevel) {
  if (level === "critical") {
    return "border-[#fa6138]/55 bg-[#fa6138]/10";
  }
  if (level === "warning") {
    return "border-[#f8c471]/45 bg-[#f8c471]/10";
  }
  return "border-white/10 bg-white/[0.03]";
}
