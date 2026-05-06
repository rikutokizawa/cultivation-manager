from dataclasses import asdict
from collections.abc import Iterable

from sqlalchemy.orm import Session

from backend.app.models.image_record import ImageRecord
from backend.app.models.sensor_record import SensorRecord
from backend.app.services.runtime_models import CapturedImage, CollectedSensorReading
from backend.app.services.runtime_logging import log_persisted_sensor_records


def persist_sensor_readings(
    db: Session,
    readings: Iterable[CollectedSensorReading],
) -> list[SensorRecord]:
    records = [SensorRecord(**asdict(reading)) for reading in readings]
    if not records:
        return []

    db.add_all(records)
    db.commit()
    for record in records:
        db.refresh(record)
    log_persisted_sensor_records(records)
    return records


def persist_captured_images(
    db: Session,
    captures: Iterable[CapturedImage],
) -> list[ImageRecord]:
    records = [ImageRecord(**asdict(capture)) for capture in captures]
    if not records:
        return []

    db.add_all(records)
    db.commit()
    for record in records:
        db.refresh(record)
    return records
