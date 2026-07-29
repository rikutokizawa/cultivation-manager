from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.image_record import ImageRecord
from backend.app.models.sensor_record import SensorRecord
from backend.app.schemas.image_record import ImageRecordRead
from backend.app.schemas.overview import (
    OverviewDevice,
    OverviewReading,
    OverviewResponse,
    OverviewStatus,
)

router = APIRouter()

WARNING_AFTER_SECONDS = 15 * 60
STALE_AFTER_SECONDS = 30 * 60


def _device_id(sensor_id: str) -> str:
    return sensor_id.rsplit("-ch", maxsplit=1)[0]


def _device_name(location: str, fallback: str) -> str:
    return location.split("/")[-1].strip() or fallback


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _query_latest_sensor_records(
    db: Session,
    sources: tuple[str, ...] | None,
) -> list[SensorRecord]:
    row_number = func.row_number().over(
        partition_by=(SensorRecord.sensor_type, SensorRecord.sensor_id),
        order_by=(SensorRecord.timestamp.desc(), SensorRecord.id.desc()),
    ).label("row_number")
    ranked_query = select(SensorRecord.id, row_number)
    if sources:
        ranked_query = ranked_query.where(SensorRecord.source.in_(sources))
    ranked = ranked_query.subquery()
    statement = (
        select(SensorRecord)
        .join(ranked, SensorRecord.id == ranked.c.id)
        .where(ranked.c.row_number == 1)
        .order_by(SensorRecord.location.asc(), SensorRecord.sensor_type.asc())
    )
    return list(db.scalars(statement).all())


def _latest_sensor_records(db: Session) -> list[SensorRecord]:
    records = _query_latest_sensor_records(
        db,
        ("ondotori-current", "ondotori-trz"),
    )
    return records or _query_latest_sensor_records(db, None)


def _latest_camera_images(db: Session) -> list[ImageRecord]:
    row_number = func.row_number().over(
        partition_by=ImageRecord.camera_id,
        order_by=(ImageRecord.timestamp.desc(), ImageRecord.id.desc()),
    ).label("row_number")
    ranked = select(ImageRecord.id, row_number).subquery()
    statement = (
        select(ImageRecord)
        .join(ranked, ImageRecord.id == ranked.c.id)
        .where(ranked.c.row_number == 1)
        .order_by(ImageRecord.camera_id.asc())
        .limit(2)
    )
    return list(db.scalars(statement).all())


@router.get("/overview", response_model=OverviewResponse)
def get_overview(db: Session = Depends(get_db)) -> OverviewResponse:
    records = _latest_sensor_records(db)
    images = _latest_camera_images(db)
    devices: dict[str, OverviewDevice] = {}

    for record in records:
        device_id = _device_id(record.sensor_id)
        device = devices.setdefault(
            device_id,
            OverviewDevice(
                device_id=device_id,
                name=_device_name(record.location, device_id),
                location=record.location,
                readings=[],
            ),
        )
        device.readings.append(
            OverviewReading(
                sensor_type=record.sensor_type,
                sensor_id=record.sensor_id,
                value=record.value,
                unit=record.unit,
                timestamp=_as_utc(record.timestamp),
            )
        )

    latest_sensor_at = max((record.timestamp for record in records), default=None)
    latest_sensor_at_utc = _as_utc(latest_sensor_at) if latest_sensor_at is not None else None
    stale_after = timedelta(seconds=STALE_AFTER_SECONDS)
    is_online = (
        latest_sensor_at_utc is not None
        and datetime.now(UTC) - latest_sensor_at_utc <= stale_after
    )

    return OverviewResponse(
        devices=sorted(devices.values(), key=lambda device: (device.name, device.device_id)),
        latest_images=[ImageRecordRead.model_validate(image) for image in images],
        status=OverviewStatus(
            state="online" if is_online else "stale",
            checked_at=datetime.now(UTC),
            last_sensor_at=latest_sensor_at_utc,
            warning_after_seconds=WARNING_AFTER_SECONDS,
            stale_after_seconds=STALE_AFTER_SECONDS,
            detail=(
                "おんどとりのデータを正常に取得しています。"
                if is_online
                else "最新のセンサーデータがありません、または更新が止まっています。"
            ),
        ),
    )
