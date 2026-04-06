from datetime import UTC, datetime
from pathlib import Path

from pydantic import BaseModel, ConfigDict, computed_field

from backend.app.core.config import get_settings


class ImageRecordRead(BaseModel):
    id: int
    timestamp: datetime
    camera_id: str
    location: str
    file_path: str
    note: str | None = None

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def public_url(self) -> str:
        settings = get_settings()
        filename = Path(self.file_path).name
        return f"{settings.backend_base_url}/images/{filename}"

