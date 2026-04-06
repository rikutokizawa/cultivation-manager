from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict, Field


class SensorRecordBase(BaseModel):
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
    sensor_type: str
    sensor_id: str
    location: str
    value: float
    unit: str
    source: str
    note: str | None = None


class SensorRecordCreate(SensorRecordBase):
    pass


class SensorRecordRead(SensorRecordBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

