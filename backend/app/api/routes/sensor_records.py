from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.sensor_record import SensorRecord
from backend.app.schemas.sensor_record import SensorRecordCreate, SensorRecordRead

router = APIRouter()


@router.get("", response_model=list[SensorRecordRead])
def list_sensor_records(
    sensor_type: str | None = None,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
    limit: int = Query(default=200, ge=1, le=2000),
    db: Session = Depends(get_db),
) -> list[SensorRecord]:
    statement: Select[tuple[SensorRecord]] = select(SensorRecord)

    if sensor_type:
        statement = statement.filter(SensorRecord.sensor_type == sensor_type)
    if start_at:
        statement = statement.filter(SensorRecord.timestamp >= start_at)
    if end_at:
        statement = statement.filter(SensorRecord.timestamp <= end_at)

    statement = statement.order_by(SensorRecord.timestamp.desc()).limit(limit)
    return list(db.scalars(statement).all())


@router.post("", response_model=SensorRecordRead, status_code=201)
def create_sensor_record(
    payload: SensorRecordCreate,
    db: Session = Depends(get_db),
) -> SensorRecord:
    record = SensorRecord(**payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
