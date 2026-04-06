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

export type ManualRecord = {
  id: number;
  timestamp: string;
  item_type: string;
  location: string;
  value: number;
  unit: string;
  input_by: string;
  note: string | null;
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

export type LatestStatus = {
  latest_temperature: SensorRecord | null;
  latest_images: ImageRecord[];
};

