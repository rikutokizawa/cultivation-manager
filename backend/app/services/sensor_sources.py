import json
import time
from datetime import UTC, datetime
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from backend.app.core.config import Settings
from backend.app.services.runtime_logging import log_ondotori_current_response
from backend.app.services.runtime_models import CollectedSensorReading


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

        latest_readings: dict[str, CollectedSensorReading] = {}
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

                reading = CollectedSensorReading(
                    timestamp=timestamp,
                    sensor_type=self._sensor_type_for_channel(channel),
                    sensor_id=f"{device_serial}-ch{channel.get('num', 'unknown')}",
                    location=location,
                    value=numeric_value,
                    unit=str(channel.get("unit", "")),
                    source="ondotori-current",
                    note=f"{device.get('model', '')} {device_name} channel={channel.get('name', channel.get('num'))}",
                )
                previous = latest_readings.get(reading.sensor_id)
                if previous is None or reading.timestamp > previous.timestamp:
                    latest_readings[reading.sensor_id] = reading
                else:
                    skipped_channel_count += 1

        readings = list(latest_readings.values())

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


def build_sensor_source(settings: Settings) -> OndotoriCurrentSensorSource:
    return OndotoriCurrentSensorSource(settings)
