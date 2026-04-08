from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy import delete
from sqlalchemy.orm import Session

from backend.app.core.config import get_settings
from backend.app.models.image_record import ImageRecord
from backend.app.models.manual_record import ManualRecord
from backend.app.models.sensor_record import SensorRecord


def seed_dummy_data(db: Session, reset: bool = False) -> None:
    settings = get_settings()
    settings.ensure_directories()

    if reset:
        db.execute(delete(SensorRecord))
        db.execute(delete(ImageRecord))
        db.execute(delete(ManualRecord))
        db.commit()

    if db.query(SensorRecord).first():
        return

    now = datetime.now(UTC).replace(minute=0, second=0, microsecond=0)

    sensor_records: list[SensorRecord] = []
    for index in range(48):
        timestamp = now - timedelta(hours=47 - index)
        sensor_records.append(
            SensorRecord(
                timestamp=timestamp,
                sensor_type="temperature",
                sensor_id="temp-sim-01",
                location="growth-chamber-a",
                value=22.0 + ((index % 8) - 3) * 0.45,
                unit="C",
                source="dummy-script",
                note="Simulated baseline temperature",
            )
        )
        sensor_records.append(
            SensorRecord(
                timestamp=timestamp,
                sensor_type="humidity",
                sensor_id="humid-sim-01",
                location="growth-chamber-a",
                value=58.0 + ((index % 6) - 2) * 1.2,
                unit="%",
                source="dummy-script",
                note="Simulated baseline humidity",
            )
        )
        sensor_records.append(
            SensorRecord(
                timestamp=timestamp,
                sensor_type="co2",
                sensor_id="co2-sim-01",
                location="growth-chamber-a",
                value=690.0 + ((index % 10) - 4) * 28.0,
                unit="ppm",
                source="dummy-script",
                note="Simulated baseline CO2 concentration",
            )
        )
        sensor_records.append(
            SensorRecord(
                timestamp=timestamp,
                sensor_type="tank_level",
                sensor_id="tank-sim-01",
                location="nutrient-tank-a",
                value=72.0 - (index % 12) * 1.6,
                unit="%",
                source="dummy-script",
                note="Simulated nutrient tank level",
            )
        )

    image_records = [
        ImageRecord(
            timestamp=now - timedelta(minutes=5),
            camera_id="camera-01",
            location="growth-chamber-a",
            file_path=str(_write_dummy_svg("camera-01-latest.svg", "Camera 01", "#d1fae5", "#065f46")),
            note="Dummy image for local development",
        ),
        ImageRecord(
            timestamp=now - timedelta(minutes=3),
            camera_id="camera-02",
            location="growth-chamber-b",
            file_path=str(_write_dummy_svg("camera-02-latest.svg", "Camera 02", "#dbeafe", "#1e3a8a")),
            note="Dummy image for local development",
        ),
    ]

    manual_records = [
        ManualRecord(
            timestamp=now - timedelta(hours=2),
            item_type="leaf_length",
            location="growth-chamber-a",
            value=12.4,
            unit="cm",
            input_by="local-dev",
            note="Initial manual sample",
        )
    ]

    db.add_all(sensor_records)
    db.add_all(image_records)
    db.add_all(manual_records)
    db.commit()


def _write_dummy_svg(filename: str, title: str, background: str, foreground: str) -> Path:
    settings = get_settings()
    image_path = settings.resolved_image_storage_path / filename
    image_path.write_text(
        "\n".join(
            [
                '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">',
                f'<rect width="800" height="450" fill="{background}" />',
                '<circle cx="150" cy="120" r="48" fill="#fde68a" opacity="0.9" />',
                '<rect x="90" y="250" width="620" height="110" rx="20" fill="#1f2937" opacity="0.18" />',
                '<rect x="120" y="210" width="100" height="110" rx="16" fill="#16a34a" opacity="0.72" />',
                '<rect x="255" y="170" width="100" height="150" rx="16" fill="#22c55e" opacity="0.75" />',
                '<rect x="390" y="230" width="100" height="90" rx="16" fill="#15803d" opacity="0.72" />',
                '<rect x="525" y="190" width="100" height="130" rx="16" fill="#4ade80" opacity="0.75" />',
                f'<text x="44" y="60" font-size="34" font-family="Arial, sans-serif" fill="{foreground}">{title}</text>',
                f'<text x="44" y="102" font-size="20" font-family="Arial, sans-serif" fill="{foreground}">Local development placeholder image</text>',
                f'<text x="44" y="404" font-size="18" font-family="Arial, sans-serif" fill="{foreground}">{datetime.now(UTC).isoformat()}</text>',
                "</svg>",
            ]
        ),
        encoding="utf-8",
    )
    return Path("storage/images") / filename
