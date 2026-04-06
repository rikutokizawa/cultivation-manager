import csv
from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.core.config import get_settings
from backend.app.db.session import get_db
from backend.app.models.sensor_record import SensorRecord

router = APIRouter()


@router.get("/sensor-records.csv")
def export_sensor_records_csv(
    sensor_type: str | None = None,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
    db: Session = Depends(get_db),
) -> FileResponse:
    settings = get_settings()
    statement = select(SensorRecord).order_by(SensorRecord.timestamp.asc())

    if sensor_type:
        statement = statement.filter(SensorRecord.sensor_type == sensor_type)
    if start_at:
        statement = statement.filter(SensorRecord.timestamp >= start_at)
    if end_at:
        statement = statement.filter(SensorRecord.timestamp <= end_at)

    records = list(db.scalars(statement).all())
    timestamp_label = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
    export_path = Path(settings.resolved_export_storage_path) / f"sensor-records-{timestamp_label}.csv"

    with export_path.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow(["id", "timestamp", "sensor_type", "sensor_id", "location", "value", "unit", "source", "note"])
        for record in records:
            writer.writerow(
                [
                    record.id,
                    record.timestamp.isoformat(),
                    record.sensor_type,
                    record.sensor_id,
                    record.location,
                    record.value,
                    record.unit,
                    record.source,
                    record.note or "",
                ]
            )

    return FileResponse(
        path=export_path,
        media_type="text/csv",
        filename=export_path.name,
    )

