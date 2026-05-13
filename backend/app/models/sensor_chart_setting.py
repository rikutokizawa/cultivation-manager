from datetime import UTC, datetime

from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.models.base import Base


class SensorChartSetting(Base):
    __tablename__ = "sensor_chart_settings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    sensor_type: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    y_axis_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    y_axis_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
