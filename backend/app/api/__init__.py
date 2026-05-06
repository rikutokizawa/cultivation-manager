from fastapi import APIRouter

from backend.app.api.routes import (
    dashboard_summary,
    export,
    health,
    image_records,
    latest_status,
    manual_records,
    sensor_chart_settings,
    sensor_display_settings,
    sensor_labels,
    sensor_records,
    upload_image,
)

router = APIRouter()
router.include_router(health.router, tags=["health"])
router.include_router(sensor_records.router, prefix="/sensor-records", tags=["sensor-records"])
router.include_router(
    sensor_display_settings.router,
    prefix="/sensor-settings",
    tags=["sensor-settings"],
)
router.include_router(
    sensor_chart_settings.router,
    prefix="/sensor-chart-settings",
    tags=["sensor-chart-settings"],
)
router.include_router(sensor_labels.router, prefix="/sensor-labels", tags=["sensor-labels"])
router.include_router(manual_records.router, prefix="/manual-records", tags=["manual-records"])
router.include_router(image_records.router, prefix="/image-records", tags=["image-records"])
router.include_router(upload_image.router, tags=["image-upload"])
router.include_router(export.router, prefix="/export", tags=["export"])
router.include_router(latest_status.router, tags=["dashboard"])
router.include_router(dashboard_summary.router, tags=["dashboard"])
