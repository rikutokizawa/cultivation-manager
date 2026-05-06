import json
import logging
from datetime import UTC, datetime, timedelta, timezone

from backend.app.core.config import Settings, get_settings
from backend.app.models.sensor_record import SensorRecord

JST = timezone(timedelta(hours=9), "JST")


def configure_runtime_logging(settings: Settings) -> None:
    logging.basicConfig(
        level=getattr(logging, settings.runtime_log_level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler(settings.resolved_runtime_text_log_path, encoding="utf-8"),
        ],
        force=True,
    )


def log_persisted_sensor_records(records: list[SensorRecord]) -> None:
    if not records:
        return

    settings = get_settings()
    saved_at_utc = datetime.now(UTC)
    saved_at = saved_at_utc.isoformat()
    saved_at_jst = saved_at_utc.astimezone(JST).isoformat()

    with settings.resolved_sensor_record_log_path.open("a", encoding="utf-8") as log_file:
        for record in records:
            log_file.write(
                json.dumps(
                    {
                        "event": "sensor_record_saved",
                        "saved_at": saved_at,
                        "saved_at_jst": saved_at_jst,
                        "record_id": record.id,
                        "measurement_timestamp": record.timestamp.isoformat(),
                        "sensor_type": record.sensor_type,
                        "sensor_id": record.sensor_id,
                        "location": record.location,
                        "value": record.value,
                        "unit": record.unit,
                        "source": record.source,
                        "note": record.note,
                    },
                    ensure_ascii=False,
                )
                + "\n"
            )


def log_ondotori_current_response(
    *,
    settings: Settings,
    requested_at: datetime,
    responded_at: datetime,
    duration_ms: float,
    status_code: int | None,
    response_payload: dict[str, object],
    reading_count: int,
    skipped_channel_count: int,
) -> None:
    devices = response_payload.get("devices")
    device_items = devices if isinstance(devices, list) else []

    event = {
        "event": "ondotori_current_response",
        "requested_at": requested_at.isoformat(),
        "requested_at_jst": requested_at.astimezone(JST).isoformat(),
        "responded_at": responded_at.isoformat(),
        "responded_at_jst": responded_at.astimezone(JST).isoformat(),
        "duration_ms": duration_ms,
        "status_code": status_code,
        "device_count": len(device_items),
        "reading_count": reading_count,
        "skipped_channel_count": skipped_channel_count,
        "devices": [
            _summarize_ondotori_device(device)
            for device in device_items
            if isinstance(device, dict)
        ],
    }

    with settings.resolved_ondotori_api_log_path.open("a", encoding="utf-8") as log_file:
        log_file.write(json.dumps(event, ensure_ascii=False) + "\n")


def _summarize_ondotori_device(device: dict[str, object]) -> dict[str, object]:
    group = device.get("group") if isinstance(device.get("group"), dict) else {}
    baseunit = device.get("baseunit") if isinstance(device.get("baseunit"), dict) else {}
    channels = device.get("channel")
    channel_items = channels if isinstance(channels, list) else []
    measurement_at = _parse_ondotori_unixtime(device.get("unixtime"))

    return {
        "serial": device.get("serial"),
        "name": device.get("name"),
        "model": device.get("model"),
        "group_name": group.get("name"),
        "baseunit_name": baseunit.get("name"),
        "raw_unixtime": device.get("unixtime"),
        "measurement_timestamp": measurement_at.isoformat() if measurement_at else None,
        "measurement_timestamp_jst": measurement_at.astimezone(JST).isoformat() if measurement_at else None,
        "channel_count": len(channel_items),
        "channels": [
            _summarize_ondotori_channel(channel)
            for channel in channel_items
            if isinstance(channel, dict)
        ],
    }


def _summarize_ondotori_channel(channel: dict[str, object]) -> dict[str, object]:
    return {
        "num": channel.get("num"),
        "name": channel.get("name"),
        "value": channel.get("value"),
        "unit": channel.get("unit"),
    }


def _parse_ondotori_unixtime(unixtime: object) -> datetime | None:
    if unixtime is None or unixtime == "":
        return None
    try:
        return datetime.fromtimestamp(int(str(unixtime)), UTC)
    except (OSError, TypeError, ValueError, OverflowError):
        return None
