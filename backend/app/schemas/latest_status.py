from datetime import datetime

from pydantic import BaseModel, ConfigDict

from backend.app.schemas.image_record import ImageRecordRead


class LatestMetricReading(BaseModel):
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


class ConnectionStatus(BaseModel):
    overall_status: str
    checked_at: datetime
    source: str
    detail: str


class LatestStatusResponse(BaseModel):
    latest_temperature: LatestMetricReading | None
    latest_humidity: LatestMetricReading | None
    latest_co2: LatestMetricReading | None
    latest_tank_level: LatestMetricReading | None
    connection_status: ConnectionStatus
    latest_images: list[ImageRecordRead]
