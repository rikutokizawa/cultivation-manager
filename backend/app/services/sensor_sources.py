import json
import math
import shlex
import subprocess
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Protocol
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from backend.app.core.config import Settings
from backend.app.services.runtime_logging import log_ondotori_current_response
from backend.app.services.runtime_models import CollectedSensorReading


class SensorSource(Protocol):
    def collect(self) -> list[CollectedSensorReading]:
        ...


class CompositeSensorSource:
    def __init__(self, sources: list[SensorSource]):
        self.sources = sources

    def collect(self) -> list[CollectedSensorReading]:
        readings: list[CollectedSensorReading] = []
        for source in self.sources:
            readings.extend(source.collect())
        return readings


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


class CommandSensorSource:
    def __init__(self, command: str, timeout_seconds: int):
        self.command = command
        self.timeout_seconds = timeout_seconds

    def collect(self) -> list[CollectedSensorReading]:
        if not self.command.strip():
            raise ValueError("SENSOR_COMMAND is required for command sensor source.")

        result = subprocess.run(
            shlex.split(self.command),
            capture_output=True,
            text=True,
            timeout=self.timeout_seconds,
            check=True,
        )
        payload = json.loads(result.stdout)
        if not isinstance(payload, list):
            raise ValueError("Sensor command output must be a JSON list.")

        now = datetime.now(UTC)
        return [
            CollectedSensorReading(
                timestamp=datetime.fromisoformat(item["timestamp"]) if item.get("timestamp") else now,
                sensor_type=item["sensor_type"],
                sensor_id=item["sensor_id"],
                location=item["location"],
                value=float(item["value"]),
                unit=item["unit"],
                source=item.get("source", "command"),
                note=item.get("note"),
            )
            for item in payload
        ]


class OneWireTemperatureSensorSource:
    def __init__(self, device_glob: str, location_prefix: str):
        self.device_glob = device_glob
        self.location_prefix = location_prefix

    def collect(self) -> list[CollectedSensorReading]:
        now = datetime.now(UTC)
        readings: list[CollectedSensorReading] = []

        for index, sensor_path in enumerate(sorted(Path("/").glob(self.device_glob.lstrip("/"))), start=1):
            lines = sensor_path.read_text(encoding="utf-8").splitlines()
            if len(lines) < 2 or not lines[0].strip().endswith("YES") or "t=" not in lines[1]:
                continue

            raw_value = lines[1].split("t=", maxsplit=1)[1]
            temperature_c = float(raw_value) / 1000.0
            sensor_id = sensor_path.parent.name
            readings.append(
                CollectedSensorReading(
                    timestamp=now,
                    sensor_type="temperature",
                    sensor_id=sensor_id,
                    location=f"{self.location_prefix}-{index}",
                    value=temperature_c,
                    unit="C",
                    source="ds18b20-onewire",
                    note=f"Read from {sensor_path}",
                )
            )

        return readings


