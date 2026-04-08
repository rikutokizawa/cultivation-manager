from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from backend.app.core.config import get_settings
from backend.app.db.session import get_db
from backend.app.models.image_record import ImageRecord
from backend.app.schemas.image_record import ImageRecordRead
from backend.app.services.image_storage import save_upload_file

router = APIRouter()


@router.post("/upload-image", response_model=ImageRecordRead, status_code=201)
async def upload_image(
    camera_id: str = Form(...),
    location: str = Form(...),
    timestamp: datetime | None = Form(default=None),
    note: str | None = Form(default=None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> ImageRecord:
    settings = get_settings()
    settings.ensure_directories()

    saved_path = await save_upload_file(
        upload_file=file,
        destination_directory=settings.resolved_image_storage_path,
        prefix=camera_id,
    )

    record = ImageRecord(
        timestamp=timestamp or datetime.now(UTC),
        camera_id=camera_id,
        location=location,
        file_path=str(Path("storage/images") / saved_path.name),
        note=note,
    )

    db.add(record)
    db.commit()
    db.refresh(record)
    return record

