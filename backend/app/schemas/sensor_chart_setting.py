from pydantic import BaseModel, field_validator, model_validator


class SensorChartSettingUpdate(BaseModel):
    sensor_type: str
    y_axis_min: float | None = None
    y_axis_max: float | None = None

    @field_validator("sensor_type")
    @classmethod
    def strip_sensor_type(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("sensor_type is required.")
        return stripped

    @model_validator(mode="after")
    def validate_axis_range(self) -> "SensorChartSettingUpdate":
        if self.y_axis_min is not None and self.y_axis_max is not None and self.y_axis_min >= self.y_axis_max:
            raise ValueError("y_axis_min must be less than y_axis_max.")
        return self


class SensorChartSettingRead(BaseModel):
    id: int | None
    sensor_type: str
    y_axis_min: float | None = None
    y_axis_max: float | None = None
