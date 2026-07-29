from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

from backend.app.db.base import Base


def ensure_schema(engine: Engine) -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_sensor_record_indexes(engine)


def _ensure_sensor_record_indexes(engine: Engine) -> None:
    inspector = inspect(engine)
    if "sensor_records" not in inspector.get_table_names():
        return

    with engine.begin() as connection:
        connection.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_sensor_records_type_timestamp_id "
                "ON sensor_records (sensor_type, timestamp, id)"
            )
        )
        connection.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_sensor_records_type_source_sensor_timestamp_id "
                "ON sensor_records (sensor_type, source, sensor_id, timestamp, id)"
            )
        )
