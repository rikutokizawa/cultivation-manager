from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.sensor_display_setting import SensorDisplaySetting
from backend.app.schemas.sensor_display_setting import (
    SensorDisplaySettingRead,
    SensorDisplaySettingUpdate,
)
from backend.app.services.sensor_display_settings import (
    get_latest_sensor_record_by_key,
    get_latest_sensor_records_by_key,
    labels_to_json,
    normalize_sensor_key,
    sensor_setting_to_read,
)

router = APIRouter()


@router.get("", response_model=list[SensorDisplaySettingRead])
def list_sensor_display_settings(db: Session = Depends(get_db)) -> list[SensorDisplaySettingRead]:
    latest_by_key = get_latest_sensor_records_by_key(db)
    settings_by_key: dict[str, SensorDisplaySetting] = {}
    for setting in db.scalars(select(SensorDisplaySetting)).all():
        sensor_key = normalize_sensor_key(setting.sensor_key)
        if sensor_key not in settings_by_key or setting.sensor_key == sensor_key:
            settings_by_key[sensor_key] = setting
    sensor_keys = set(latest_by_key) | set(settings_by_key)

    settings = [
        sensor_setting_to_read(
            sensor_key=sensor_key,
            setting=settings_by_key.get(sensor_key),
            latest_record=latest_by_key.get(sensor_key),
        )
        for sensor_key in sensor_keys
    ]

    return sorted(
        settings,
        key=lambda item: (
            item.display_order,
            not item.is_visible,
            item.effective_name,
            item.sensor_type,
            item.sensor_id,
        ),
    )


@router.put("/{sensor_key}", response_model=SensorDisplaySettingRead)
def update_sensor_display_setting(
    sensor_key: str,
    payload: SensorDisplaySettingUpdate,
    db: Session = Depends(get_db),
) -> SensorDisplaySettingRead:
    normalized_sensor_key = normalize_sensor_key(sensor_key)
    setting = db.scalar(
        select(SensorDisplaySetting).filter(SensorDisplaySetting.sensor_key == normalized_sensor_key)
    )
    if setting is None:
        for candidate in db.scalars(select(SensorDisplaySetting)).all():
            if normalize_sensor_key(candidate.sensor_key) == normalized_sensor_key:
                setting = candidate
                break
    latest_record = get_latest_sensor_record_by_key(db, normalized_sensor_key)

    if setting is None:
        if latest_record is None:
            raise HTTPException(status_code=404, detail="Sensor was not found.")
        setting = SensorDisplaySetting(
            sensor_key=normalized_sensor_key,
            sensor_type=latest_record.sensor_type,
            sensor_id=latest_record.sensor_id,
            source=latest_record.source,
            location=latest_record.location,
            unit=latest_record.unit,
        )
        db.add(setting)

    if latest_record is not None:
        setting.sensor_type = latest_record.sensor_type
        setting.sensor_id = latest_record.sensor_id
        setting.source = latest_record.source
        setting.location = latest_record.location
        setting.unit = latest_record.unit

    setting.sensor_key = normalized_sensor_key
    setting.display_name = payload.display_name
    setting.labels_json = labels_to_json(payload.labels)
    setting.is_visible = payload.is_visible
    setting.display_order = payload.display_order

    db.commit()
    db.refresh(setting)

    return sensor_setting_to_read(
        sensor_key=normalized_sensor_key,
        setting=setting,
        latest_record=latest_record,
    )
