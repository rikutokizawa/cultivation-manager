from fastapi import APIRouter

from backend.app.api.routes import export, health, image_records, latest_status, manual_records, sensor_records

router = APIRouter()
router.include_router(health.router, tags=["health"])
router.include_router(sensor_records.router, prefix="/sensor-records", tags=["sensor-records"])
router.include_router(manual_records.router, prefix="/manual-records", tags=["manual-records"])
router.include_router(image_records.router, prefix="/image-records", tags=["image-records"])
router.include_router(export.router, prefix="/export", tags=["export"])
router.include_router(latest_status.router, tags=["dashboard"])

