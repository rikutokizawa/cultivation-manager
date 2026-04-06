from datetime import datetime

from pydantic import BaseModel, ConfigDict

from backend.app.schemas.image_record import ImageRecordRead


class LatestTemperature(BaseModel):
    id: int
    timestamp: datetime
    sensor_type: str
    sensor_id: str
    location: str
    value: float
    unit: str
    source: str
    note: str | None = None

    model_config = ConfigDict(from_attributes=True)


class LatestStatusResponse(BaseModel):
    latest_temperature: LatestTemperature | None
    latest_images: list[ImageRecordRead]
