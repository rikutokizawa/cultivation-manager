from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.image_record import ImageRecord
from backend.app.schemas.image_record import ImageRecordRead

router = APIRouter()


@router.get("", response_model=list[ImageRecordRead])
def list_image_records(
    camera_id: str | None = None,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
    limit: int = Query(default=20, ge=1, le=200),
    db: Session = Depends(get_db),
) -> list[ImageRecord]:
    statement: Select[tuple[ImageRecord]] = select(ImageRecord)

    if camera_id:
        statement = statement.filter(ImageRecord.camera_id == camera_id)
    if start_at:
        statement = statement.filter(ImageRecord.timestamp >= start_at)
    if end_at:
        statement = statement.filter(ImageRecord.timestamp <= end_at)

    statement = statement.order_by(ImageRecord.timestamp.desc()).limit(limit)
    return list(db.scalars(statement).all())
