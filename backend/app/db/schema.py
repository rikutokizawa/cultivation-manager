from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

from backend.app.db.base import Base


def ensure_schema(engine: Engine) -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_sensor_chart_settings_display_order(engine)


def _ensure_sensor_chart_settings_display_order(engine: Engine) -> None:
    inspector = inspect(engine)
    if "sensor_chart_settings" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("sensor_chart_settings")}
    if "display_order" in columns:
        return

    with engine.begin() as connection:
        connection.execute(
            text("ALTER TABLE sensor_chart_settings ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0")
        )
