import argparse
import logging
import time
from pathlib import Path

from backend.app.core.config import get_settings
from backend.app.db.base import Base
from backend.app.db.session import SessionLocal, engine
from backend.app.services.collection_pipeline import persist_sensor_readings
from backend.app.services.sensor_sources import build_sensor_source


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Collect sensor readings and store them in SQLite.")
    parser.add_argument(
        "--source",
        help="Sensor source type. Supports dummy, json, command, onewire or comma-separated combinations.",
    )
    parser.add_argument("--json-path", help="JSON file used when source=json.")
    parser.add_argument("--loop", action="store_true", help="Run continuously.")
    parser.add_argument("--interval", type=int, help="Polling interval in seconds.")
    parser.add_argument("--iterations", type=int, help="Stop after N loops when --loop is enabled.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    settings = get_settings()
    settings.ensure_directories()
    Base.metadata.create_all(bind=engine)

    logging.basicConfig(
        level=getattr(logging, settings.runtime_log_level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(message)s",
    )

    source = build_sensor_source(
        settings=settings,
        source_type=args.source,
        json_path=Path(args.json_path) if args.json_path else None,
    )
    interval = args.interval or settings.sensor_poll_interval_seconds

    iteration = 0
    while True:
        with SessionLocal() as db:
            records = persist_sensor_readings(db, source.collect())
        logging.info("stored %s sensor records", len(records))

        if not args.loop:
            break

        iteration += 1
        if args.iterations is not None and iteration >= args.iterations:
            break

        time.sleep(interval)


if __name__ == "__main__":
    main()
