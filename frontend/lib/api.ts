import { backendBaseUrl } from "@/lib/config";
import type { LatestStatus, ManualRecord, SensorRecord } from "@/types/api";

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${backendBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export function getHealth() {
  return requestJson<{ status: string; app_name: string }>("/health");
}

export function getLatestStatus() {
  return requestJson<LatestStatus>("/latest-status");
}

export function getTemperatureSeries(limit = 48) {
  return requestJson<SensorRecord[]>(
    `/sensor-records?sensor_type=temperature&limit=${limit}`,
  );
}

export function getSensorSeries(sensorType: string, limit = 48, source?: string) {
  const searchParams = new URLSearchParams({
    sensor_type: sensorType,
    limit: String(limit),
  });

  if (source) {
    searchParams.set("source", source);
  }

  return requestJson<SensorRecord[]>(`/sensor-records?${searchParams.toString()}`);
}

export function getManualRecords(limit = 10) {
  return requestJson<ManualRecord[]>(`/manual-records?limit=${limit}`);
}

export function createManualRecord(payload: Omit<ManualRecord, "id">) {
  return requestJson<ManualRecord>("/manual-records", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createSensorRecord(payload: Omit<SensorRecord, "id">) {
  return requestJson<SensorRecord>("/sensor-records", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getSensorExportUrl(params: {
  sensorType?: string;
  startAt?: string;
  endAt?: string;
}) {
  const searchParams = new URLSearchParams();

  if (params.sensorType) {
    searchParams.set("sensor_type", params.sensorType);
  }
  if (params.startAt) {
    searchParams.set("start_at", new Date(params.startAt).toISOString());
  }
  if (params.endAt) {
    searchParams.set("end_at", new Date(params.endAt).toISOString());
  }

  const query = searchParams.toString();
  return `${backendBaseUrl}/export/sensor-records.csv${query ? `?${query}` : ""}`;
}
