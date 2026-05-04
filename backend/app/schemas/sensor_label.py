from pydantic import BaseModel, Field, field_validator


class SensorLabelThreshold(BaseModel):
    sensor_type: str
    warning_min: float | None = None
    warning_max: float | None = None
    critical_min: float | None = None
    critical_max: float | None = None

    @field_validator("sensor_type")
    @classmethod
    def strip_sensor_type(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("sensor_type is required.")
        return stripped


class SensorLabelCreate(BaseModel):
    name: str = Field(max_length=80)
    color: str = "#9fd8cb"
    display_order: int = 0
    thresholds: list[SensorLabelThreshold] = Field(default_factory=list)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("name is required.")
        return stripped

    @field_validator("color")
    @classmethod
    def strip_color(cls, value: str) -> str:
        stripped = value.strip()
        return stripped or "#9fd8cb"


class SensorLabelUpdate(SensorLabelCreate):
    pass


class SensorLabelRead(BaseModel):
    id: int
    name: str
    color: str
    display_order: int
    thresholds: list[SensorLabelThreshold]
