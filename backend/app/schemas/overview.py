from datetime import datetime

from pydantic import BaseModel

from backend.app.schemas.image_record import ImageRecordRead


class OverviewReading(BaseModel):
    sensor_type: str
    sensor_id: str
    value: float
    unit: str
    timestamp: datetime


class OverviewDevice(BaseModel):
    device_id: str
    name: str
    location: str
    readings: list[OverviewReading]


class OverviewStatus(BaseModel):
    state: str
    checked_at: datetime
    last_sensor_at: datetime | None
    detail: str


class OverviewResponse(BaseModel):
    devices: list[OverviewDevice]
    latest_images: list[ImageRecordRead]
    status: OverviewStatus
