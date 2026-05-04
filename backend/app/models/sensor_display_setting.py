from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.models.base import Base


class SensorDisplaySetting(Base):
    __tablename__ = "sensor_display_settings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    sensor_key: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    sensor_type: Mapped[str] = mapped_column(String(50), index=True)
    sensor_id: Mapped[str] = mapped_column(String(100), index=True)
    source: Mapped[str] = mapped_column(String(50), index=True)
    location: Mapped[str] = mapped_column(String(100), index=True)
    unit: Mapped[str] = mapped_column(String(20))
    display_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    labels_json: Mapped[str] = mapped_column(Text, default="[]")
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
