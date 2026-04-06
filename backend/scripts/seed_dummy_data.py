import argparse

from backend.app.db.base import Base
from backend.app.core.config import get_settings
from backend.app.db.session import SessionLocal, engine
from backend.app.services.seed_data import seed_dummy_data


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed dummy cultivation data into SQLite.")
    parser.add_argument("--reset", action="store_true", help="Delete existing records before seeding.")
    args = parser.parse_args()

    get_settings().ensure_directories()
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        seed_dummy_data(db, reset=args.reset)

    print("Dummy data seeded.")


if __name__ == "__main__":
    main()
