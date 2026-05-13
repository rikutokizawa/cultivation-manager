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
    source: str | None = None,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
    limit: int = Query(default=200, ge=1, le=12000),
    per_sensor_limit: bool = False,
    db: Session = Depends(get_db),
) -> list[SensorRecord]:
    statement: Select[tuple[SensorRecord]] = select(SensorRecord)

    if sensor_type:
        statement = statement.filter(SensorRecord.sensor_type == sensor_type)
    if source:
        statement = statement.filter(SensorRecord.source == source)
    if start_at:
        statement = statement.filter(SensorRecord.timestamp >= start_at)
    if end_at:
        statement = statement.filter(SensorRecord.timestamp <= end_at)

    statement = statement.order_by(SensorRecord.timestamp.desc(), SensorRecord.id.desc())

    if not per_sensor_limit:
        statement = statement.limit(limit)
        return list(db.scalars(statement).all())

    records: list[SensorRecord] = []
    counts_by_sensor: dict[tuple[str, str, str], int] = {}
    for record in db.scalars(statement):
        sensor_key = (record.source, record.sensor_type, record.sensor_id)
        count = counts_by_sensor.get(sensor_key, 0)
        if count >= limit:
            continue
        records.append(record)
        counts_by_sensor[sensor_key] = count + 1

    return records


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
