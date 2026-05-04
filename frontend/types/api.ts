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

export type SensorSetting = {
  id: number | null;
  sensor_key: string;
  sensor_type: string;
  sensor_id: string;
  source: string;
  location: string;
  unit: string;
  display_name: string | null;
  effective_name: string;
  labels: string[];
  is_visible: boolean;
  display_order: number;
  latest_timestamp: string | null;
  latest_value: number | null;
  latest_unit: string | null;
};

export type SensorSettingUpdate = {
  display_name: string | null;
  labels: string[];
  is_visible: boolean;
  display_order: number;
};

export type SensorLabelThreshold = {
  sensor_type: string;
  warning_min: number | null;
  warning_max: number | null;
  critical_min: number | null;
  critical_max: number | null;
};

export type SensorLabel = {
  id: number;
  name: string;
  color: string;
  display_order: number;
  thresholds: SensorLabelThreshold[];
};

export type SensorLabelInput = {
  name: string;
  color: string;
  display_order: number;
  thresholds: SensorLabelThreshold[];
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
  latest_humidity: SensorRecord | null;
  latest_co2: SensorRecord | null;
  latest_tank_level: SensorRecord | null;
  connection_status: {
    overall_status: string;
    checked_at: string;
    source: string;
    detail: string;
  };
  latest_images: ImageRecord[];
};
