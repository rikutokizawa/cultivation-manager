from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.app.core.config import get_settings
from backend.app.db.session import get_db
from backend.app.models.image_record import ImageRecord
from backend.app.models.manual_record import ManualRecord
from backend.app.models.sensor_record import SensorRecord
from backend.app.schemas.dashboard_summary import DashboardSummaryResponse

router = APIRouter()


@router.get("/dashboard/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(db: Session = Depends(get_db)) -> DashboardSummaryResponse:
    settings = get_settings()

    sensor_record_count = db.scalar(select(func.count(SensorRecord.id))) or 0
    image_record_count = db.scalar(select(func.count(ImageRecord.id))) or 0
    manual_record_count = db.scalar(select(func.count(ManualRecord.id))) or 0
    latest_sensor_at = db.scalar(select(func.max(SensorRecord.timestamp)))
    latest_image_at = db.scalar(select(func.max(ImageRecord.timestamp)))
    latest_manual_at = db.scalar(select(func.max(ManualRecord.timestamp)))

    return DashboardSummaryResponse(
        sensor_record_count=sensor_record_count,
        image_record_count=image_record_count,
        manual_record_count=manual_record_count,
        latest_sensor_at=latest_sensor_at,
        latest_image_at=latest_image_at,
        latest_manual_at=latest_manual_at,
        configured_sensor_source=settings.sensor_source_type,
        configured_camera_source=settings.camera_source_type,
    )

