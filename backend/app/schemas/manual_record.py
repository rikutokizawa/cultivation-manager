from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict, Field


class ManualRecordBase(BaseModel):
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
    item_type: str
    location: str
    value: float
    unit: str
    input_by: str
    note: str | None = None


class ManualRecordCreate(ManualRecordBase):
    pass


class ManualRecordRead(ManualRecordBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

