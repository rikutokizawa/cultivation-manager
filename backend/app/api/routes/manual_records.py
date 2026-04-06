from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.manual_record import ManualRecord
from backend.app.schemas.manual_record import ManualRecordCreate, ManualRecordRead

router = APIRouter()


@router.get("", response_model=list[ManualRecordRead])
def list_manual_records(
    item_type: str | None = None,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
    limit: int = Query(default=200, ge=1, le=2000),
    db: Session = Depends(get_db),
) -> list[ManualRecord]:
    statement: Select[tuple[ManualRecord]] = select(ManualRecord)

    if item_type:
        statement = statement.filter(ManualRecord.item_type == item_type)
    if start_at:
        statement = statement.filter(ManualRecord.timestamp >= start_at)
    if end_at:
        statement = statement.filter(ManualRecord.timestamp <= end_at)

    statement = statement.order_by(ManualRecord.timestamp.desc()).limit(limit)
    return list(db.scalars(statement).all())


@router.post("", response_model=ManualRecordRead, status_code=201)
def create_manual_record(
    payload: ManualRecordCreate,
    db: Session = Depends(get_db),
) -> ManualRecord:
    record = ManualRecord(**payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
