import type { SensorRecord } from "@/types/api";

export type SensorMetricConfig = {
  key: string;
  label: string;
  color: string;
};

const metricLabels: Record<string, string> = {
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
];

export function sensorKeyFromRecord(record: SensorRecord) {
  const source =
    record.source === "ondotori-current" || record.source === "ondotori-trz"
      ? "ondotori"
      : record.source;
  return `${source}:${record.sensor_type}:${record.sensor_id}`;
}

export function metricConfigForType(
  sensorType: string,
  index = 0,
): SensorMetricConfig {
  return {
    key: sensorType,
    label: metricLabels[sensorType] ?? sensorType,
    color: metricColors[index % metricColors.length],
  };
}

function digitsForUnit(unit: string | undefined | null) {
  const normalized = unit?.trim().toLowerCase();
  if (normalized === "ppm" || normalized === "%") {
    return 0;
  }
  if (normalized === "ph") {
    return 2;
  }
  return 1;
}

export function formatMetricValue(
  value: number | undefined | null,
  unit: string | undefined | null,
) {
  if (value === undefined || value === null || !unit) {
    return "—";
  }
  return `${value.toFixed(digitsForUnit(unit))} ${unit}`;
}

export function compareSensorTypes(a: string, b: string) {
  const order = ["temperature", "humidity", "co2", "tank_level", "ph", "ec"];
  const aIndex = order.indexOf(a);
  const bIndex = order.indexOf(b);
  return (
    (aIndex === -1 ? 1000 : aIndex) - (bIndex === -1 ? 1000 : bIndex) ||
    a.localeCompare(b, "ja")
  );
}
