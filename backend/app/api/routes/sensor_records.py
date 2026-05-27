from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import Select, func, select
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
    filters = []

    if sensor_type:
        filters.append(SensorRecord.sensor_type == sensor_type)
    if source:
        filters.append(SensorRecord.source == source)
    if start_at:
        filters.append(SensorRecord.timestamp >= start_at)
    if end_at:
        filters.append(SensorRecord.timestamp <= end_at)

    if not per_sensor_limit:
        statement: Select[tuple[SensorRecord]] = select(SensorRecord)
        if filters:
            statement = statement.filter(*filters)
        statement = statement.order_by(SensorRecord.timestamp.desc(), SensorRecord.id.desc())
        statement = statement.limit(limit)
        return list(db.scalars(statement).all())

    row_number = func.row_number().over(
        partition_by=(
            SensorRecord.source,
            SensorRecord.sensor_type,
            SensorRecord.sensor_id,
        ),
        order_by=(SensorRecord.timestamp.desc(), SensorRecord.id.desc()),
    ).label("row_number")
    ranked_records = select(SensorRecord.id, row_number)
    if filters:
        ranked_records = ranked_records.filter(*filters)
    ranked_records = ranked_records.subquery()

    statement = (
        select(SensorRecord)
        .join(ranked_records, SensorRecord.id == ranked_records.c.id)
        .filter(ranked_records.c.row_number <= limit)
        .order_by(SensorRecord.timestamp.desc(), SensorRecord.id.desc())
    )

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
