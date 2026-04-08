from datetime import datetime

from pydantic import BaseModel


class DashboardSummaryResponse(BaseModel):
    sensor_record_count: int
    image_record_count: int
    manual_record_count: int
    latest_sensor_at: datetime | None
    latest_image_at: datetime | None
    latest_manual_at: datetime | None
    configured_sensor_source: str
    configured_camera_source: str

