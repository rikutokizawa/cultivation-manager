from datetime import UTC, datetime

from sqlalchemy import DateTime, Float, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.models.base import Base


class SensorRecord(Base):
    __tablename__ = "sensor_records"
    __table_args__ = (
        Index("ix_sensor_records_type_timestamp_id", "sensor_type", "timestamp", "id"),
        Index(
            "ix_sensor_records_type_source_sensor_timestamp_id",
            "sensor_type",
            "source",
            "sensor_id",
            "timestamp",
            "id",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), index=True)
    sensor_type: Mapped[str] = mapped_column(String(50), index=True)
    sensor_id: Mapped[str] = mapped_column(String(100), index=True)
    location: Mapped[str] = mapped_column(String(100), index=True)
    value: Mapped[float] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String(20))
    source: Mapped[str] = mapped_column(String(50))
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
