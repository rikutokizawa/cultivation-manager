from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends

from backend.app.db.session import get_db
from backend.app.models.image_record import ImageRecord
from backend.app.models.sensor_record import SensorRecord
from backend.app.schemas.image_record import ImageRecordRead
from backend.app.schemas.latest_status import LatestStatusResponse, LatestTemperature

router = APIRouter()


@router.get("/latest-status", response_model=LatestStatusResponse)
def latest_status(db: Session = Depends(get_db)) -> LatestStatusResponse:
    latest_temperature = db.scalar(
        select(SensorRecord)
        .filter(SensorRecord.sensor_type == "temperature")
        .order_by(SensorRecord.timestamp.desc())
        .limit(1)
    )
    latest_images = list(
        db.scalars(select(ImageRecord).order_by(ImageRecord.timestamp.desc()).limit(2)).all()
    )

    return LatestStatusResponse(
        latest_temperature=LatestTemperature.model_validate(latest_temperature) if latest_temperature else None,
        latest_images=[ImageRecordRead.model_validate(image) for image in latest_images],
    )

