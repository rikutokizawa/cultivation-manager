from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.image_record import ImageRecord
from backend.app.models.sensor_record import SensorRecord
from backend.app.schemas.image_record import ImageRecordRead
from backend.app.schemas.latest_status import ConnectionStatus, LatestMetricReading, LatestStatusResponse

router = APIRouter()


def get_latest_metric(db: Session, sensor_type: str) -> SensorRecord | None:
    return db.scalar(
        select(SensorRecord)
        .filter(SensorRecord.sensor_type == sensor_type)
        .order_by(SensorRecord.timestamp.desc())
        .limit(1)
    )


@router.get("/latest-status", response_model=LatestStatusResponse)
def latest_status(db: Session = Depends(get_db)) -> LatestStatusResponse:
    latest_temperature = get_latest_metric(db, "temperature")
    latest_humidity = get_latest_metric(db, "humidity")
    latest_co2 = get_latest_metric(db, "co2")
    latest_tank_level = get_latest_metric(db, "tank_level")
    latest_images = list(
        db.scalars(select(ImageRecord).order_by(ImageRecord.timestamp.desc()).limit(2)).all()
    )

    return LatestStatusResponse(
        latest_temperature=LatestMetricReading.model_validate(latest_temperature) if latest_temperature else None,
        latest_humidity=LatestMetricReading.model_validate(latest_humidity) if latest_humidity else None,
        latest_co2=LatestMetricReading.model_validate(latest_co2) if latest_co2 else None,
        latest_tank_level=LatestMetricReading.model_validate(latest_tank_level) if latest_tank_level else None,
        connection_status=ConnectionStatus(
            overall_status="online",
            checked_at=datetime.now(UTC),
            source="local-simulator",
            detail="API, sensor simulator, image storage are reachable in local development mode.",
        ),
        latest_images=[ImageRecordRead.model_validate(image) for image in latest_images],
    )
