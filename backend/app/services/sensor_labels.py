import json

from backend.app.models.sensor_label import SensorLabel
from backend.app.schemas.sensor_label import SensorLabelThreshold


def thresholds_from_json(value: str | None) -> list[SensorLabelThreshold]:
    if not value:
        return []
    try:
        payload = json.loads(value)
    except json.JSONDecodeError:
        return []
    if not isinstance(payload, list):
        return []

    thresholds: list[SensorLabelThreshold] = []
    for item in payload:
        if not isinstance(item, dict):
            continue
        try:
            thresholds.append(SensorLabelThreshold.model_validate(item))
        except ValueError:
            continue
    return thresholds


def thresholds_to_json(thresholds: list[SensorLabelThreshold]) -> str:
    return json.dumps(
        [threshold.model_dump() for threshold in thresholds],
        ensure_ascii=False,
    )


def label_to_read(label: SensorLabel):
    from backend.app.schemas.sensor_label import SensorLabelRead

    return SensorLabelRead(
        id=label.id,
        name=label.name,
        color=label.color,
        display_order=label.display_order,
        thresholds=thresholds_from_json(label.thresholds_json),
    )
