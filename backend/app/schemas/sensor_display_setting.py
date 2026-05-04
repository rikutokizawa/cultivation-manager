from datetime import datetime

from pydantic import BaseModel, Field, field_validator


def normalize_labels(labels: list[str]) -> list[str]:
    normalized: list[str] = []
    seen: set[str] = set()

    for label in labels:
        stripped = str(label).strip()
        if not stripped or stripped in seen:
            continue
        normalized.append(stripped)
        seen.add(stripped)

    return normalized


class SensorDisplaySettingUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=120)
    labels: list[str] = Field(default_factory=list)
    is_visible: bool = True
    display_order: int = 0

    @field_validator("display_name")
    @classmethod
    def strip_display_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    @field_validator("labels")
    @classmethod
    def strip_labels(cls, value: list[str]) -> list[str]:
        return normalize_labels(value)


class SensorDisplaySettingRead(BaseModel):
    id: int | None
    sensor_key: str
    sensor_type: str
    sensor_id: str
    source: str
    location: str
    unit: str
    display_name: str | None
    effective_name: str
    labels: list[str]
    is_visible: bool
    display_order: int
    latest_timestamp: datetime | None = None
    latest_value: float | None = None
    latest_unit: str | None = None
