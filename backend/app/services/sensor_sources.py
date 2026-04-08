import json
import math
from datetime import UTC, datetime
from pathlib import Path
from typing import Protocol

from backend.app.core.config import Settings
from backend.app.services.runtime_models import CollectedSensorReading


class SensorSource(Protocol):
    def collect(self) -> list[CollectedSensorReading]:
        ...


class DummySensorSource:
    def collect(self) -> list[CollectedSensorReading]:
        now = datetime.now(UTC)
        minute_index = now.hour * 60 + now.minute

        return [
            CollectedSensorReading(
                timestamp=now,
                sensor_type="temperature",
                sensor_id="temp-sim-01",
                location="growth-chamber-a",
                value=22.8 + math.sin(minute_index / 23) * 1.6,
                unit="C",
                source="dummy-runtime",
                note="Runtime dummy temperature reading",
            ),
            CollectedSensorReading(
                timestamp=now,
                sensor_type="humidity",
                sensor_id="humid-sim-01",
                location="growth-chamber-a",
                value=59.0 + math.sin(minute_index / 17) * 4.2,
                unit="%",
                source="dummy-runtime",
                note="Runtime dummy humidity reading",
            ),
            CollectedSensorReading(
                timestamp=now,
                sensor_type="co2",
                sensor_id="co2-sim-01",
                location="growth-chamber-a",
                value=720.0 + math.sin(minute_index / 15) * 65.0,
                unit="ppm",
                source="dummy-runtime",
                note="Runtime dummy CO2 reading",
            ),
            CollectedSensorReading(
                timestamp=now,
                sensor_type="tank_level",
                sensor_id="tank-sim-01",
                location="nutrient-tank-a",
                value=68.0 + math.sin(minute_index / 42) * 11.0,
                unit="%",
                source="dummy-runtime",
                note="Runtime dummy tank level reading",
            ),
        ]


class JsonFileSensorSource:
    def __init__(self, json_path: Path):
        self.json_path = json_path

    def collect(self) -> list[CollectedSensorReading]:
        if not self.json_path.exists():
            return []

        payload = json.loads(self.json_path.read_text(encoding="utf-8"))
        if not isinstance(payload, list):
            raise ValueError("Sensor input JSON must be a list.")

        now = datetime.now(UTC)
        readings: list[CollectedSensorReading] = []
        for item in payload:
            readings.append(
                CollectedSensorReading(
                    timestamp=datetime.fromisoformat(item["timestamp"]) if item.get("timestamp") else now,
                    sensor_type=item["sensor_type"],
                    sensor_id=item["sensor_id"],
                    location=item["location"],
                    value=float(item["value"]),
                    unit=item["unit"],
                    source=item.get("source", "json-file"),
                    note=item.get("note"),
                )
            )
        return readings


def build_sensor_source(
    settings: Settings,
    source_type: str | None = None,
    json_path: Path | None = None,
) -> SensorSource:
    selected_source = (source_type or settings.sensor_source_type).lower()

    if selected_source == "dummy":
        return DummySensorSource()
    if selected_source == "json":
        return JsonFileSensorSource(json_path or settings.resolved_sensor_input_json_path)

    raise ValueError(f"Unsupported sensor source type: {selected_source}")

