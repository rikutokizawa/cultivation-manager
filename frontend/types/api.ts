export type SensorRecord = {
  id: number;
  timestamp: string;
  sensor_type: string;
  sensor_id: string;
  location: string;
  value: number;
  unit: string;
  source: string;
  note: string | null;
};

export type OverviewReading = {
  sensor_type: string;
  sensor_id: string;
  value: number;
  unit: string;
  timestamp: string;
};

export type OverviewDevice = {
  device_id: string;
  name: string;
  location: string;
  readings: OverviewReading[];
};

export type Overview = {
  devices: OverviewDevice[];
  latest_images: ImageRecord[];
  status: {
    state: "online" | "stale";
    checked_at: string;
    last_sensor_at: string | null;
    warning_after_seconds: number;
    stale_after_seconds: number;
    detail: string;
  };
};

export type ImageRecord = {
  id: number;
  timestamp: string;
  camera_id: string;
  location: string;
  file_path: string;
  note: string | null;
  public_url: string;
};

export type TrzImportResponse = {
  files: {
    filename: string;
    parsed_count: number;
    inserted_count: number;
    skipped_duplicate_count: number;
    skipped_invalid_count: number;
    devices: string[];
    started_at: string | null;
    ended_at: string | null;
  }[];
  inserted_count: number;
  skipped_duplicate_count: number;
  skipped_invalid_count: number;
};
