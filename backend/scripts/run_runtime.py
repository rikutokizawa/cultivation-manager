import argparse
import logging
import time

from backend.app.core.config import get_settings
from backend.app.db.base import Base
from backend.app.db.session import SessionLocal, engine
from backend.app.services.camera_sources import build_camera_source
from backend.app.services.collection_pipeline import persist_captured_images, persist_sensor_readings
from backend.app.services.sensor_sources import build_sensor_source


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run sensor collection and image capture loops together.")
    parser.add_argument("--sensor-source", choices=["dummy", "json"], help="Override sensor source.")
    parser.add_argument("--camera-source", choices=["dummy", "directory"], help="Override camera source.")
    parser.add_argument("--sensor-interval", type=int, help="Override sensor polling interval.")
    parser.add_argument("--camera-interval", type=int, help="Override image capture interval.")
    parser.add_argument("--cycles", type=int, help="Stop after N outer loop cycles.")
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

    sensor_source = build_sensor_source(settings=settings, source_type=args.sensor_source)
    camera_source = build_camera_source(settings=settings, source_type=args.camera_source)
    sensor_interval = args.sensor_interval or settings.sensor_poll_interval_seconds
    camera_interval = args.camera_interval or settings.image_capture_interval_seconds

    next_sensor_run = 0.0
    next_camera_run = 0.0
    cycles = 0

    while True:
        now = time.monotonic()

        if now >= next_sensor_run:
            with SessionLocal() as db:
                records = persist_sensor_readings(db, sensor_source.collect())
            logging.info("runtime stored %s sensor records", len(records))
            next_sensor_run = now + sensor_interval

        if now >= next_camera_run:
            with SessionLocal() as db:
                records = persist_captured_images(db, camera_source.capture())
            logging.info("runtime stored %s image records", len(records))
            next_camera_run = now + camera_interval

        cycles += 1
        if args.cycles is not None and cycles >= args.cycles:
            break

        time.sleep(1)


if __name__ == "__main__":
    main()
