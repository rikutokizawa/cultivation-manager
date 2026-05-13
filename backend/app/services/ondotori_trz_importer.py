import base64
import binascii
import struct
import xml.etree.ElementTree as ET
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models.sensor_record import SensorRecord
from backend.app.services.collection_pipeline import persist_sensor_readings
from backend.app.services.runtime_models import CollectedSensorReading


@dataclass(frozen=True, slots=True)
class TrzChannelDefinition:
    sensor_type: str
    unit: str
    scale: float
    offset: float = 0.0

    def convert(self, raw_value: int) -> float:
        return round((raw_value + self.offset) * self.scale, 3)


@dataclass(frozen=True, slots=True)
class TrzImportResult:
    file_path: Path
    parsed_count: int
    inserted_count: int
    skipped_duplicate_count: int
    deleted: bool
    devices: tuple[str, ...]
    started_at: datetime | None
    ended_at: datetime | None


RTR_576_CHANNELS = {
    "66": TrzChannelDefinition(sensor_type="co2", unit="ppm", scale=1.0),
    "13": TrzChannelDefinition(sensor_type="temperature", unit="C", scale=0.1, offset=-1000),
    "209": TrzChannelDefinition(sensor_type="humidity", unit="%", scale=0.1, offset=-1000),
}

RTR_502_CHANNELS = {
    "13": TrzChannelDefinition(sensor_type="temperature", unit="C", scale=0.1, offset=-1000),
}


def parse_ondotori_trz(path: Path) -> list[CollectedSensorReading]:
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError as exc:
        raise ValueError(f"{path} is not a valid TRZ XML file: {exc}") from exc

    if root.tag != "file" or root.attrib.get("format") != "recorded_data":
        raise ValueError(f"{path} is not an Ondotori recorded_data TRZ file.")

    base = root.find("base")
    base_name = _child_text(base, "name") or _child_text(base, "serial") or "ondotori-base"

    readings: list[CollectedSensorReading] = []
    for channel in root.findall("ch"):
        model = _required_child_text(channel, "model", path)
        serial = _required_child_text(channel, "serial", path)
        name = _child_text(channel, "name") or serial
        channel_num = _required_child_text(channel, "num", path)
        channel_type = _required_child_text(channel, "type", path)
        start = datetime.fromtimestamp(int(_required_child_text(channel, "unix_time", path)), UTC)
        interval_seconds = int(_required_child_text(channel, "interval", path))
        expected_count = int(_required_child_text(channel, "count", path))
        definition = _definition_for_channel(model=model, channel_type=channel_type, channel_num=channel_num)
        raw_values = _decode_channel_values(_required_child_text(channel, "data", path))

        if len(raw_values) != expected_count:
            raise ValueError(
                f"{path} channel {channel_num} expected {expected_count} values, got {len(raw_values)}."
            )

        location = f"{base_name} / {name}"
        for index, raw_value in enumerate(raw_values):
            readings.append(
                CollectedSensorReading(
                    timestamp=start + timedelta(seconds=interval_seconds * index),
                    sensor_type=definition.sensor_type,
                    sensor_id=f"{serial}-ch{channel_num}",
                    location=location,
                    value=definition.convert(raw_value),
                    unit=definition.unit,
                    source="ondotori-trz",
                    note=f"{model} {name} channel={channel_num} imported from {path.name}",
                )
            )

    return readings


def import_ondotori_trz_file(
    db: Session,
    path: Path,
    *,
    delete_after_success: bool = True,
    dry_run: bool = False,
) -> TrzImportResult:
    readings = parse_ondotori_trz(path)
    deduped_readings, skipped_duplicate_count = _drop_duplicate_readings(db, readings)
    devices = _describe_devices(readings)
    started_at = min((reading.timestamp for reading in readings), default=None)
    ended_at = max((reading.timestamp for reading in readings), default=None)

    inserted_count = 0
    if not dry_run:
        inserted_count = len(persist_sensor_readings(db, deduped_readings))
        if delete_after_success:
            path.unlink()

    return TrzImportResult(
        file_path=path,
        parsed_count=len(readings),
        inserted_count=inserted_count,
        skipped_duplicate_count=skipped_duplicate_count,
        deleted=delete_after_success and not dry_run,
        devices=devices,
        started_at=started_at,
        ended_at=ended_at,
    )


