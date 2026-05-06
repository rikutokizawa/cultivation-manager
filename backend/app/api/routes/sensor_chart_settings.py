from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.sensor_chart_setting import SensorChartSetting
from backend.app.schemas.sensor_chart_setting import (
    SensorChartSettingRead,
    SensorChartSettingUpdate,
)

router = APIRouter()


def chart_setting_to_read(setting: SensorChartSetting) -> SensorChartSettingRead:
    return SensorChartSettingRead(
        id=setting.id,
        sensor_type=setting.sensor_type,
        y_axis_min=setting.y_axis_min,
        y_axis_max=setting.y_axis_max,
    )


@router.get("", response_model=list[SensorChartSettingRead])
def list_sensor_chart_settings(db: Session = Depends(get_db)) -> list[SensorChartSettingRead]:
    settings = db.scalars(
        select(SensorChartSetting).order_by(SensorChartSetting.sensor_type.asc())
    ).all()
    return [chart_setting_to_read(setting) for setting in settings]


@router.put("/{sensor_type}", response_model=SensorChartSettingRead)
def update_sensor_chart_setting(
    sensor_type: str,
    payload: SensorChartSettingUpdate,
    db: Session = Depends(get_db),
) -> SensorChartSettingRead:
    normalized_sensor_type = payload.sensor_type.strip()
    setting = db.scalar(
        select(SensorChartSetting).filter(SensorChartSetting.sensor_type == sensor_type.strip())
    )

    if setting is None:
        setting = db.scalar(
            select(SensorChartSetting).filter(SensorChartSetting.sensor_type == normalized_sensor_type)
        )

    if setting is None:
        setting = SensorChartSetting(sensor_type=normalized_sensor_type)
        db.add(setting)

    setting.sensor_type = normalized_sensor_type
    setting.y_axis_min = payload.y_axis_min
    setting.y_axis_max = payload.y_axis_max

    db.commit()
    db.refresh(setting)

    return chart_setting_to_read(setting)
