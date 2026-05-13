import argparse
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path

from backend.app.core.config import get_settings
from backend.app.db.base import Base
from backend.app.db.session import SessionLocal, engine
from backend.app.services.ondotori_trz_importer import import_ondotori_trz_file


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import Ondotori TRZ files into sensor records.")
    parser.add_argument(
        "--input-dir",
        type=Path,
        help="Directory containing .trz files. Defaults to ONDOTORI_TRZ_IMPORT_PATH.",
    )
    parser.add_argument("--keep-files", action="store_true", help="Do not delete files after successful import.")
    parser.add_argument("--dry-run", action="store_true", help="Parse files without writing DB records or deleting files.")
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

    input_dir = (args.input_dir or settings.resolved_ondotori_trz_import_path).resolve()
    input_dir.mkdir(parents=True, exist_ok=True)
    paths = sorted(path for path in input_dir.iterdir() if path.is_file() and path.suffix.lower() == ".trz")
    if not paths:
        logging.info("no TRZ files found in %s", input_dir)
        return

    imported_files = 0
    failed_files = 0
    parsed_count = 0
    inserted_count = 0
    skipped_duplicate_count = 0
    delete_after_success = not args.keep_files

    with SessionLocal() as db:
        for path in paths:
            try:
                result = import_ondotori_trz_file(
                    db,
                    path,
                    delete_after_success=delete_after_success,
                    dry_run=args.dry_run,
                )
            except Exception:
                failed_files += 1
                logging.exception("failed to import TRZ file: %s", path)
                continue

            imported_files += 1
            parsed_count += result.parsed_count
            inserted_count += result.inserted_count
            skipped_duplicate_count += result.skipped_duplicate_count
            logging.info(
                "imported %s devices=%s period=%s..%s parsed=%s inserted=%s skipped_duplicates=%s deleted=%s",
                path.name,
                "; ".join(result.devices) or "unknown",
                _format_jst(result.started_at),
                _format_jst(result.ended_at),
                result.parsed_count,
                result.inserted_count,
                result.skipped_duplicate_count,
                result.deleted,
            )

    logging.info(
        "TRZ import complete files=%s failed=%s parsed=%s inserted=%s skipped_duplicates=%s input_dir=%s",
        imported_files,
        failed_files,
        parsed_count,
        inserted_count,
        skipped_duplicate_count,
        input_dir,
    )


def _format_jst(value: datetime | None) -> str:
    if value is None:
        return "unknown"
    return value.astimezone(timezone(timedelta(hours=9))).strftime("%Y-%m-%d %H:%M:%S JST")


if __name__ == "__main__":
    main()
