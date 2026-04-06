from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Cultivation Manager"
    database_url: str = "sqlite:///./storage/cultivation.db"
    image_storage_path: str = "storage/images"
    export_storage_path: str = "storage/exports"
    backend_base_url: str = "http://localhost:8000"
    frontend_port: int = 3000
    backend_port: int = 8000

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

    def ensure_directories(self) -> None:
        self.resolved_image_storage_path.mkdir(parents=True, exist_ok=True)
        self.resolved_export_storage_path.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    return Settings()

