import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models.sensor_display_setting import SensorDisplaySetting
from backend.app.models.sensor_record import SensorRecord
from backend.app.schemas.sensor_display_setting import SensorDisplaySettingRead, normalize_labels


def build_sensor_key(source: str, sensor_type: str, sensor_id: str) -> str:
    return f"{source}:{sensor_type}:{sensor_id}"


def build_sensor_key_for_record(record: SensorRecord) -> str:
    return build_sensor_key(
        source=record.source,
        sensor_type=record.sensor_type,
        sensor_id=record.sensor_id,
    )


def labels_from_json(value: str | None) -> list[str]:
    if not value:
        return []
    try:
        payload = json.loads(value)
    except json.JSONDecodeError:
        return []
    if not isinstance(payload, list):
        return []
    return normalize_labels([str(item) for item in payload])


def labels_to_json(labels: list[str]) -> str:
    return json.dumps(normalize_labels(labels), ensure_ascii=False)


def default_sensor_name(sensor_type: str, sensor_id: str, location: str) -> str:
    location_name = location.split("/")[-1].strip() if location else ""
    return location_name or sensor_id or sensor_type


def get_latest_sensor_records_by_key(db: Session) -> dict[str, SensorRecord]:
    records = db.scalars(
        select(SensorRecord).order_by(SensorRecord.timestamp.desc(), SensorRecord.id.desc())
    )
    latest_by_key: dict[str, SensorRecord] = {}

    for record in records:
        sensor_key = build_sensor_key_for_record(record)
        if sensor_key not in latest_by_key:
            latest_by_key[sensor_key] = record

    return latest_by_key


def get_latest_sensor_record_by_key(db: Session, sensor_key: str) -> SensorRecord | None:
    for record in db.scalars(
        select(SensorRecord).order_by(SensorRecord.timestamp.desc(), SensorRecord.id.desc())
    ):
        if build_sensor_key_for_record(record) == sensor_key:
            return record
    return None


def sensor_setting_to_read(
    sensor_key: str,
    setting: SensorDisplaySetting | None,
    latest_record: SensorRecord | None,
) -> SensorDisplaySettingRead:
    sensor_type = latest_record.sensor_type if latest_record else setting.sensor_type if setting else ""
    sensor_id = latest_record.sensor_id if latest_record else setting.sensor_id if setting else ""
    source = latest_record.source if latest_record else setting.source if setting else ""
    location = latest_record.location if latest_record else setting.location if setting else ""
    unit = latest_record.unit if latest_record else setting.unit if setting else ""
    display_name = setting.display_name if setting else None

    return SensorDisplaySettingRead(
        id=setting.id if setting else None,
        sensor_key=sensor_key,
        sensor_type=sensor_type,
        sensor_id=sensor_id,
        source=source,
        location=location,
        unit=unit,
        display_name=display_name,
        effective_name=display_name or default_sensor_name(sensor_type, sensor_id, location),
        labels=labels_from_json(setting.labels_json if setting else None),
        is_visible=setting.is_visible if setting else True,
        display_order=setting.display_order if setting else 0,
        latest_timestamp=latest_record.timestamp if latest_record else None,
        latest_value=latest_record.value if latest_record else None,
        latest_unit=latest_record.unit if latest_record else None,
    )
