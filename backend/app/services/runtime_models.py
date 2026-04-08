from dataclasses import dataclass
from datetime import datetime


@dataclass(slots=True)
class CollectedSensorReading:
    timestamp: datetime
    sensor_type: str
    sensor_id: str
    location: str
    value: float
    unit: str
    source: str
    note: str | None = None


@dataclass(slots=True)
class CapturedImage:
    timestamp: datetime
    camera_id: str
    location: str
    file_path: str
    note: str | None = None

