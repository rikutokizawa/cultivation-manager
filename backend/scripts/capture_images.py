import argparse
import logging
import time

from backend.app.core.config import get_settings
from backend.app.db.base import Base
from backend.app.db.session import SessionLocal, engine
from backend.app.services.camera_sources import build_camera_source
from backend.app.services.collection_pipeline import persist_captured_images


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Capture or ingest images and store image records.")
    parser.add_argument("--source", choices=["dummy", "directory"], help="Camera source type.")
    parser.add_argument("--loop", action="store_true", help="Run continuously.")
    parser.add_argument("--interval", type=int, help="Capture interval in seconds.")
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

    source = build_camera_source(settings=settings, source_type=args.source)
    interval = args.interval or settings.image_capture_interval_seconds

    iteration = 0
    while True:
        with SessionLocal() as db:
            records = persist_captured_images(db, source.capture())
        logging.info("stored %s image records", len(records))

        if not args.loop:
            break

        iteration += 1
        if args.iterations is not None and iteration >= args.iterations:
            break

        time.sleep(interval)


if __name__ == "__main__":
    main()

