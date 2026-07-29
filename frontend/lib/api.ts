import { backendBaseUrl } from "@/lib/config";
import type {
  Overview,
  SensorRecord,
  TrzImportResponse,
} from "@/types/api";

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

export function getOverview() {
  return requestJson<Overview>("/overview");
}

export function getSensorSeries(
  sensorType: string,
  params?: {
    sensorId?: string;
    startAt?: string;
    endAt?: string;
    limit?: number;
  },
) {
  const searchParams = new URLSearchParams({
    sensor_type: sensorType,
    limit: String(params?.limit ?? 5000),
  });

  if (params?.sensorId) {
    searchParams.set("sensor_id", params.sensorId);
  }
  if (params?.startAt) {
    searchParams.set("start_at", params.startAt);
  }
  if (params?.endAt) {
    searchParams.set("end_at", params.endAt);
  }
  return requestJson<SensorRecord[]>(`/sensor-records?${searchParams.toString()}`);
}

export async function importTrzFiles(files: File[]) {
  const body = new FormData();
  files.forEach((file) => body.append("files", file));
  const response = await fetch(`${backendBaseUrl}/import-trz`, {
    method: "POST",
    body,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(payload?.detail ?? `TRZ import failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as TrzImportResponse;
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