def import_ondotori_trz_directory(
    db: Session,
    directory: Path,
    *,
    delete_after_success: bool = True,
    dry_run: bool = False,
) -> list[TrzImportResult]:
    return [
        import_ondotori_trz_file(
            db,
            path,
            delete_after_success=delete_after_success,
            dry_run=dry_run,
        )
        for path in _iter_trz_files(directory)
    ]


def _iter_trz_files(directory: Path) -> Iterable[Path]:
    return sorted(path for path in directory.iterdir() if path.is_file() and path.suffix.lower() == ".trz")


def _definition_for_channel(model: str, channel_type: str, channel_num: str) -> TrzChannelDefinition:
    if model == "RTR-576" and channel_type in RTR_576_CHANNELS:
        return RTR_576_CHANNELS[channel_type]
    if model == "RTR-502" and channel_type in RTR_502_CHANNELS:
        return RTR_502_CHANNELS[channel_type]
    raise ValueError(f"Unsupported Ondotori TRZ channel: model={model} num={channel_num} type={channel_type}.")


def _decode_channel_values(encoded_data: str) -> list[int]:
    compact_data = "".join(encoded_data.split())
    try:
        raw_bytes = base64.b64decode(compact_data, validate=True)
    except binascii.Error as exc:
        raise ValueError("TRZ channel data is not valid Base64.") from exc

    if len(raw_bytes) % 2 != 0:
        raise ValueError("TRZ channel data length must be a multiple of 2 bytes.")

    return list(struct.unpack(f"<{len(raw_bytes) // 2}h", raw_bytes))


def _drop_duplicate_readings(
    db: Session,
    readings: list[CollectedSensorReading],
) -> tuple[list[CollectedSensorReading], int]:
    if not readings:
        return [], 0

    min_timestamp = min(reading.timestamp for reading in readings)
    max_timestamp = max(reading.timestamp for reading in readings)
    sensor_ids = {reading.sensor_id for reading in readings}
    sensor_types = {reading.sensor_type for reading in readings}

    existing_rows = db.execute(
        select(SensorRecord.timestamp, SensorRecord.sensor_id, SensorRecord.sensor_type).where(
            SensorRecord.timestamp >= min_timestamp,
            SensorRecord.timestamp <= max_timestamp,
            SensorRecord.sensor_id.in_(sensor_ids),
            SensorRecord.sensor_type.in_(sensor_types),
        )
    )
    existing_keys = {
        (_timestamp_key(timestamp), sensor_id, sensor_type)
        for timestamp, sensor_id, sensor_type in existing_rows
    }

    seen_keys: set[tuple[datetime, str, str]] = set()
    deduped: list[CollectedSensorReading] = []
    skipped = 0
    for reading in readings:
        key = (_timestamp_key(reading.timestamp), reading.sensor_id, reading.sensor_type)
        if key in existing_keys or key in seen_keys:
            skipped += 1
            continue
        seen_keys.add(key)
        deduped.append(reading)

    return deduped, skipped


def _describe_devices(readings: list[CollectedSensorReading]) -> tuple[str, ...]:
    devices: dict[str, set[str]] = {}
    for reading in readings:
        device = reading.note.split(" channel=", maxsplit=1)[0] if reading.note else reading.sensor_id
        devices.setdefault(device, set()).add(reading.sensor_type)

    return tuple(
        f"{device} ({', '.join(sorted(sensor_types))})"
        for device, sensor_types in sorted(devices.items())
    )


def _timestamp_key(timestamp: datetime) -> datetime:
    if timestamp.tzinfo is None:
        return timestamp.replace(tzinfo=UTC)
    return timestamp.astimezone(UTC)


def _child_text(element: ET.Element | None, name: str) -> str:
    if element is None:
        return ""
    return (element.findtext(name) or "").strip()


def _required_child_text(element: ET.Element, name: str, path: Path) -> str:
    value = _child_text(element, name)
    if not value:
        raise ValueError(f"{path} is missing required TRZ field: {name}.")
    return value