class OndotoriCurrentSensorSource:
    def __init__(self, settings: Settings):
        self.settings = settings

    def collect(self) -> list[CollectedSensorReading]:
        if not self.settings.ondotori_api_key.strip():
            raise ValueError("ONDOTORI_API_KEY is required for ondotori sensor source.")
        if not self.settings.ondotori_login_id.strip():
            raise ValueError("ONDOTORI_LOGIN_ID is required for ondotori sensor source.")
        if not self.settings.ondotori_login_pass.strip():
            raise ValueError("ONDOTORI_LOGIN_PASS is required for ondotori sensor source.")
        if self.settings.ondotori_remote_serials and self.settings.ondotori_base_serials:
            raise ValueError("Set either ONDOTORI_REMOTE_SERIALS_CSV or ONDOTORI_BASE_SERIALS_CSV, not both.")

        payload: dict[str, object] = {
            "api-key": self.settings.ondotori_api_key,
            "login-id": self.settings.ondotori_login_id,
            "login-pass": self.settings.ondotori_login_pass,
        }
        if self.settings.ondotori_remote_serials:
            payload["remote-serial"] = self.settings.ondotori_remote_serials
        if self.settings.ondotori_base_serials:
            payload["base-serial"] = self.settings.ondotori_base_serials

        request = Request(
            self.settings.ondotori_api_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "X-HTTP-Method-Override": "GET",
            },
            method="POST",
        )

        requested_at = datetime.now(UTC)
        started_at = time.perf_counter()
        status_code: int | None = None
        try:
            with urlopen(request, timeout=self.settings.ondotori_timeout_seconds) as response:
                status_code = getattr(response, "status", None)
                body = response.read().decode("utf-8")
        except HTTPError as exc:
            error_body = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Ondotori API request failed: HTTP {exc.code} {error_body}") from exc
        except URLError as exc:
            raise RuntimeError(f"Ondotori API request failed: {exc.reason}") from exc

        responded_at = datetime.now(UTC)
        duration_ms = round((time.perf_counter() - started_at) * 1000, 1)
        response_payload = json.loads(body)
        devices = response_payload.get("devices")
        if not isinstance(devices, list):
            raise ValueError("Ondotori API response must contain a devices list.")

        readings: list[CollectedSensorReading] = []
        skipped_channel_count = 0
        for device in devices:
            if not isinstance(device, dict):
                continue

            device_serial = str(device.get("serial", "unknown"))
            device_name = str(device.get("name") or device_serial)
            baseunit = device.get("baseunit") if isinstance(device.get("baseunit"), dict) else {}
            group = device.get("group") if isinstance(device.get("group"), dict) else {}
            location_parts = [
                str(group.get("name") or "").strip(),
                str(baseunit.get("name") or "").strip(),
                device_name,
            ]
            location = " / ".join(part for part in location_parts if part) or device_serial
            timestamp = self._parse_timestamp(device)

            channels = device.get("channel")
            if not isinstance(channels, list):
                continue

            for channel in channels:
                if not isinstance(channel, dict):
                    skipped_channel_count += 1
                    continue

                raw_value = str(channel.get("value", "")).strip()
                if not raw_value or raw_value.upper().startswith("E"):
                    skipped_channel_count += 1
                    continue
                try:
                    numeric_value = float(raw_value)
                except ValueError:
                    skipped_channel_count += 1
                    continue

                readings.append(
                    CollectedSensorReading(
                        timestamp=timestamp,
                        sensor_type=self._sensor_type_for_channel(channel),
                        sensor_id=f"{device_serial}-ch{channel.get('num', 'unknown')}",
                        location=location,
                        value=numeric_value,
                        unit=str(channel.get("unit", "")),
                        source="ondotori-current",
                        note=f"{device.get('model', '')} {device_name} channel={channel.get('name', channel.get('num'))}",
                    )
                )

        log_ondotori_current_response(
            settings=self.settings,
            requested_at=requested_at,
            responded_at=responded_at,
            duration_ms=duration_ms,
            status_code=status_code,
            response_payload=response_payload,
            reading_count=len(readings),
            skipped_channel_count=skipped_channel_count,
        )

        return readings

    def _parse_timestamp(self, device: dict[str, object]) -> datetime:
        unixtime = device.get("unixtime")
        if unixtime:
            return datetime.fromtimestamp(int(str(unixtime)), UTC)
        return datetime.now(UTC)

    def _sensor_type_for_channel(self, channel: dict[str, object]) -> str:
        name = str(channel.get("name", "")).strip().lower()
        unit = str(channel.get("unit", "")).strip().lower()

        if unit in {"c", "f"} or "temp" in name or "温度" in name:
            return "temperature"
        if unit == "%" or "humid" in name or "湿度" in name:
            return "humidity"
        if unit == "ppm" or "co2" in name or "co₂" in name:
            return "co2"
        return name.replace(" ", "_") or f"channel_{channel.get('num', 'unknown')}"


def build_sensor_source(
    settings: Settings,
    source_type: str | None = None,
    json_path: Path | None = None,
) -> SensorSource:
    selected_source = source_type or settings.sensor_source_type
    source_names = [item.strip().lower() for item in selected_source.split(",") if item.strip()]
    sources: list[SensorSource] = []

    for source_name in source_names:
        if source_name == "dummy":
            sources.append(DummySensorSource())
            continue
        if source_name == "json":
            sources.append(JsonFileSensorSource(json_path or settings.resolved_sensor_input_json_path))
            continue
        if source_name == "command":
            sources.append(
                CommandSensorSource(
                    command=settings.sensor_command,
                    timeout_seconds=settings.sensor_command_timeout_seconds,
                )
            )
            continue
        if source_name == "onewire":
            sources.append(
                OneWireTemperatureSensorSource(
                    device_glob=settings.ds18b20_device_glob,
                    location_prefix=settings.ds18b20_location_prefix,
                )
            )
            continue
        if source_name == "ondotori":
            sources.append(OndotoriCurrentSensorSource(settings))
            continue
        raise ValueError(f"Unsupported sensor source type: {source_name}")

    if not sources:
        raise ValueError("At least one sensor source type must be configured.")
    if len(sources) == 1:
        return sources[0]
    return CompositeSensorSource(sources)
