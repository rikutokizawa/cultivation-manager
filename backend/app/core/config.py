from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Cultivation Manager"
    database_url: str = "sqlite:///./storage/cultivation.db"
    image_storage_path: str = "storage/images"
    export_storage_path: str = "storage/exports"
    incoming_image_path: str = "storage/incoming"
    sensor_input_json_path: str = "storage/runtime/sensor_readings.json"
    backend_base_url: str = "http://localhost:8000"
    frontend_port: int = 3000
    backend_port: int = 8000
    sensor_source_type: str = "dummy"
    camera_source_type: str = "dummy"
    sensor_command: str = ""
    sensor_command_timeout_seconds: int = 30
    ondotori_api_key: str = ""
    ondotori_login_id: str = ""
    ondotori_login_pass: str = ""
    ondotori_api_url: str = "https://api.webstorage.jp:443/v1/devices/current"
    ondotori_remote_serials_csv: str = ""
    ondotori_base_serials_csv: str = ""
    ondotori_timeout_seconds: int = 30
    ds18b20_device_glob: str = "/sys/bus/w1/devices/28-*/w1_slave"
    ds18b20_location_prefix: str = "water-probe"
    camera_command: str = ""
    camera_command_timeout_seconds: int = 30
    camera_capture_timeout_ms: int = 1000
    camera_capture_width: int = 1280
    camera_capture_height: int = 720
    camera_extra_args: str = ""
    sensor_poll_interval_seconds: int = 300
    image_capture_interval_seconds: int = 900
    camera_ids_csv: str = "camera-01,camera-02"
    runtime_log_level: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[3] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    @property
    def project_root(self) -> Path:
        return Path(__file__).resolve().parents[3]

    @property
    def resolved_database_url(self) -> str:
        prefix = "sqlite:///./"
        if self.database_url.startswith(prefix):
            relative_path = self.database_url.removeprefix(prefix)
            return f"sqlite:///{(self.project_root / relative_path).resolve()}"
        return self.database_url

    @property
    def resolved_image_storage_path(self) -> Path:
        return (self.project_root / self.image_storage_path).resolve()

    @property
    def resolved_export_storage_path(self) -> Path:
        return (self.project_root / self.export_storage_path).resolve()

    @property
    def resolved_incoming_image_path(self) -> Path:
        return (self.project_root / self.incoming_image_path).resolve()

    @property
    def resolved_sensor_input_json_path(self) -> Path:
        return (self.project_root / self.sensor_input_json_path).resolve()

    @property
    def camera_ids(self) -> list[str]:
        return [camera_id.strip() for camera_id in self.camera_ids_csv.split(",") if camera_id.strip()]

    @property
    def ondotori_remote_serials(self) -> list[str]:
        return [serial.strip() for serial in self.ondotori_remote_serials_csv.split(",") if serial.strip()]

    @property
    def ondotori_base_serials(self) -> list[str]:
        return [serial.strip() for serial in self.ondotori_base_serials_csv.split(",") if serial.strip()]

    def ensure_directories(self) -> None:
        self.resolved_image_storage_path.mkdir(parents=True, exist_ok=True)
        self.resolved_export_storage_path.mkdir(parents=True, exist_ok=True)
        self.resolved_incoming_image_path.mkdir(parents=True, exist_ok=True)
        self.resolved_sensor_input_json_path.parent.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    return Settings()
